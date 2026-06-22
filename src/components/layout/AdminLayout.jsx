"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import s from "./AdminLayout.module.css";

const NAV = [
  { href:"/admin/dashboard",  label:"Overview",   shortLabel:"Overview",  d:"M4 5h16M4 10h16M4 15h16M4 20h16" },
  { href:"/admin/bins",       label:"eBin Mgmt",  shortLabel:"Bins",      d:"M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" },
  { href:"/admin/users",      label:"Users",      shortLabel:"Users",     d:"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href:"/admin/rewards",    label:"Rewards",    shortLabel:"Rewards",   d:"M12 8v13m0-13V6a2 2 0 112 2h-2zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" },
  { href:"/admin/categories", label:"Categories", shortLabel:"Tags",      d:"M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" },
  { href:"/kiosk",            label:"Test Kiosk", shortLabel:"Kiosk",     d:"M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
];

const Logo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L7 7H10V13H14V7H17L12 2Z" fill="white"/>
    <path d="M5 17L7 15H4C4 11.69 6.69 9 10 9V7C5.58 7 2 10.58 2 15H-1L5 17Z" fill="white" opacity=".8"/>
    <path d="M19 17H16C16 19.21 14.21 21 12 21C10.42 21 9.05 20.11 8.35 18.79L6.62 20.52C7.78 22.06 9.77 23 12 23C16.42 23 20 19.42 20 15H23L19 17Z" fill="white" opacity=".6"/>
  </svg>
);

export default function AdminLayout({ children }) {
  const path = usePathname();
  const router = useRouter();

  return (
    <div className={s.shell}>
      {/* ── Desktop Sidebar ── */}
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <div className={s.logoBox}><Logo/></div>
          <div>
            <div className={s.brandName}>eBin</div>
            <div className={s.brandSub}>Admin Portal</div>
          </div>
        </div>
        <nav className={s.nav}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className={[s.link, path.startsWith(n.href)&&s.active].filter(Boolean).join(" ")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={n.d}/></svg>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className={s.foot}>
          <span className={s.adminTag}>Administrator</span>
          <button className={s.signout} onClick={async()=>{ await signOut(); router.push("/auth/login"); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className={s.main}>
        {/* Mobile top header */}
        <div className={s.mobileHeader}>
          <div className={s.mobileBrand}>
            <div className={s.mobileLogoBox}><Logo/></div>
            <div>
              <div className={s.mobileBrandName}>eBin</div>
              <div className={s.mobileBrandSub}>Admin Portal</div>
            </div>
          </div>
          <button
            className={s.mobileSignOut}
            onClick={async()=>{ await signOut(); router.push("/auth/login"); }}
            title="Sign out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
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
              className={[s.tabBtn, path.startsWith(n.href) && s.tabActive].filter(Boolean).join(" ")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.d}/>
              </svg>
              {n.shortLabel}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
