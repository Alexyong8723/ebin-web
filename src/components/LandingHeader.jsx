"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui";
import s from "@/styles/LandingPage.module.css";

export function LandingHeader() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  return (
    <header className={s.header}>
      <Link href="/" className={s.logo}>
        <Leaf size={28} />
        eBin
      </Link>
      <nav className={s.nav}>
        <a href="#how-it-works" className={s.navLink}>How it Works</a>
        <a href="#features" className={s.navLink}>Features</a>
      </nav>
      <div className={s.headerActions}>
        {!loading && (
          user ? (
            <Button onClick={() => router.push(isAdmin ? "/admin/dashboard" : "/dashboard")}>
              Dashboard
            </Button>
          ) : (
            <>
              <span 
                onClick={() => router.push("/auth/login")} 
                className={s.navLink} 
                style={{marginRight: '16px'}}
              >
                Log In
              </span>
              <Button onClick={() => router.push("/auth/login")}>
                Sign Up
              </Button>
            </>
          )
        )}
      </div>
    </header>
  );
}
