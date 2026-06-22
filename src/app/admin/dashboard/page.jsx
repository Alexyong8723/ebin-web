"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { getAllUsers, getEbins, getAllRewards } from "@/lib/firestore";
import { Badge, Card, Spinner, Button } from "@/components/ui";
import s from "./page.module.css";

const BIN_COLOR = { available:"green", half_full:"amber", almost_full:"red", full:"gray" };

export default function AdminDashboard() {
  const [users, setUsers]   = useState([]);
  const [ebins, setEbins]   = useState([]);
  const [rewards, setRewds] = useState([]);
  const [busy, setBusy]     = useState(true);
  const [alertState, setAlertState] = useState("idle"); // idle | sending | done | error
  const [alertMsg, setAlertMsg]     = useState("");

  useEffect(() => {
    Promise.all([getAllUsers(), getEbins(), getAllRewards()])
      .then(([u,e,r])=>{ setUsers(u); setEbins(e); setRewds(r); }).finally(()=>setBusy(false));
  }, []);

  if (busy) return <AdminLayout><div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}><Spinner/></div></AdminLayout>;

  const totalPts      = users.reduce((a,u)=>a+(u.pointsTotal||0),0);
  const attentionBins = ebins.filter(b=>b.status==="almost_full"||b.status==="full");
  const fullBins      = attentionBins.length;
  const activeBins   = ebins.filter(b=>b.status==="available"||b.status==="half_full").length;

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
        <div className={s.hd}><h1 className={s.title}>Overview</h1><p className={s.sub}>eBin system at a glance</p></div>

        <div className={s.stats}>
          {[
            { label:"Registered Users",  val:users.length,         icon:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", col:"blue" },
            { label:"Total eBins",        val:ebins.length,         icon:"M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", col:"green" },
            { label:"Bins Needing Attention", val:fullBins,         icon:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", col:"amber" },
            { label:"Total Points Issued", val:totalPts.toLocaleString(), icon:"M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z", col:"green" },
          ].map(item=>(
            <div key={item.label} className={[s.stat, s[`stat-${item.col}`]].join(" ")}>
              <div className={s.statIco}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              </div>
              <div><p className={s.statLbl}>{item.label}</p><p className={s.statVal}>{item.val}</p></div>
            </div>
          ))}
        </div>

        <div className={s.cols}>
          {/* Bin status table */}
          <Card>
            <div className={s.panelHd}>
              <span className={s.panelTtl}>eBin Status</span>
              {fullBins > 0 && (
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <Button
                    onClick={sendAlert}
                    loading={alertState==="sending"}
                    style={{fontSize:12,padding:"4px 12px",background:"#ef4444"}}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:4}}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    Send Alert Email
                  </Button>
                </div>
              )}
            </div>
            {alertMsg && (
              <div style={{margin:"0 16px 12px",padding:"8px 12px",borderRadius:6,fontSize:13,background:alertState==="done"?"#f0fdf4":"#fef2f2",color:alertState==="done"?"#16a34a":"#dc2626",border:`1px solid ${alertState==="done"?"#bbf7d0":"#fecaca"}`}}>
                {alertMsg}
              </div>
            )}
            <table className={s.tbl}>
              <thead><tr><th>Location</th><th>Capacity</th><th>Status</th></tr></thead>
              <tbody>
                {ebins.map(bin=>{
                  const pct = bin.capacityKg>0?Math.round((bin.currentWeightKg/bin.capacityKg)*100):0;
                  return (
                    <tr key={bin.id}>
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
          </Card>

          {/* Top users */}
          <Card>
            <div className={s.panelHd}><span className={s.panelTtl}>Top Users by Points</span></div>
            <table className={s.tbl}>
              <thead><tr><th>#</th><th>User</th><th>Points</th></tr></thead>
              <tbody>
                {[...users].sort((a,b)=>(b.pointsTotal||0)-(a.pointsTotal||0)).slice(0,8).map((u,i)=>(
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
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
