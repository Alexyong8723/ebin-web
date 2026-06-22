"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, checkIsAdmin } from "@/lib/auth";
import { Button, Input, Alert } from "@/components/ui";
import s from "./page.module.css";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail]   = useState("");
  const [pass, setPass]     = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setErr(""); setLoading(true);
    try {
      const user = await signIn(email, pass);
      const admin = await checkIsAdmin(user.uid);
      if (!admin) { setErr("Access denied. Admin accounts only."); return; }
      router.push("/admin/dashboard");
    } catch(ex) {
      const m = { "auth/invalid-credential":"Invalid email or password.", "auth/wrong-password":"Invalid email or password.", "auth/too-many-requests":"Too many attempts. Try later." };
      setErr(m[ex.code]||"Sign in failed.");
    } finally { setLoading(false); }
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.logo}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L7 7H10V13H14V7H17L12 2Z" fill="white"/>
            <path d="M5 17L7 15H4C4 11.69 6.69 9 10 9V7C5.58 7 2 10.58 2 15H-1L5 17Z" fill="white" opacity=".8"/>
            <path d="M19 17H16C16 19.21 14.21 21 12 21C10.42 21 9.05 20.11 8.35 18.79L6.62 20.52C7.78 22.06 9.77 23 12 23C16.42 23 20 19.42 20 15H23L19 17Z" fill="white" opacity=".6"/>
          </svg>
        </div>
        <h1 className={s.title}>Admin Portal</h1>
        <p className={s.sub}>eBin Management System</p>
        {err && <Alert>{err}</Alert>}
        <form onSubmit={submit} className={s.form}>
          <Input label="Admin Email" type="email" placeholder="Enter your email" value={email} onChange={e=>setEmail(e.target.value)} required
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>}/>
          <Input label="Password" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} required
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}/>
          <Button type="submit" size="lg" fullWidth loading={loading}>Sign In to Admin</Button>
        </form>
      </div>
    </div>
  );
}
