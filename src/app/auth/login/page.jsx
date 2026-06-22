"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, checkIsAdmin } from "@/lib/auth";
import { Button, Input, Alert } from "@/components/ui";
import s from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [show, setShow]       = useState(false);
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const user = await signIn(email, pass);
      const admin = await checkIsAdmin(user.uid);
      router.push(admin ? "/admin/dashboard" : "/dashboard");
    } catch (ex) {
      const m = { "auth/invalid-credential":"Invalid email or password.", "auth/user-not-found":"No account found.", "auth/wrong-password":"Invalid email or password.", "auth/too-many-requests":"Too many attempts. Try later." };
      setErr(m[ex.code] || "Something went wrong.");
    } finally { setLoading(false); }
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
        <h1 className={s.title}>Welcome back</h1>
        <p className={s.sub}>Sign in to your eBin account</p>
        {err && <Alert>{err}</Alert>}
        <form onSubmit={submit} className={s.form}>
          <Input label="Email" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} required
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>}/>
          <Input label="Password" type={show?"text":"password"} placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
            right={<button type="button" onClick={()=>setShow(!show)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted)",display:"flex"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {show?<><path d="M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18 18 0 015.06-5.94"/><path d="M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    :<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
              </svg>
            </button>}/>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-8px", marginBottom: "8px" }}>
            <Link href="/auth/forgot-password" className={s.link} style={{ fontSize: "14px" }}>
              Forgot password?
            </Link>
          </div>
          <Button type="submit" size="lg" fullWidth loading={loading}>Sign In</Button>
        </form>
        <p className={s.foot}>Don&apos;t have an account? <Link href="/auth/signup" className={s.link}>Sign Up</Link></p>
      </div>
    </div>
  );
}
