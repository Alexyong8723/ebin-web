"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth";
import { Button, Input, Alert } from "@/components/ui";
import s from "./page.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [f, setF] = useState({ name:"", email:"", pass:"", confirm:"" });
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const strength = f.pass.length===0?0:f.pass.length<6?1:f.pass.length<10?2:3;
  const SC = ["","#ef4444","#f59e0b","#22c55e"], SL = ["","Weak","Fair","Strong"];

  async function submit(e) {
    e.preventDefault(); setErr("");
    if (f.pass.length<6) return setErr("Password must be at least 6 characters.");
    if (f.pass!==f.confirm) return setErr("Passwords do not match.");
    setLoading(true);
    try { await signUp(f.email, f.pass, f.name); router.push("/dashboard"); }
    catch(ex){ const m={"auth/email-already-in-use":"Email already registered.","auth/invalid-email":"Enter a valid email."}; setErr(m[ex.code]||"Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L7 7H10V13H14V7H17L12 2Z" fill="white"/>
            <path d="M5 17L7 15H4C4 11.69 6.69 9 10 9V7C5.58 7 2 10.58 2 15H-1L5 17Z" fill="white" opacity=".8"/>
            <path d="M19 17H16C16 19.21 14.21 21 12 21C10.42 21 9.05 20.11 8.35 18.79L6.62 20.52C7.78 22.06 9.77 23 12 23C16.42 23 20 19.42 20 15H23L19 17Z" fill="white" opacity=".6"/>
          </svg>
        </div>
        <h1 className={s.title}>Create account</h1>
        <p className={s.sub}>Join eBin and start earning recycling points</p>
        {err && <Alert>{err}</Alert>}
        <form onSubmit={submit} className={s.form}>
          <Input label="Full name" type="text" placeholder="Your name" value={f.name} onChange={e=>set("name",e.target.value)} required
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>}/>
          <Input label="Email" type="email" placeholder="you@email.com" value={f.email} onChange={e=>set("email",e.target.value)} required
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>}/>
          <div>
            <Input label="Password" type="password" placeholder="Min. 6 characters" value={f.pass} onChange={e=>set("pass",e.target.value)} required
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}/>
            {f.pass.length>0&&<div className={s.strengthRow}>{[1,2,3].map(n=><div key={n} className={s.bar} style={{background:strength>=n?SC[strength]:"var(--n200)"}}/>)}<span style={{fontSize:11,color:SC[strength],fontWeight:500}}>{SL[strength]}</span></div>}
          </div>
          <Input label="Confirm password" type="password" placeholder="Repeat password" value={f.confirm} onChange={e=>set("confirm",e.target.value)} required
            error={f.confirm&&f.confirm!==f.pass?"Passwords do not match":""}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}/>
          <Button type="submit" size="lg" fullWidth loading={loading}>Create Account</Button>
        </form>
        <p className={s.foot}>Already have an account? <Link href="/auth/login" className={s.link}>Sign In</Link></p>
      </div>
    </div>
  );
}
