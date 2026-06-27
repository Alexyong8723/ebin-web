"use client";
import { useEffect, useRef, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { getEbins, addEbin, updateEbin, deleteEbin, getCategories, createQrToken, getQrTokensByBin } from "@/lib/firestore";
import { Button, Badge, Card, Modal, Alert } from "@/components/ui";
import QRCode from "qrcode";
import s from "./page.module.css";

const EMPTY = { locationName:"", address:"", capacityKg:"", acceptedCategories:[], status:"available", lat:"", lng:"", currentWeightKg:0 };
const BIN_COLOR = { available:"green", half_full:"amber", almost_full:"red", full:"gray" };
const STATUS_PCT = { available:0, half_full:0.5, almost_full:0.8, full:1 };

function statusToPoints(status, capacityPoints) {
  const cap = parseFloat(capacityPoints) || 1000;
  return Math.round(cap * (STATUS_PCT[status] ?? 0));
}

export default function AdminBins() {
  const [ebins, setEbins]     = useState([]);
  const [cats, setCats]       = useState([]);
  const [modal, setModal]     = useState(null); // null | "add" | "edit" | "qr"
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const [search, setSearch]   = useState("");
  const [deleting, setDeleting] = useState(null);

  // QR modal state
  const [qrBin, setQrBin]           = useState(null);
  const [qrTokens, setQrTokens]     = useState([]);
  const [qrPoints, setQrPoints]     = useState("10");
  const [qrLabel, setQrLabel]       = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrErr, setQrErr]           = useState("");
  const [activeQr, setActiveQr]     = useState(null); // { token, dataUrl }

  // AI classification state
  const [aiImage, setAiImage]       = useState(null); // base64
  const [aiMime, setAiMime]         = useState("image/jpeg");
  const [aiPreview, setAiPreview]   = useState(null); // object URL
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiResult, setAiResult]     = useState(null); // { category, label, confidence, suggestedPoints, description }
  const [aiErr, setAiErr]           = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    Promise.all([getEbins(), getCategories()]).then(([e,c])=>{ setEbins(e); setCats(c); });
  }, []);

  function openAdd()  { setForm({...EMPTY}); setModal("add"); setErr(""); }
  function openEdit(b){ setForm({ locationName:b.locationName, address:b.address, capacityKg:b.capacityKg, capacityPoints:b.capacityPoints||1000, acceptedCategories:b.acceptedCategories||[], status:b.status, lat:b.lat||"", lng:b.lng||"", _id:b.id, currentPoints:b.currentPoints??0 }); setModal("edit"); setErr(""); }

  async function openQr(bin) {
    setQrBin(bin); setQrErr(""); setActiveQr(null); setQrPoints("10"); setQrLabel("");
    setAiImage(null); setAiPreview(null); setAiResult(null); setAiErr("");
    const tokens = await getQrTokensByBin(bin.id);
    setQrTokens(tokens);
    setModal("qr");
  }

  function handleImageFile(file) {
    if (!file) return;
    setAiErr(""); setAiResult(null);
    setAiMime(file.type || "image/jpeg");
    setAiPreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result.split(",")[1];
      setAiImage(b64);
    };
    reader.readAsDataURL(file);
  }

  async function classifyImage() {
    if (!aiImage) return;
    setAiLoading(true); setAiErr(""); setAiResult(null);
    try {
      const res = await fetch("/api/classify-waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: aiImage, mimeType: aiMime }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Classification failed.");
      setAiResult(data);
      setQrPoints(String(data.suggestedPoints));
      setQrLabel(data.label || "");
    } catch (err) {
      setAiErr(err.message || "Classification failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault(); setErr(""); setSaving(true);
    try {
      const data = { locationName:form.locationName, address:form.address, capacityKg:parseFloat(form.capacityKg), capacityPoints:parseFloat(form.capacityPoints||1000), acceptedCategories:form.acceptedCategories, status:form.status, lat:parseFloat(form.lat)||null, lng:parseFloat(form.lng)||null, currentPoints: statusToPoints(form.status, form.capacityPoints) };
      if (form._id) await updateEbin(form._id, data);
      else await addEbin(data);
      const updated = await getEbins(); setEbins(updated); setModal(null);

      // Auto-send email alert if bin is almost full or full
      if (data.status === "almost_full" || data.status === "full") {
        fetch("/api/notify-bins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bins: [{ ...data, locationName: data.locationName, id: form._id }] }),
        }).catch(() => {}); // silent — don't block the UI
      }
    } catch { setErr("Failed to save. Please try again."); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try { await deleteEbin(id); setEbins(p=>p.filter(b=>b.id!==id)); } catch {}
    finally { setDeleting(null); }
  }

  function autoAlert(bin, newPoints) {
    const maxPoints = bin.capacityPoints || 1000;
    const pct = maxPoints > 0 ? newPoints / maxPoints : 0;
    const status = pct >= 1 ? "full" : pct >= 0.8 ? "almost_full" : null;
    if (status) {
      fetch("/api/notify-bins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bins: [{ ...bin, currentPoints: newPoints, status }] }),
      }).catch(() => {});
    }
  }

  function toggleCat(name) {
    setForm(p=>({ ...p, acceptedCategories: p.acceptedCategories.includes(name) ? p.acceptedCategories.filter(c=>c!==name) : [...p.acceptedCategories, name] }));
  }

  async function handleGenerateQr() {
    if (!qrPoints || isNaN(qrPoints) || Number(qrPoints) < 1) { setQrErr("Enter a valid points value."); return; }
    setQrGenerating(true); setQrErr(""); setActiveQr(null);
    try {
      const { token } = await createQrToken({ binId:qrBin.id, binName:qrBin.locationName, points:Number(qrPoints), label:qrLabel });
      const dataUrl = await QRCode.toDataURL(token, { width:240, margin:2, color:{ dark:"#111827", light:"#ffffff" } });
      setActiveQr({ token, dataUrl });
      // refresh token list
      const tokens = await getQrTokensByBin(qrBin.id);
      setQrTokens(tokens);
    } catch { setQrErr("Failed to generate QR. Please try again."); }
    finally { setQrGenerating(false); }
  }

  function downloadQr() {
    if (!activeQr) return;
    const a = document.createElement("a");
    a.href = activeQr.dataUrl;
    a.download = `${qrBin.locationName.replace(/\s+/g,"-")}-${activeQr.token}.png`;
    a.click();
  }

  const filtered = ebins.filter(b=>b.locationName?.toLowerCase().includes(search.toLowerCase())||b.address?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className={s.page}>
        <div className={s.hd}>
          <div><h1 className={s.title}>eBin Management</h1><p className={s.sub}>{ebins.length} locations registered</p></div>
          <Button onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16m8-8H4"/></svg>
            Add eBin
          </Button>
        </div>

        <div className={s.searchBar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className={s.searchIn} placeholder="Search by name or address…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        <div className={s.grid}>
          {filtered.map(bin=>{
            const currentPoints = bin.currentPoints || 0;
            const maxPoints = bin.capacityPoints || 1000;
            const pct = Math.round((currentPoints / maxPoints) * 100);
            return (
              <Card key={bin.id} className={s.binCard}>
                <div className={s.cardTop}>
                  <Badge color={BIN_COLOR[bin.status]||"green"}>{bin.status?.replace("_"," ")}</Badge>
                  <div className={s.cardActions}>
                    <button className={s.iconBtn} onClick={()=>openQr(bin)} title="Generate QR">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 18h.01M18 14h.01M18 18h.01"/></svg>
                    </button>
                    <button className={s.iconBtn} onClick={()=>openEdit(bin)} title="Edit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className={[s.iconBtn, s.iconDanger].join(" ")} onClick={()=>handleDelete(bin.id)} disabled={deleting===bin.id} title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                    </button>
                  </div>
                </div>
                <h3 className={s.binName}>{bin.locationName}</h3>
                <p className={s.binAddr}>{bin.address}</p>
                <div className={s.capSection}>
                  <div className={s.capRow}><span className={s.capLbl}>Capacity</span><span className={s.capVal}>{pct}%</span></div>
                  <div className={s.capBar}><div className={s.capFill} style={{width:`${pct}%`,background:pct>=80?"var(--red)":pct>=50?"var(--amber)":"var(--g400)"}}/></div>
                  <p className={s.capSub}>{currentPoints}pts / {maxPoints}pts max</p>
                </div>
                <div className={s.adjRow}>
                  <span className={s.adjLbl}>Adjust points (±100pts)</span>
                  <div className={s.adjBtns}>
                    <button className={s.adjBtn} onClick={async()=>{ await updateEbin(bin.id,{currentPoints:Math.max(0,(bin.currentPoints||0)-100)}); setEbins(p=>p.map(b=>b.id===bin.id?{...b,currentPoints:Math.max(0,(b.currentPoints||0)-100)}:b)); }}>−</button>
                    <button className={[s.adjBtn,s.adjBtnPlus].join(" ")} onClick={async()=>{
                      const newP = Math.min(maxPoints,(bin.currentPoints||0)+100);
                      await updateEbin(bin.id,{currentPoints:newP});
                      setEbins(p=>p.map(b=>b.id===bin.id?{...b,currentPoints:newP}:b));
                      autoAlert(bin, newP);
                    }}>+</button>
                  </div>
                </div>
                <div className={s.catTags}>
                  {(bin.acceptedCategories||[]).map(c=><span key={c} className={s.catTag}>{c}</span>)}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(modal==="add"||modal==="edit") && (
        <Modal title={modal==="add"?"Add eBin":"Edit eBin"} onClose={()=>setModal(null)}>
          {err && <Alert>{err}</Alert>}
          <form onSubmit={handleSave} className={s.modalForm}>
            <div className={s.fld}><label className={s.lbl}>Location Name</label><input className={s.inp} value={form.locationName} onChange={e=>setForm(p=>({...p,locationName:e.target.value}))} required placeholder="e.g. Mid Valley eBin"/></div>
            <div className={s.fld}><label className={s.lbl}>Address</label><input className={s.inp} value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))} required placeholder="Full address"/></div>
            <div className={s.row}><div className={s.fld}><label className={s.lbl}>Latitude</label><input type="number" step="any" className={s.inp} value={form.lat} onChange={e=>setForm(p=>({...p,lat:e.target.value}))} placeholder="e.g. 3.1390" required/></div><div className={s.fld}><label className={s.lbl}>Longitude</label><input type="number" step="any" className={s.inp} value={form.lng} onChange={e=>setForm(p=>({...p,lng:e.target.value}))} placeholder="e.g. 101.6869" required/></div></div>
            <div className={s.row}>
              <div className={s.fld}><label className={s.lbl}>Capacity (Points)</label><input type="number" min="1" className={s.inp} value={form.capacityPoints || 1000} onChange={e=>setForm(p=>({...p,capacityPoints:e.target.value}))} required placeholder="e.g. 1000"/></div>
              <div className={s.fld}><label className={s.lbl}>Status</label>
                <select className={s.inp} value={form.status} onChange={e=>{
                  const newStatus = e.target.value;
                  const newPoints = statusToPoints(newStatus, form.capacityPoints);
                  setForm(p=>({...p, status:newStatus, currentPoints:newPoints}));
                }}>
                  <option value="available">Available</option><option value="half_full">Half Full</option><option value="almost_full">Almost Full</option><option value="full">Full</option>
                </select>
                {form.capacityPoints && (
                  <p style={{fontSize:11,color:"var(--muted)",marginTop:4}}>
                    Auto-set points: <strong>{statusToPoints(form.status,form.capacityPoints)} pts</strong> / {form.capacityPoints || 1000} pts
                  </p>
                )}
              </div>
            </div>
            <div className={s.fld}>
              <label className={s.lbl}>Accepted Categories</label>
              <div className={s.catCheckGrid}>
                {cats.map(c=>(
                  <label key={c.id} className={s.catCheck}>
                    <input type="checkbox" checked={form.acceptedCategories.includes(c.name)} onChange={()=>toggleCat(c.name)}/>
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div className={s.modalBtns}>
              <Button variant="ghost" type="button" onClick={()=>setModal(null)}>Cancel</Button>
              <Button type="submit" loading={saving}>{modal==="add"?"Add eBin":"Save Changes"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* QR Token Modal */}
      {modal==="qr" && qrBin && (
        <Modal title={`QR Tokens — ${qrBin.locationName}`} onClose={()=>{ setModal(null); setActiveQr(null); }}>
          <div className={s.qrModalBody}>

            {/* AI Classification */}
            <div className={s.aiSection}>
              <p className={s.qrSectionTitle}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{marginRight:5,verticalAlign:"middle"}}>
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/><path d="M12 8v4l3 3"/>
                </svg>
                AI-Assisted Point Suggestion
              </p>
              <p className={s.aiHint}>Upload a photo of the e-waste item — AI will classify it and suggest the right point value.</p>

              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleImageFile(e.target.files[0])}/>

              {!aiPreview ? (
                <button className={s.aiUploadZone} onClick={()=>fileRef.current?.click()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Click to upload item photo</span>
                  <span className={s.aiUploadSub}>JPG, PNG, WEBP</span>
                </button>
              ) : (
                <div className={s.aiPreviewWrap}>
                  <img src={aiPreview} alt="E-waste item" className={s.aiPreviewImg}/>
                  <button className={s.aiClearBtn} onClick={()=>{ setAiPreview(null); setAiImage(null); setAiResult(null); setAiErr(""); }}>✕ Clear</button>
                </div>
              )}

              {aiErr && <Alert>{aiErr}</Alert>}

              {aiPreview && !aiResult && (
                <Button onClick={classifyImage} loading={aiLoading} variant="ghost" fullWidth>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  {aiLoading ? "Classifying…" : "Classify with AI"}
                </Button>
              )}

              {aiResult && (
                <div className={s.aiResultCard}>
                  <div className={s.aiResultRow}>
                    <div className={s.aiResultMain}>
                      <span className={s.aiResultLabel}>{aiResult.label}</span>
                      <span className={s.aiResultCat}>{aiResult.category}</span>
                    </div>
                    <div className={s.aiResultPts}>{aiResult.suggestedPoints} pts</div>
                  </div>
                  <p className={s.aiResultDesc}>{aiResult.description}</p>
                  <div className={s.aiConfBar}>
                    <div className={s.aiConfFill} style={{width:`${Math.round(aiResult.confidence*100)}%`}}/>
                    <span className={s.aiConfTxt}>{Math.round(aiResult.confidence*100)}% confidence</span>
                  </div>
                  <p className={s.aiAutoFill}>✓ Points and label auto-filled below — adjust if needed.</p>
                </div>
              )}
            </div>

            {/* Generator */}
            <div className={s.qrGenSection}>
              <p className={s.qrSectionTitle}>Generate QR Code</p>
              {qrErr && <Alert>{qrErr}</Alert>}
              <div className={s.qrGenRow}>
                <div className={s.fld} style={{flex:1}}>
                  <label className={s.lbl}>Points Value</label>
                  <input type="number" min="1" className={s.inp} value={qrPoints} onChange={e=>setQrPoints(e.target.value)} placeholder="e.g. 10"/>
                </div>
                <div className={s.fld} style={{flex:2}}>
                  <label className={s.lbl}>Label (optional)</label>
                  <input className={s.inp} value={qrLabel} onChange={e=>setQrLabel(e.target.value)} placeholder="e.g. Drop-off April 2025"/>
                </div>
              </div>
              <Button onClick={handleGenerateQr} loading={qrGenerating} fullWidth>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 18h.01M18 14h.01M18 18h.01"/></svg>
                Generate QR Code
              </Button>

              {activeQr && (
                <div className={s.qrResult}>
                  <img src={activeQr.dataUrl} alt="QR Code" className={s.qrImg}/>
                  <code className={s.qrToken}>{activeQr.token}</code>
                  <p className={s.qrHint}>Worth <strong>{qrPoints} pts</strong> · One-time use only</p>
                  <Button variant="ghost" onClick={downloadQr}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download PNG
                  </Button>
                </div>
              )}
            </div>

            {/* History */}
            <div className={s.qrHistory}>
              <p className={s.qrSectionTitle}>Token History ({qrTokens.length})</p>
              {qrTokens.length === 0 && <p className={s.qrEmpty}>No tokens generated yet.</p>}
              <div className={s.qrList}>
                {qrTokens.map(t=>(
                  <div key={t.id} className={s.qrListItem}>
                    <div className={s.qrListLeft}>
                      <code className={s.qrListToken}>{t.token}</code>
                      {t.label && <span className={s.qrListLabel}>{t.label}</span>}
                    </div>
                    <div className={s.qrListRight}>
                      <span className={s.qrListPts}>{t.points} pts</span>
                      <span className={[s.qrListStatus, t.used ? s.qrUsed : s.qrUnused].join(" ")}>
                        {t.used ? "Used" : "Active"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
