"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getUserSubmissions } from "@/lib/firestore";
import UserLayout from "@/components/layout/UserLayout";
import { Card, Spinner, Badge } from "@/components/ui";
import s from "./page.module.css";

const CAT_EMOJI = { Battery:"🔋", Phone:"📱", Laptop:"💻", Cable:"🔌", Appliance:"📺", Printer:"🖨️", TV:"📺", Other:"♻️" };

export default function HistoryPage() {
  const { user } = useAuth();
  const [subs, setSubs]   = useState([]);
  const [busy, setBusy]   = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserSubmissions(user.uid, 100).then(s => { setSubs(s); setBusy(false); });
  }, [user]);

  const totalPts = subs.reduce((a, s) => a + (s.pointsEarned || 0), 0);

  // Find the most collected category
  const catCount = subs.reduce((acc, s) => {
    const cat = s.categoryId || "Other";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const topCategory = Object.keys(catCount).sort((a, b) => catCount[b] - catCount[a])[0] || null;

  return (
    <UserLayout>
      <div className={s.page}>
        <div className={s.header}>
          <div>
            <h1 className={s.title}>Drop-off History</h1>
            <p className={s.sub}>All your e-waste recycling records</p>
          </div>
        </div>

        {/* Summary */}
        <div className={s.stats}>
          <div className={s.stat}>
            <div className={s.statIco}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <div>
              <p className={s.statLbl}>Total drop-offs</p>
              <p className={s.statVal}>{subs.length}</p>
            </div>
          </div>
          <div className={s.stat}>
            <div className={s.statIco}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <div>
              <p className={s.statLbl}>Top category</p>
              <p className={s.statVal}>{topCategory ? `${CAT_EMOJI[topCategory] ?? "♻️"} ${topCategory}` : "—"}</p>
            </div>
          </div>
          <div className={s.stat}>
            <div className={s.statIco}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
            </div>
            <div>
              <p className={s.statLbl}>Total points earned</p>
              <p className={s.statVal}>{totalPts.toLocaleString()} pts</p>
            </div>
          </div>
        </div>

        {/* List */}
        <Card className={s.listCard}>
          {busy ? (
            <div className={s.loader}><Spinner size={28}/></div>
          ) : subs.length === 0 ? (
            <div className={s.empty}>
              <span className={s.emptyIcon}>♻️</span>
              <p className={s.emptyTxt}>No drop-offs yet</p>
              <p className={s.emptySub}>Scan a QR code at an eBin to get started</p>
            </div>
          ) : (
            subs.map(sub => (
              <div key={sub.id} className={s.row}>
                <div className={s.rowIco}>{CAT_EMOJI[sub.categoryId] || "♻️"}</div>
                <div className={s.rowInf}>
                  <p className={s.rowTtl}>{sub.categoryId || "E-Waste"}</p>
                  <p className={s.rowMeta}>
                    {sub.binName || "eBin"} · {sub.weightKg ? `${sub.weightKg}kg` : "—"} · {sub.submittedAt?.toDate?.().toLocaleDateString("en-MY", { day:"numeric", month:"short", year:"numeric" }) ?? "—"}
                  </p>
                </div>
                <span className={s.rowPts}>+{sub.pointsEarned ?? 0} pts</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </UserLayout>
  );
}
