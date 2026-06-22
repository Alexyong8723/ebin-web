"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { signOut } from "@/lib/auth";
import s from "./UserLayout.module.css";

const NAV = [
  { href:"/dashboard", label:"Home",     d:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href:"/location",  label:"Map",      d:"M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { href:"/rewards",   label:"Rewards",  d:"M12 8v13m0-13V6a2 2 0 112 2h-2zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" },
  { href:"/scan",      label:"Scan QR",  d:"M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h.01M14 18h.01M18 14h.01M18 18h.01" },
  { href:"/profile",   label:"Profile",  d:"M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

const Logo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L7 7H10V13H14V7H17L12 2Z" fill="white"/>
    <path d="M5 17L7 15H4C4 11.69 6.69 9 10 9V7C5.58 7 2 10.58 2 15H-1L5 17Z" fill="white" opacity=".8"/>
    <path d="M19 17H16C16 19.21 14.21 21 12 21C10.42 21 9.05 20.11 8.35 18.79L6.62 20.52C7.78 22.06 9.77 23 12 23C16.42 23 20 19.42 20 15H23L19 17Z" fill="white" opacity=".6"/>
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
  </svg>
);

export default function UserLayout({ children }) {
  const path = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <div className={s.shell}>
      {/* ── Desktop Sidebar ── */}
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <div className={s.logoBox}><Logo/></div>
          <span className={s.brandName}>eBin</span>
          <button className={s.themeBtn} onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
            {dark ? <SunIcon/> : <MoonIcon/>}
          </button>
        </div>
        <nav className={s.nav}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={[s.link, path===n.href&&s.active].filter(Boolean).join(" ")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={n.d}/></svg>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className={s.foot}>
          <div className={s.avatar}>{profile?.displayName?.[0]?.toUpperCase()||"U"}</div>
          <div className={s.meta}>
            <span className={s.name}>{profile?.displayName}</span>
            <span className={s.pts}>{profile?.pointsTotal?.toLocaleString()??0} pts</span>
          </div>
          <button className={s.signout} title="Sign out" onClick={async()=>{ await signOut(); router.push("/auth/login"); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={s.main}>
        {/* Mobile top header bar */}
        <div className={s.mobileHeader}>
          <div className={s.mobileBrand}>
            <div className={s.mobileLogoBox}><Logo/></div>
            <span className={s.mobileBrandName}>eBin</span>
          </div>
          <button className={s.themeBtn} onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
            {dark ? <SunIcon/> : <MoonIcon/>}
          </button>
        </div>
        {children}
      </main>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className={s.bottomNav}>
        <div className={s.bottomNavInner}>
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={[s.tabBtn, path===n.href && s.tabActive].filter(Boolean).join(" ")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.d}/>
              </svg>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
