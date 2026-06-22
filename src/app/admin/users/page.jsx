"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { getAllUsers, getUserSubmissions, getUserRewards } from "@/lib/firestore";
import { Card, Spinner } from "@/components/ui";
import s from "./page.module.css";

export default function AdminUsers() {
  const [users, setUsers]     = useState([]);
  const [busy, setBusy]       = useState(true);
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail]   = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  useEffect(() => { getAllUsers().then(u=>setUsers(u)).finally(()=>setBusy(false)); }, []);

  async function openUser(u) {
    setSelected(u); setDetailBusy(true);
    const [subs, rewards] = await Promise.all([getUserSubmissions(u.id,10), getUserRewards(u.id)]);
    setDetail({ subs, rewards }); setDetailBusy(false);
  }

  const filtered = users.filter(u =>
    u.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className={s.page}>
        <div className={s.hd}><h1 className={s.title}>Users</h1><p className={s.sub}>{users.length} registered accounts</p></div>

        <div className={s.searchBar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className={s.searchIn} placeholder="Search by name or email…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        <div className={s.layout}>
          <Card className={s.listCard}>
            {busy ? <div className={s.center}><Spinner/></div>
              : <table className={s.tbl}>
                  <thead><tr><th>User</th><th>Points</th><th>Joined</th></tr></thead>
                  <tbody>
                    {filtered.map(u=>(
                      <tr key={u.id} className={[s.userRow, selected?.id===u.id&&s.userRowSel].join(" ")} onClick={()=>openUser(u)}>
                        <td>
                          <div className={s.userCell}>
                            <div className={s.avatar}>{u.displayName?.[0]?.toUpperCase()||"U"}</div>
                            <div><p className={s.uName}>{u.displayName}</p><p className={s.uEmail}>{u.email}</p></div>
                          </div>
                        </td>
                        <td className={s.tdPts}>{u.pointsTotal?.toLocaleString()??0}</td>
                        <td className={s.tdDate}>{u.createdAt?.toDate?.().toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})??"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </Card>

          {selected && (
            <Card className={s.detailCard}>
              <div className={s.detailHd}>
                <div className={s.bigAvatar}>{selected.displayName?.[0]?.toUpperCase()||"U"}</div>
                <div>
                  <h2 className={s.detailName}>{selected.displayName}</h2>
                  <p className={s.detailEmail}>{selected.email}</p>
                </div>
                <button className={s.closeBtn} onClick={()=>{ setSelected(null); setDetail(null); }}>✕</button>
              </div>
              <div className={s.detailStats}>
                <div className={s.dStat}><span className={s.dStatVal}>{selected.pointsTotal?.toLocaleString()??0}</span><span className={s.dStatLbl}>Points</span></div>
                <div className={s.dStat}><span className={s.dStatVal}>{detail?.subs?.length??"—"}</span><span className={s.dStatLbl}>Drop-offs</span></div>
                <div className={s.dStat}><span className={s.dStatVal}>{detail?.rewards?.length??"—"}</span><span className={s.dStatLbl}>Rewards</span></div>
              </div>
              {detailBusy ? <div className={s.center}><Spinner size={24}/></div> : (
                <>
                  <div className={s.detailSection}>
                    <p className={s.detailSectionTtl}>Recent Submissions</p>
                    {detail?.subs?.length===0 && <p className={s.noData}>No submissions yet.</p>}
                    {detail?.subs?.map(sub=>(
                      <div key={sub.id} className={s.subRow}>
                        <span className={s.subCat}>{sub.categoryId}</span>
                        <span className={s.subKg}>{sub.weightKg}kg</span>
                        <span className={s.subPts}>+{sub.pointsEarned} pts</span>
                        <span className={s.subDate}>{sub.submittedAt?.toDate?.().toLocaleDateString("en-MY",{day:"numeric",month:"short"})??"—"}</span>
                      </div>
                    ))}
                  </div>
                  <div className={s.detailSection}>
                    <p className={s.detailSectionTtl}>Redeemed Rewards</p>
                    {detail?.rewards?.length===0 && <p className={s.noData}>No rewards redeemed.</p>}
                    {detail?.rewards?.map(r=>(
                      <div key={r.id} className={s.rwdRow}>
                        <span className={s.rwdName}>{r.rewardName}</span>
                        <span className={[s.rwdStatus, r.status==="active"&&s.rwdActive, r.status==="expired"&&s.rwdExpired].filter(Boolean).join(" ")}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
