"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/layout/AdminLayout";
import { getAllUsers, getEbins, getAllRewards, getAllSubmissions } from "@/lib/firestore";
import { Badge, Card, Spinner, Button } from "@/components/ui";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Users, Trash2, AlertTriangle, Award, Bell } from "lucide-react";
import s from "./page.module.css";

const COLORS = ['#4caf7d', '#f59e0b', '#ef4444', '#8f9a8f'];
const BIN_COLOR = { available:"green", half_full:"amber", almost_full:"red", full:"gray" };

// Trend data is now computed dynamically from real submissions

export default function AdminDashboard() {
  const [users, setUsers]   = useState([]);
  const [ebins, setEbins]   = useState([]);
  const [rewards, setRewds] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [busy, setBusy]     = useState(true);
  const [alertState, setAlertState] = useState("idle");
  const [alertMsg, setAlertMsg]     = useState("");
  const router = useRouter();

  useEffect(() => {
    Promise.all([getAllUsers(), getEbins(), getAllRewards(), getAllSubmissions()])
      .then(([u,e,r,s])=>{ setUsers(u); setEbins(e); setRewds(r); setSubmissions(s); }).finally(()=>setBusy(false));
  }, []);

  if (busy) return <AdminLayout><div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}><Spinner/></div></AdminLayout>;

  const totalPts      = users.reduce((a,u)=>a+(u.pointsTotal||0),0);
  const attentionBins = ebins.filter(b=>b.status==="almost_full"||b.status==="full");
  const fullBins      = attentionBins.length;

  // Process Live Data for Trend Chart
  const trendDataMap = {};
  submissions.forEach(sub => {
    if (!sub.submittedAt) return; // Ignore if timestamp is missing
    const date = sub.submittedAt.toDate ? sub.submittedAt.toDate() : new Date(sub.submittedAt);
    const month = date.toLocaleString('default', { month: 'short' });
    if (!trendDataMap[month]) {
      trendDataMap[month] = { name: month, points: 0, waste: 0 };
    }
    trendDataMap[month].points += (sub.pointsEarned || 0);
    trendDataMap[month].waste += (sub.weightKg || 0);
  });
  
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const trendData = Object.values(trendDataMap).sort((a,b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
  
  if (trendData.length === 0) {
    trendData.push({ name: 'No Data', points: 0, waste: 0 });
  }
  
  // Data for Donut Chart
  const statusCounts = ebins.reduce((acc, bin) => {
    acc[bin.status] = (acc[bin.status] || 0) + 1;
    return acc;
  }, {});
  
  const pieData = [
    { name: 'Available', value: statusCounts['available'] || 0 },
    { name: 'Half Full', value: statusCounts['half_full'] || 0 },
    { name: 'Almost Full', value: statusCounts['almost_full'] || 0 },
    { name: 'Full', value: statusCounts['full'] || 0 },
  ].filter(d => d.value > 0);

  // Data for Top Users Bar Chart
  const topUsersData = [...users]
    .sort((a,b)=>(b.pointsTotal||0)-(a.pointsTotal||0))
    .slice(0, 5)
    .map(u => ({
      name: u.displayName || u.email?.split('@')[0] || 'Unknown',
      points: u.pointsTotal || 0
    }));

  async function sendAlert() {
    if (attentionBins.length === 0) return;
    setAlertState("sending"); setAlertMsg("");
    try {
      const res = await fetch("/api/notify-bins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bins: attentionBins }),
      });
      const data = await res.json();
      setAlertMsg(data.message || (data.ok ? "Alert sent!" : "Failed to send."));
      setAlertState(data.ok ? "done" : "error");
    } catch(e) {
      setAlertMsg(String(e)); setAlertState("error");
    }
  }

  return (
    <AdminLayout>
      <div className={s.page}>
        <div className={s.hd}>
          <h1>Admin Overview</h1>
          <p>eBin system analytics and real-time monitoring</p>
        </div>

        {/* BI Style KPI Cards */}
        <div className={s.stats}>
          {[
            { label:"Total Users", val:users.length, icon:<Users size={20}/>, col:"blue", trend:"+12%", isUp:true },
            { label:"Total eBins", val:ebins.length, icon:<Trash2 size={20}/>, col:"green", trend:"Active", isUp:true },
            { label:"Needs Attention", val:fullBins, icon:<AlertTriangle size={20}/>, col:"amber", trend: fullBins > 0 ? "+2 from yesterday" : "All clear", isUp: fullBins === 0 },
            { label:"Points Issued", val:totalPts.toLocaleString(), icon:<Award size={20}/>, col:"green", trend:"+8.4% M/M", isUp:true },
          ].map((item, idx) => (
            <div key={idx} className={s.stat}>
              <div className={s.statTop}>
                <div>
                  <p className={s.statLbl}>{item.label}</p>
                  <p className={s.statVal}>{item.val}</p>
                </div>
                <div className={`${s.statIco} ${s[`stat-${item.col}`]}`}>
                  {item.icon}
                </div>
              </div>
              <div className={`${s.statTrend} ${item.isUp ? s.trendUp : s.trendDown}`}>
                {item.isUp ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                <span>{item.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className={s.charts}>
          {/* Trend Chart */}
          <div className={s.chartCard}>
            <div className={s.chartHd}>
              <h2 className={s.chartTtl}>E-Waste Collection Trends</h2>
              <p className={s.chartSub}>Monthly breakdown of points issued vs. waste collected (kg)</p>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4caf7d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4caf7d" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text)' }}
                  />
                  <Area type="monotone" dataKey="waste" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWaste)" />
                  <Area type="monotone" dataKey="points" stroke="#4caf7d" fillOpacity={1} fill="url(#colorPoints)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className={s.chartCard}>
            <div className={s.chartHd}>
              <h2 className={s.chartTtl}>Bin Status Distribution</h2>
              <p className={s.chartSub}>Real-time capacity tracking</p>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tables Grid */}
        <div className={s.cols}>
          {/* Bin status table */}
          <Card>
            <div className={s.panelHd}>
              <span className={s.panelTtl}>Active eBins</span>
              {fullBins > 0 && (
                <Button onClick={sendAlert} loading={alertState==="sending"} style={{fontSize:12,padding:"6px 12px",background:"var(--red)"}}>
                  <Bell size={14} style={{marginRight: 6}} /> Alert Collectors
                </Button>
              )}
            </div>
            {alertMsg && (
              <div style={{margin:"12px 16px 0",padding:"8px 12px",borderRadius:6,fontSize:13,background:alertState==="done"?"#f0fdf4":"#fef2f2",color:alertState==="done"?"#16a34a":"#dc2626",border:`1px solid ${alertState==="done"?"#bbf7d0":"#fecaca"}`}}>
                {alertMsg}
              </div>
            )}
            <div style={{overflowX: 'auto'}}>
              <table className={s.tbl}>
                <thead><tr><th>Location</th><th>Capacity</th><th>Status</th></tr></thead>
                <tbody>
                  {ebins.map(bin=>{
                    const currentPoints = bin.currentPoints || 0;
                    const maxPoints = bin.capacityPoints || 1000;
                    const pct = Math.round((currentPoints / maxPoints) * 100);
                    return (
                      <tr 
                        key={bin.id} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/admin/ebin/${bin.id}`)}
                      >
                        <td className={s.tdMain}>{bin.locationName}</td>
                        <td>
                          <div className={s.capWrap}>
                            <div className={s.capBar}><div className={s.capFill} style={{width:`${pct}%`,background:pct>=80?"var(--red)":pct>=50?"var(--amber)":"var(--g400)"}}/></div>
                            <span className={s.capPct}>{pct}%</span>
                          </div>
                        </td>
                        <td><Badge color={BIN_COLOR[bin.status]||"green"}>{bin.status?.replace("_"," ")}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Users Bar Chart & Table Combo */}
          <Card>
            <div className={s.panelHd}><span className={s.panelTtl}>Top Contributors</span></div>
            
            {/* Small Bar Chart for Top 5 */}
            <div style={{ width: '100%', height: 180, padding: '20px 20px 0 0' }}>
              <ResponsiveContainer>
                <BarChart data={topUsersData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="var(--muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip cursor={{fill: 'var(--n50)'}} contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }} />
                  <Bar dataKey="points" fill="var(--g400)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{overflowX: 'auto'}}>
              <table className={s.tbl} style={{marginTop: '10px'}}>
                <thead><tr><th>#</th><th>User</th><th>Points</th></tr></thead>
                <tbody>
                  {[...users].sort((a,b)=>(b.pointsTotal||0)-(a.pointsTotal||0)).slice(0,5).map((u,i)=>(
                    <tr key={u.id}>
                      <td className={s.tdRank}>{i+1}</td>
                      <td>
                        <div className={s.userCell}>
                          <div className={s.uAvatar}>{u.displayName?.[0]?.toUpperCase()||"U"}</div>
                          <div><p className={s.uName}>{u.displayName}</p><p className={s.uEmail}>{u.email}</p></div>
                        </div>
                      </td>
                      <td className={s.tdPts}>{u.pointsTotal?.toLocaleString()??0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
