"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { updateDoc, doc } from "firebase/firestore";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { signOut } from "@/lib/auth";
import UserLayout from "@/components/layout/UserLayout";
import { Button, Input, Alert, Card } from "@/components/ui";
import { getTier, getNextTier, getTierProgress } from "@/lib/tierUtils";
import s from "./page.module.css";

export default function ProfilePage() {
  const { user, profile, setProfile } = useAuth();
  const router = useRouter();
  const [name, setName]     = useState(profile?.displayName||"");
  const [curPw, setCurPw]   = useState("");
  const [newPw, setNewPw]   = useState("");
  const [confPw, setConfPw] = useState("");
  const [msg, setMsg]       = useState({ type:"", text:"" });
  const [pwMsg, setPwMsg]   = useState({ type:"", text:"" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile(e) {
    e.preventDefault(); setMsg({ type:"", text:"" }); setSaving(true);
    try {
      await updateDoc(doc(db,"users",user.uid),{ displayName:name });
      setProfile(p=>({...p, displayName:name}));
      setMsg({ type:"success", text:"Profile updated successfully." });
    } catch { setMsg({ type:"error", text:"Failed to update profile." }); }
    finally { setSaving(false); }
  }

  async function changePassword(e) {
    e.preventDefault(); setPwMsg({ type:"", text:"" });
    if (newPw.length<6) return setPwMsg({ type:"error", text:"New password must be at least 6 characters." });
    if (newPw!==confPw) return setPwMsg({ type:"error", text:"Passwords do not match." });
    setSavingPw(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, curPw);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, newPw);
      setPwMsg({ type:"success", text:"Password changed successfully." });
      setCurPw(""); setNewPw(""); setConfPw("");
    } catch(ex) {
      const m = { "auth/wrong-password":"Current password is incorrect.", "auth/invalid-credential":"Current password is incorrect." };
      setPwMsg({ type:"error", text:m[ex.code]||"Failed to change password." });
    } finally { setSavingPw(false); }
  }

  if (!profile) return null;

  const points   = profile.pointsTotal ?? 0;
  const tier     = getTier(points);
  const nextTier = getNextTier(points);
  const progress = getTierProgress(points);

  return (
    <UserLayout>
      <div className={s.page}>
        <h1 className={s.title}>Profile &amp; Settings</h1>

        {/* Account info */}
        <Card className={s.section}>
          <div className={s.sectionHd}><h2 className={s.sectionTtl}>Account Information</h2></div>
          <div className={s.avatarRow}>
            {/* Avatar with tier glow */}
            <div
              className={s.bigAvatar}
              style={{
                background: tier.gradient,
                boxShadow: `0 0 0 3px ${tier.accentColor}, 0 4px 16px ${tier.glowColor}`,
                color: "#fff",
              }}
            >
              {profile.displayName?.[0]?.toUpperCase()||"U"}
            </div>
            <div>
              <p className={s.avatarName}>{profile.displayName}</p>
              <p className={s.avatarEmail}>{profile.email}</p>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6, flexWrap:"wrap" }}>
                {/* Points pill */}
                <div className={s.ptsPill}>⭐ {points.toLocaleString()} points</div>
                {/* Tier badge */}
                <div
                  className={s.tierBadge}
                  style={{ background: tier.gradient, boxShadow:`0 2px 8px ${tier.glowColor}` }}
                >
                  {tier.emoji} {tier.label}
                </div>
              </div>
            </div>
          </div>

          {/* Tier progress bar */}
          <div className={s.tierProgress}>
            <div className={s.tierProgressTop}>
              <span className={s.tierProgressLbl}>
                {nextTier
                  ? `${nextTier.emoji} ${nextTier.minPoints - points} pts to reach ${nextTier.label}`
                  : `👑 Maximum tier reached — you're ${tier.label}!`}
              </span>
              <span className={s.tierProgressPct}>{progress}%</span>
            </div>
            <div className={s.tierBar}>
              <div
                className={s.tierFill}
                style={{ width:`${progress}%`, background: tier.gradient }}
              />
            </div>
          </div>

          {msg.text && <Alert type={msg.type==="success"?"success":"error"}>{msg.text}</Alert>}
          <form onSubmit={saveProfile} className={s.form}>
            <Input label="Display Name" type="text" value={name} onChange={e=>setName(e.target.value)} required/>
            <Input label="Email" type="email" value={profile.email} disabled/>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </form>
        </Card>

        {/* Tier perks card */}
        <div className={s.tierCard} style={{ background: tier.gradient, boxShadow:`0 4px 24px ${tier.glowColor}` }}>
          <div className={s.tierCardHeader}>
            <span className={s.tierCardEmoji}>{tier.emoji}</span>
            <div>
              <p className={s.tierCardLabel}>{tier.label} Member</p>
              <p className={s.tierCardDesc}>{tier.description}</p>
            </div>
          </div>
          <ul className={s.tierPerksList}>
            {tier.perks.map((perk, i) => (
              <li key={i} className={s.tierPerk}>
                <span className={s.tierPerkCheck}>✓</span>
                {perk}
              </li>
            ))}
          </ul>
          {nextTier && (
            <div className={s.tierNextHint}>
              {nextTier.emoji} Unlock <strong>{nextTier.label}</strong> at {nextTier.minPoints.toLocaleString()} pts
            </div>
          )}
        </div>

        {/* Change password */}
        <Card className={s.section}>
          <div className={s.sectionHd}><h2 className={s.sectionTtl}>Change Password</h2></div>
          {pwMsg.text && <Alert type={pwMsg.type==="success"?"success":"error"}>{pwMsg.text}</Alert>}
          <form onSubmit={changePassword} className={s.form}>
            <Input label="Current password" type="password" placeholder="••••••••" value={curPw} onChange={e=>setCurPw(e.target.value)} required/>
            <Input label="New password" type="password" placeholder="Min. 6 characters" value={newPw} onChange={e=>setNewPw(e.target.value)} required/>
            <Input label="Confirm new password" type="password" placeholder="Repeat new password" value={confPw} onChange={e=>setConfPw(e.target.value)} required
              error={confPw&&confPw!==newPw?"Passwords do not match":""}/>
            <Button type="submit" variant="secondary" loading={savingPw}>Change Password</Button>
          </form>
        </Card>

        {/* Your Impact */}
        <Card className={s.section}>
          <div className={s.sectionHd}><h2 className={s.sectionTtl}>Your Impact</h2></div>
          <div className={s.impactGrid}>
            <div className={s.impactItem}><span className={s.impactVal}>{profile.pointsTotal??0}</span><span className={s.impactLbl}>Points earned</span></div>
            <div className={s.impactItem}><span className={s.impactVal}>♻️</span><span className={s.impactLbl}>E-Waste recycled</span></div>
            <div className={s.impactItem}><span className={s.impactVal}>🌱</span><span className={s.impactLbl}>CO₂ reduced</span></div>
          </div>
        </Card>

        {/* Mobile-only sign out */}
        <Card className={s.signOutCard}>
          <button
            className={s.signOutBtn}
            onClick={async () => { await signOut(); router.push("/auth/login"); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Sign Out
          </button>
        </Card>
      </div>
    </UserLayout>
  );
}
