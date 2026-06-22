"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getRewardsCatalog, getUserRewards, redeemReward } from "@/lib/firestore";
import UserLayout from "@/components/layout/UserLayout";
import { Button, Badge, Card, Alert } from "@/components/ui";
import { getTier, getNextTier } from "@/lib/tierUtils";
import s from "./page.module.css";

export default function RewardsPage() {
  const { user, profile, setProfile } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [mine, setMine]       = useState([]);
  const [tab, setTab]         = useState("catalog");
  const [pending, setPending] = useState(null);
  const [msg, setMsg]         = useState({ type:"", text:"" });
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getRewardsCatalog(), getUserRewards(user.uid)])
      .then(([c,m])=>{ setCatalog(c); setMine(m); });
  }, [user]);

  async function handleRedeem(reward) {
    if ((profile?.pointsTotal||0) < reward.pointsCost) {
      setMsg({ type:"error", text:`You need ${reward.pointsCost-(profile?.pointsTotal||0)} more points for this reward.` }); return;
    }
    setLoading(true); setMsg({ type:"", text:"" });
    try {
      const code = await redeemReward(user.uid, reward);
      setProfile(p=>({...p, pointsTotal:p.pointsTotal-reward.pointsCost}));
      const updated = await getUserRewards(user.uid);
      setMine(updated); setPending(null);
      setMsg({ type:"success", text:`Redeemed! Code: ${code}` });
      setTab("mine");
    } catch(ex) { setMsg({ type:"error", text:ex.message||"Redemption failed." }); }
    finally { setLoading(false); }
  }

  const canAfford = r => (profile?.pointsTotal||0) >= r.pointsCost;

  const points   = profile?.pointsTotal ?? 0;
  const tier     = getTier(points);
  const nextTier = getNextTier(points);

  // Tier-exclusive reward definitions (hardcoded to show even before Firestore catalog)
  const EXCLUSIVE_REWARDS = {
    vvip: [
      { id:"x-vvip-1", name:"Monthly Mystery Gift Box", emoji:"📦", desc:"A curated box of eco-friendly goodies delivered monthly.", tag:"VVIP Only" },
      { id:"x-vvip-2", name:"5% Cashback Voucher (RM50)", emoji:"💰", desc:"RM50 cashback voucher redeemable at partner stores.", tag:"VVIP Only" },
      { id:"x-vvip-3", name:"Priority Drop-off Lane",    emoji:"🚀", desc:"Skip the queue at all E-Bin partner centres.", tag:"VVIP Only" },
    ],
    vip: [
      { id:"x-vip-1",  name:"Bonus 200 Points",          emoji:"⚡", desc:"Monthly bonus points credited straight to your balance.", tag:"VIP Only" },
      { id:"x-vip-2",  name:"Early Access Pass",         emoji:"🎟️", desc:"Get first pick on all new reward drops.", tag:"VIP Only" },
    ],
    topfan: [
      { id:"x-tf-1",   name:"Top Fan Digital Badge",     emoji:"🏅", desc:"Official Top Fan badge displayed on your profile.", tag:"Top Fan Only" },
      { id:"x-tf-2",   name:"Bonus 50 Points",           emoji:"✨", desc:"Claim 50 bonus points on your next drop-off.", tag:"Top Fan Only" },
    ],
  };

  // Which exclusive rewards to show for the current tier (show current + lower tiers)
  const exclusiveToShow = [];
  if (tier.id === "vvip")    exclusiveToShow.push(...EXCLUSIVE_REWARDS.vvip, ...EXCLUSIVE_REWARDS.vip, ...EXCLUSIVE_REWARDS.topfan);
  if (tier.id === "vip")     exclusiveToShow.push(...EXCLUSIVE_REWARDS.vip, ...EXCLUSIVE_REWARDS.topfan);
  if (tier.id === "topfan")  exclusiveToShow.push(...EXCLUSIVE_REWARDS.topfan);

  return (
    <UserLayout>
      <div className={s.page}>
        <div className={s.header}>
          <div>
            <h1 className={s.title}>Rewards</h1>
            <p className={s.sub}>Redeem your recycling points for vouchers and prizes</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
            <div className={s.ptsBadge}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
              {profile?.pointsTotal?.toLocaleString()??0} pts
            </div>
            {/* Tier badge in header */}
            <div
              className={s.tierBadge}
              style={{ background: tier.gradient, boxShadow:`0 2px 8px ${tier.glowColor}` }}
            >
              {tier.emoji} {tier.label}
            </div>
          </div>
        </div>

        {msg.text && <Alert type={msg.type==="success"?"success":"error"}>{msg.text}</Alert>}

        {/* Tier-exclusive rewards section (only for Top Fan and above) */}
        {exclusiveToShow.length > 0 && (
          <div
            className={s.exclusiveSection}
            style={{ boxShadow:`0 4px 24px ${tier.glowColor}` }}
          >
            <div className={s.exclusiveHeader} style={{ background: tier.gradient }}>
              <span className={s.exclusiveEmoji}>{tier.emoji}</span>
              <div>
                <p className={s.exclusiveTitle}>{tier.label} Exclusive Rewards</p>
                <p className={s.exclusiveSub}>Special perks only available to {tier.label} members</p>
              </div>
            </div>
            <div className={s.exclusiveGrid}>
              {exclusiveToShow.map(r => (
                <div key={r.id} className={s.exclusiveCard}>
                  <div className={s.exclusiveCardEmoji}>{r.emoji}</div>
                  <div className={s.exclusiveCardBody}>
                    <p className={s.exclusiveCardName}>{r.name}</p>
                    <p className={s.exclusiveCardDesc}>{r.desc}</p>
                  </div>
                  <span
                    className={s.exclusiveTag}
                    style={{ background: tier.gradient }}
                  >
                    {r.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked exclusive preview — show to Regular users */}
        {tier.id === "regular" && nextTier && (
          <div className={s.lockedBanner}>
            <span className={s.lockedIcon}>🔒</span>
            <div>
              <p className={s.lockedTitle}>Unlock {nextTier.emoji} {nextTier.label} Exclusive Rewards</p>
              <p className={s.lockedSub}>Reach {nextTier.minPoints.toLocaleString()} pts to access special member-only rewards</p>
            </div>
          </div>
        )}

        <div className={s.tabs}>
          <button className={[s.tab, tab==="catalog"&&s.tabActive].join(" ")} onClick={()=>setTab("catalog")}>Available Rewards</button>
          <button className={[s.tab, tab==="mine"&&s.tabActive].join(" ")} onClick={()=>setTab("mine")}>
            My Rewards {mine.length>0&&<span className={s.tabCount}>{mine.length}</span>}
          </button>
        </div>

        {tab==="catalog" && (
          <div className={s.grid}>
            {catalog.length===0 && <p className={s.empty}>No rewards available right now.</p>}
            {catalog.map(r=>(
              <Card key={r.id} className={[s.rCard, !canAfford(r)&&s.rLocked].join(" ")}>
                <div className={s.rTop}>
                  <div className={s.rEmoji}>🎁</div>
                  <div className={s.rInfo}>
                    <h3 className={s.rName}>{r.name}</h3>
                    <p className={s.rDetails}>{r.details}</p>
                  </div>
                </div>
                <div className={s.rMeta}>
                  <span className={s.metaItem}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    {r.validityDays}d validity
                  </span>
                  {r.stock>0 && <span className={s.metaItem}>{r.stock} remaining</span>}
                </div>
                <div className={s.rBottom}>
                  <span className={s.rCost}>{r.pointsCost} pts</span>
                  {pending?.id===r.id ? (
                    <div className={s.confirmRow}>
                      <span className={s.confirmTxt}>Confirm?</span>
                      <Button size="sm" loading={loading} onClick={()=>handleRedeem(r)}>Yes</Button>
                      <Button size="sm" variant="ghost" onClick={()=>setPending(null)}>No</Button>
                    </div>
                  ) : (
                    <Button size="sm" disabled={!canAfford(r)} onClick={()=>{ setMsg({type:"",text:""}); setPending(r); }}>
                      {canAfford(r) ? "Redeem" : `+${r.pointsCost-(profile?.pointsTotal||0)} pts needed`}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab==="mine" && (
          <div className={s.myList}>
            {mine.length===0
              ? <div className={s.emptyState}><p>No rewards redeemed yet.</p><Button variant="ghost" onClick={()=>setTab("catalog")}>Browse rewards</Button></div>
              : mine.map(r=>(
                <Card key={r.id} className={s.myCard}>
                  <div className={s.myTop}>
                    <div><h3 className={s.myName}>{r.rewardName}</h3><p className={s.myExp}>Expires: {r.expiresAt?.toDate?.().toLocaleDateString("en-MY",{day:"numeric",month:"short",year:"numeric"})??"—"}</p></div>
                    <Badge color={r.status==="active"?"green":r.status==="used"?"gray":"red"}>{r.status}</Badge>
                  </div>
                  {r.status==="active" && (
                    <div className={s.codeBox}>
                      <span className={s.codeLbl}>Redemption code</span>
                      {revealed===r.id
                        ? <div className={s.codeRow}><code className={s.codeVal}>{r.redemptionCode}</code><button className={s.copyBtn} onClick={()=>navigator.clipboard.writeText(r.redemptionCode)}>Copy</button></div>
                        : <button className={s.revealBtn} onClick={()=>setRevealed(r.id)}>Tap to reveal</button>
                      }
                    </div>
                  )}
                </Card>
              ))
            }
          </div>
        )}
      </div>
    </UserLayout>
  );
}
