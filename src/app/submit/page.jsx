"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getCategories, getEbins } from "@/lib/firestore";
import { db } from "@/lib/firebase";
import { doc, addDoc, updateDoc, collection, serverTimestamp, increment } from "firebase/firestore";
import UserLayout from "@/components/layout/UserLayout";
import { Button, Alert, Card } from "@/components/ui";
import s from "./page.module.css";

export default function SubmitPage() {
  const { user, profile, setProfile } = useAuth();
  const [step, setStep]       = useState(1);
  const [cats, setCats]       = useState([]);
  const [ebins, setEbins]     = useState([]);
  const [code, setCode]       = useState("");
  const [bin, setBin]         = useState(null);
  const [cat, setCat]         = useState("");
  const [kg, setKg]           = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);
  const [earned, setEarned]   = useState(0);

  useEffect(() => {
    Promise.all([getCategories(), getEbins()]).then(([c,e])=>{ setCats(c); setEbins(e); });
  }, []);

  function handleScan(e) {
    e.preventDefault(); setErr("");
    const found = ebins.find(b=>b.qrRedeemCode===code.trim().toUpperCase());
    if (!found) return setErr("Invalid QR code. Please scan the code printed on the eBin.");
    if (found.status==="full") return setErr("This bin is full. Please try another location.");
    setBin(found); setStep(2);
  }

  async function handleSubmit(e) {
    e.preventDefault(); setErr("");
    if (!cat) return setErr("Please select a category.");
    if (!kg||parseFloat(kg)<=0) return setErr("Please enter a valid weight.");
    setLoading(true);
    try {
      const catObj = cats.find(c=>c.name===cat);
      const pts = Math.round((catObj?.pointsPerKg||10)*parseFloat(kg));
      await addDoc(collection(db,"users",user.uid,"submissions"),{
        eBinId:bin.id, categoryId:cat, weightKg:parseFloat(kg),
        pointsEarned:pts, submittedAt:serverTimestamp(),
      });
      await updateDoc(doc(db,"users",user.uid),{ pointsTotal:increment(pts) });
      await updateDoc(doc(db,"ebins",bin.id),{ currentWeightKg:increment(parseFloat(kg)), lastUpdated:serverTimestamp() });
      setEarned(pts);
      setProfile(p=>({...p, pointsTotal:(p?.pointsTotal||0)+pts}));
      setStep(3);
    } catch { setErr("Failed to submit. Please try again."); }
    finally { setLoading(false); }
  }

  function reset() { setStep(1); setCode(""); setBin(null); setCat(""); setKg(""); setErr(""); }

  const estPts = cat && kg ? Math.round((cats.find(c=>c.name===cat)?.pointsPerKg||10)*parseFloat(kg||0)) : 0;

  return (
    <UserLayout>
      <div className={s.page}>
        <div className={s.hd}><h1 className={s.title}>Submit E-Waste</h1><p className={s.sub}>Scan an eBin QR code and log your drop-off to earn points</p></div>

        {/* Stepper */}
        <div className={s.stepper}>
          {["Scan QR Code","Item Details","Done"].map((lbl,i)=>(
            <div key={i} className={s.stepItem}>
              <div className={[s.dot, step>i+1&&s.dotDone, step===i+1&&s.dotCurr].filter(Boolean).join(" ")}>
                {step>i+1 ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> : i+1}
              </div>
              <span className={[s.stepLbl, step===i+1&&s.stepLblActive].filter(Boolean).join(" ")}>{lbl}</span>
              {i<2 && <div className={[s.line, step>i+1&&s.lineDone].filter(Boolean).join(" ")}/>}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step===1 && (
          <Card className={s.card}>
            <div className={s.qrHero}>
              <div className={s.qrIcon}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--g500)" strokeWidth="1.4">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  <path d="M14 14h.01M14 17h3M17 14v3M20 17h.01M20 20h.01M17 20h.01M14 20h3"/>
                </svg>
              </div>
              <p className={s.qrDesc}>Scan the QR code at the eBin, then enter the code below — or pick a location from the list</p>
            </div>
            {err && <Alert>{err}</Alert>}
            <form onSubmit={handleScan} className={s.form}>
              <div className={s.fieldGrp}>
                <label className={s.lbl}>QR / Redeem Code</label>
                <input className={s.codeIn} placeholder="e.g. EBIN-MIDVALLEY-001"
                  value={code} onChange={e=>setCode(e.target.value)} required autoCapitalize="characters"/>
              </div>
              <div className={s.orLine}><span>or select a bin</span></div>
              <div className={s.binList}>
                {ebins.map(b=>(
                  <button type="button" key={b.id}
                    className={[s.binBtn, code===b.qrRedeemCode&&s.binSel, b.status==="full"&&s.binFull].filter(Boolean).join(" ")}
                    onClick={()=>b.status!=="full"&&setCode(b.qrRedeemCode)}>
                    <div className={s.binBtnL}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      <span className={s.binBtnName}>{b.locationName}</span>
                    </div>
                    <span className={[s.binBtnStatus, b.status==="available"&&s.stAvail, b.status==="full"&&s.stFull, b.status==="almost_full"&&s.stAlmost].filter(Boolean).join(" ")}>
                      {b.status?.replace("_"," ")}
                    </span>
                  </button>
                ))}
              </div>
              <Button type="submit" size="lg" fullWidth>Confirm Location →</Button>
            </form>
          </Card>
        )}

        {/* Step 2 */}
        {step===2 && (
          <Card className={s.card}>
            <div className={s.binConfirm}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--g600)" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{bin?.locationName}</span>
              <button className={s.changeBtn} onClick={()=>setStep(1)}>Change</button>
            </div>
            {err && <Alert>{err}</Alert>}
            <form onSubmit={handleSubmit} className={s.form}>
              <div className={s.fieldGrp}>
                <label className={s.lbl}>Item Category</label>
                <div className={s.catGrid}>
                  {cats.map(c=>(
                    <button type="button" key={c.id}
                      className={[s.catBtn, cat===c.name&&s.catSel].filter(Boolean).join(" ")}
                      onClick={()=>setCat(c.name)}>
                      <span className={s.catPts}>{c.pointsPerKg} pts/kg</span>
                      <span className={s.catName}>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.fieldGrp}>
                <label className={s.lbl}>Weight (kg)</label>
                <input type="number" min="0.1" step="0.1" className={s.numIn}
                  placeholder="e.g. 1.5" value={kg} onChange={e=>setKg(e.target.value)} required/>
                {estPts>0 && <p className={s.estPts}>Estimated: <strong>{estPts} points</strong></p>}
              </div>
              <div className={s.btnRow}>
                <Button variant="ghost" type="button" onClick={()=>setStep(1)}>← Back</Button>
                <Button type="submit" loading={loading}>Submit Drop-off</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Step 3 */}
        {step===3 && (
          <Card className={s.card}>
            <div className={s.success}>
              <div className={s.successIco}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className={s.successTtl}>Drop-off submitted!</h2>
              <p className={s.successSub}>Thank you for recycling responsibly 🌿</p>
              <div className={s.earnedBadge}>+{earned} points earned</div>
              <p className={s.newBal}>New balance: <strong>{profile?.pointsTotal?.toLocaleString()} pts</strong></p>
              <div className={s.successBtns}>
                <Button variant="ghost" onClick={reset}>Submit another</Button>
                <Button onClick={()=>window.location.href="/rewards"}>Browse Rewards →</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </UserLayout>
  );
}
