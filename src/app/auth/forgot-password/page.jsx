"use client";
import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth";
import { Button, Input, Alert } from "@/components/ui";
// Reuse the login page's CSS module for consistent styling
import s from "../login/page.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [msg, setMsg]         = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); 
    setErr(""); 
    setMsg("");
    setLoading(true);
    try {
      await resetPassword(email);
      setMsg("If an account exists with this email, a password reset link has been sent.");
    } catch (ex) {
      const errorMap = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-not-found": "No account found with this email.",
      };
      setErr(errorMap[ex.code] || "Failed to send reset email. Please try again.");
    } finally { 
      setLoading(false); 
    }
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
        <h1 className={s.title}>Reset Password</h1>
        <p className={s.sub}>Enter your email to receive a reset link</p>
        
        {err && <Alert>{err}</Alert>}
        {msg && <Alert style={{backgroundColor: "var(--g100)", color: "var(--g800)", border: "1px solid var(--g300)"}}>{msg}</Alert>}
        
        <form onSubmit={submit} className={s.form}>
          <Input 
            label="Email" 
            type="email" 
            placeholder="you@email.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>}
          />
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Send Reset Link
          </Button>
        </form>
        <p className={s.foot}>Remember your password? <Link href="/auth/login" className={s.link}>Sign In</Link></p>
      </div>
    </div>
  );
}
