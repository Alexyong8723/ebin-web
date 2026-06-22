"use client";
import { useEffect, useState, useRef } from "react";
import UserLayout from "@/components/layout/UserLayout";
import { getEbins } from "@/lib/firestore";
import s from "./page.module.css";

const STATUS = {
  available:   { color: "#16a34a", label: "Available" },
  half_full:   { color: "#d97706", label: "Half Full" },
  almost_full: { color: "#dc2626", label: "Almost Full" },
  full:        { color: "#6b7280", label: "Full" },
};

function makePinSvg(color) {
  return `<div style="position:relative;width:38px;height:38px;cursor:pointer;">
    <div style="width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};box-shadow:0 3px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
      <svg style="transform:rotate(45deg)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18M6 6V4a1 1 0 011-1h10a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      </svg>
    </div>
  </div>`;
}

export default function LocationPage() {
  const [ebins, setEbins]       = useState([]);
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy]         = useState(true);
  const mapRef     = useRef(null);
  const leafRef    = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    getEbins().then(e => { setEbins(e); setBusy(false); });
  }, []);

  // Init Leaflet map once
  useEffect(() => {
    if (typeof window === "undefined" || leafRef.current) return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const map = window.L.map(mapRef.current).setView([3.139, 101.687], 12);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      leafRef.current = map;
    };
    document.head.appendChild(script);
  }, []);

  // Place markers whenever ebins load or map becomes ready
  useEffect(() => {
    if (ebins.length === 0) return;
    const interval = setInterval(() => {
      if (!window.L || !leafRef.current) return;
      clearInterval(interval);

      const L = window.L;
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};

      ebins.forEach(bin => {
        if (!bin.lat || !bin.lng) return;
        const st  = STATUS[bin.status] || STATUS.available;
        const pct = bin.capacityKg > 0
          ? Math.round((bin.currentWeightKg / bin.capacityKg) * 100) : 0;

        const icon = L.divIcon({
          className: "",
          html: makePinSvg(st.color),
          iconSize: [38, 38],
          iconAnchor: [19, 38],
          popupAnchor: [0, -42],
        });

        const marker = L.marker([bin.lat, bin.lng], { icon }).addTo(leafRef.current);
        marker.bindPopup(`
          <div style="font-family:'DM Sans',system-ui,sans-serif;min-width:210px;">
            <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${bin.locationName}</div>
            <div style="font-size:12px;color:#6b7280;margin-bottom:10px;">${bin.address}</div>
            <div style="background:#f3f4f6;border-radius:8px;padding:10px;margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px;">
                <span style="color:#6b7280;">Capacity used</span>
                <span style="font-weight:600;color:${st.color};">${pct}%</span>
              </div>
              <div style="height:7px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${st.color};border-radius:4px;"></div>
              </div>
              <div style="font-size:11px;color:#9ca3af;margin-top:5px;">${bin.currentWeightKg ?? 0}kg / ${bin.capacityKg}kg</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="width:9px;height:9px;border-radius:50%;background:${st.color};display:inline-block;"></span>
              <span style="font-size:12px;font-weight:500;">${st.label}</span>
            </div>
          </div>
        `);
        marker.on("click", () => setSelected(bin));
        markersRef.current[bin.id] = marker;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [ebins]);

  function flyTo(bin) {
    if (!leafRef.current || !bin.lat || !bin.lng) return;
    leafRef.current.flyTo([bin.lat, bin.lng], 16, { duration: 1 });
    markersRef.current[bin.id]?.openPopup();
    setSelected(bin);
  }

  const filtered   = ebins.filter(b =>
    b.locationName?.toLowerCase().includes(search.toLowerCase()) ||
    b.address?.toLowerCase().includes(search.toLowerCase())
  );
  const withCoords = ebins.filter(b => b.lat && b.lng).length;

  return (
    <UserLayout>
      <div className={s.page}>
        <div className={s.header}>
          <div>
            <h1 className={s.title}>eBin Locations</h1>
            <p className={s.sub}>{withCoords} bin{withCoords !== 1 ? "s" : ""} on the map</p>
          </div>
          <div className={s.legend}>
            {Object.entries(STATUS).map(([k, v]) => (
              <span key={k} className={s.legendItem}>
                <span className={s.legendDot} style={{ background: v.color }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        <div className={s.layout}>
          {/* Sidebar */}
          <div className={s.sidebar}>
            <div className={s.searchBar}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                className={s.searchIn}
                placeholder="Search eBin locations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className={s.list}>
              {busy && <div className={s.empty}>Loading bins…</div>}
              {!busy && filtered.length === 0 && <div className={s.empty}>No locations found.</div>}
              {filtered.map(bin => {
                const st  = STATUS[bin.status] || STATUS.available;
                const pct = bin.capacityKg > 0
                  ? Math.round((bin.currentWeightKg / bin.capacityKg) * 100) : 0;
                return (
                  <button
                    key={bin.id}
                    className={[s.binItem, selected?.id === bin.id && s.binItemActive].filter(Boolean).join(" ")}
                    onClick={() => flyTo(bin)}
                  >
                    <div className={s.binTop}>
                      <div className={s.binDot} style={{ background: st.color }} />
                      <div className={s.binInfo}>
                        <span className={s.binName}>{bin.locationName}</span>
                        <span className={s.binAddr}>{bin.address}</span>
                      </div>
                      <span className={s.binPct} style={{ color: st.color }}>{pct}%</span>
                    </div>
                    <div className={s.capBar}>
                      <div className={s.capFill} style={{ width: `${pct}%`, background: st.color }} />
                    </div>
                    {!bin.lat && <span className={s.noCoords}>⚠ No coordinates set</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map */}
          <div className={s.mapWrap}>
            <div ref={mapRef} className={s.map} style={{minHeight:"250px"}} />
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
