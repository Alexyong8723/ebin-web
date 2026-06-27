"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getUserSubmissions, getUserRewards, getEbins } from "@/lib/firestore";
import { getTier } from "@/lib/tierUtils";
import UserLayout from "@/components/layout/UserLayout";
import { Badge, Card, Spinner, Button } from "@/components/ui";
import s from "./page.module.css";

const BIN_COLOR  = { available:"green", half_full:"amber", almost_full:"red", full:"gray" };
const CAT_EMOJI  = { Battery:"🔋", Phone:"📱", Laptop:"💻", Cable:"🔌", Appliance:"📺", Printer:"🖨️", TV:"📺", Other:"♻️" };

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [subs, setSubs]   = useState([]);
  const [rewards, setRew] = useState([]);
  const [ebins, setEbins] = useState([]);
  const [busy, setBusy]   = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getUserSubmissions(user.uid,5), getUserRewards(user.uid), getEbins()])
      .then(([a,b,c])=>{ setSubs(a); setRew(b); setEbins(c); }).finally(()=>setBusy(false));
  }, [user]);

  if (!profile) return <div className={s.loader}><Spinner/></div>;

  const tier = getTier(profile.pointsTotal ?? 0);

  // Find the most collected category by count
  const catCount = subs.reduce((acc, sub) => {
    const cat = sub.categoryId || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.keys(catCount).sort((a, b) => catCount[b] - catCount[a])[0] || null;

  return (
    <UserLayout>
      <div className={s.page}>
        {/* Header */}
        <div className={s.header}>
          <div>
            <h1 className={s.greeting}>Hello, {profile.displayName?.split(" ")[0]} 👋</h1>
            <p className={s.greetSub}>Here&apos;s your recycling overview</p>
          </div>
          <Link href="/scan" className={s.cta}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16m8-8H4"/></svg>
            Scan QR & Earn Points
          </Link>
        </div>

        {/* Stats */}
        <div className={s.stats}>
          {[
            { label:"Points balance", val:profile.pointsTotal?.toLocaleString()??0, accent:true, tier,
              icon:"M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
            { label:"Total drop-offs", val:subs.length, icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
            { label:"Top category", val: topCategory ? `${CAT_EMOJI[topCategory] ?? "♻️"} ${topCategory}` : "—", icon:"M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
            { label:"Active rewards", val:rewards.length, icon:"M12 8v13m0-13V6a2 2 0 112 2h-2zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" },
          ].map(item=>(
            <div key={item.label} className={[s.stat, item.accent&&s.statAccent].filter(Boolean).join(" ")}>
              <div className={s.statIco}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
              </div>
              <div>
                <p className={s.statLbl}>{item.label}</p>
                <p className={s.statVal}>{item.val}</p>
                {item.tier && item.tier.id !== "regular" && (
                  <div
                    style={{
                      display:"inline-flex",alignItems:"center",gap:4,
                      marginTop:4,padding:"2px 8px",borderRadius:99,
                      background:item.tier.gradient,
                      boxShadow:`0 2px 6px ${item.tier.glowColor}`,
                      color:"#fff",fontSize:10,fontWeight:700,
                      letterSpacing:".04em",textTransform:"uppercase",
                    }}
                  >
                    {item.tier.emoji} {item.tier.label}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div className={s.cols}>
          <Card>
            <div className={s.panelHd}>
              <span className={s.panelTtl}>Recent activity</span>
              <Link href="/history" className={s.viewAll}>View all</Link>
            </div>
            {busy ? <Skels/> : subs.length===0
              ? <Empty msg="No drop-offs yet." cta={{ href:"/scan", label:"Scan a QR code to get started" }}/>
              : subs.map(sub=>(
                <div key={sub.id} className={s.actRow}>
                  <div className={s.actIco}>{CAT_EMOJI[sub.categoryId]||"♻️"}</div>
                  <div className={s.actInf}>
                    <p className={s.actTtl}>{sub.categoryId||"E-Waste"}</p>
                    <p className={s.actMeta}>{sub.weightKg?`${sub.weightKg}kg`:""} · {sub.submittedAt?.toDate?.().toLocaleDateString("en-MY",{day:"numeric",month:"short"})??"—"}</p>
                  </div>
                  <span className={s.actPts}>+{sub.pointsEarned??0} pts</span>
                </div>
              ))
            }
          </Card>

          <Card>
            <div className={s.panelHd}>
              <span className={s.panelTtl}>eBin locations</span>
              <Link href="/location" className={s.viewAll}>View map</Link>
            </div>
            {busy ? <Skels/> : ebins.slice(0,4).map(bin=>{
              const currentPoints = bin.currentPoints || 0;
              const maxPoints = bin.capacityPoints || 1000;
              const pct = Math.round((currentPoints / maxPoints) * 100);
              return (
                <div key={bin.id} className={s.binRow}>
                  <div className={s.binInf}>
                    <p className={s.binNm}>{bin.locationName}</p>
                    <p className={s.binAd}>{bin.address}</p>
                  </div>
                  <div className={s.binRt}>
                    <Badge color={BIN_COLOR[bin.status]||"green"}>{bin.status?.replace("_"," ")}</Badge>
                    <div className={s.capBar}><div className={s.capFill} style={{width:`${pct}%`,background:pct>=80?"var(--red)":pct>=50?"var(--amber)":"var(--g400)"}}/></div>
                    <span className={s.capPct}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </UserLayout>
  );
}

function Skels() { return <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>{[0,1,2].map(i=><div key={i} style={{height:46,background:"var(--n100)",borderRadius:"var(--r-md)",animation:"pulse 1.5s ease-in-out infinite"}}/>)}</div>; }
function Empty({ msg, cta }) { return <div style={{padding:"2rem 1rem",textAlign:"center",display:"flex",flexDirection:"column",gap:8,alignItems:"center",color:"var(--muted)",fontSize:14}}><p>{msg}</p>{cta&&<Link href={cta.href} style={{color:"var(--g600)",fontWeight:500,fontSize:13}}>{cta.label} →</Link>}</div>; }