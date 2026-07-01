"use client";
import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import * as tf from "@tensorflow/tfjs";
import { Button, Spinner, Badge } from "@/components/ui";
import AdminLayout from "@/components/layout/AdminLayout";
import { getEbins, getCarbonCredits, seedCarbonCredits } from "@/lib/firestore";
import { ArrowLeft, Camera, Edit2 } from "lucide-react";
import s from "./page.module.css";

const EWASTE_CLASSES = [
  "battery",
  "flashlight",
  "keyboard",
  "laptop",
  "mouse",
  "pcb",
  "phone",
  "usb_drive",
];

const ITEM_DATA = {
  "Headphones": { material: 45, carbon: 40, processing: 56, total: 45.7 },
  "Power Bank": { material: 60, carbon: 85, processing: 76, total: 70.7 },
  "Charging Cable": { material: 55, carbon: 40, processing: 44, total: 48.3 },
  "SD Card": { material: 50, carbon: 30, processing: 52, total: 50.4 },
  "Smart Tag": { material: 40, carbon: 50, processing: 58, total: 46.6 },
  "POS System": { material: 70, carbon: 60, processing: 72, total: 67.4 },
  "Card Reader": { material: 55, carbon: 50, processing: 64, total: 55.3 },
  "Glucose Meter": { material: 65, carbon: 55, processing: 62, total: 61.4 },
  "Digital Thermometer": { material: 40, carbon: 40, processing: 48, total: 49.6 },
  "Blood Pressure Cuff": { material: 50, carbon: 65, processing: 64, total: 57.3 },
  "Pulse Oximeter": { material: 40, carbon: 45, processing: 52, total: 43.9 },
  "Contact Lens Cleaner": { material: 35, carbon: 40, processing: 44, total: 38.3 },
  "Smart Inhaler": { material: 40, carbon: 50, processing: 56, total: 46.2 },
  "Electric Fan": { material: 65, carbon: 50, processing: 56, total: 58.7 },
  "Hair Dryer": { material: 55, carbon: 45, processing: 52, total: 51.4 },
  "Calculator": { material: 40, carbon: 35, processing: 44, total: 39.3 },
  "Smart Watch": { material: 75, carbon: 70, processing: 80, total: 74.5 },
  "Electric Toothbrush": { material: 45, carbon: 60, processing: 68, total: 54.1 },
  "Electric Razor": { material: 50, carbon: 60, processing: 62, total: 55.4 },
  "Battery": { material: 40, carbon: 90, processing: 70, total: 61 }
};

function getBreakdown(label, totalPoints) {
  // Try to match label with ITEM_DATA (case insensitive if possible, but our data is Capitalized)
  const key = Object.keys(ITEM_DATA).find(k => k.toLowerCase() === label.toLowerCase()) || label;
  const data = ITEM_DATA[key];
  if (data) {
    return {
      material: (data.material * 0.5),
      carbon: (data.carbon * 0.3),
      processing: (data.processing * 0.2)
    };
  }
  return {
    material: (totalPoints * 0.5),
    carbon: (totalPoints * 0.3),
    processing: (totalPoints * 0.2)
  };
}

export default function AdminBinKiosk({ params: rawParams }) {
  const params = use(rawParams);
  const router = useRouter();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [bin, setBin] = useState(null);
  const [carbonCredits, setCarbonCredits] = useState([]);
  const [status, setStatus] = useState("loading_data"); // loading_data, loading_model, idle, scanning, analyzing, success, error, manual
  const [errorMsg, setErrorMsg] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [itemResult, setItemResult] = useState(null);
  const [model, setModel] = useState(null);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [manualSelection, setManualSelection] = useState("");

  useEffect(() => {
    loadData();
    return () => {
      stopCamera();
    };
  }, []);

  async function loadData() {
    try {
      // Fetch bin
      const bins = await getEbins();
      const currentBin = bins.find(b => b.id === params.binId);
      if (!currentBin) throw new Error("Bin not found");
      setBin(currentBin);

      // Fetch carbon credits
      let credits = await getCarbonCredits();
      if (credits.length === 0) {
        // Seed if empty (just a fallback for this demo)
        const defaults = [
          { id: "battery", label: "Battery", points: 90, weightKg: 0.1 },
          { id: "laptop", label: "Laptop", points: 150, weightKg: 2.0 },
          { id: "phone", label: "Phone", points: 100, weightKg: 0.2 },
          { id: "keyboard", label: "Keyboard", points: 45, weightKg: 0.5 },
          { id: "mouse", label: "Mouse", points: 30, weightKg: 0.1 },
          { id: "usb_drive", label: "USB Drive", points: 25, weightKg: 0.05 },
          { id: "flashlight", label: "Flashlight", points: 30, weightKg: 0.2 },
          { id: "pcb", label: "PCB", points: 50, weightKg: 0.2 },
          { id: "headphones", label: "Headphones", points: 40, weightKg: 0.2 },
          { id: "power_bank", label: "Power Bank", points: 85, weightKg: 0.3 },
          { id: "charging_cable", label: "Charging Cable", points: 40, weightKg: 0.05 },
          { id: "sd_card", label: "SD Card", points: 30, weightKg: 0.01 },
          { id: "smart_tag", label: "Smart Tag", points: 50, weightKg: 0.02 },
          { id: "pos_system", label: "POS System", points: 60, weightKg: 2.5 },
          { id: "card_reader", label: "Card Reader", points: 50, weightKg: 0.5 },
          { id: "glucose_meter", label: "Glucose Meter", points: 55, weightKg: 0.1 },
          { id: "digital_thermometer", label: "Digital Thermometer", points: 40, weightKg: 0.05 },
          { id: "blood_pressure_cuff", label: "Blood Pressure Cuff", points: 65, weightKg: 0.4 },
          { id: "pulse_oximeter", label: "Pulse Oximeter", points: 45, weightKg: 0.05 },
          { id: "contact_lens_cleaner", label: "Contact Lens Cleaner", points: 40, weightKg: 0.2 },
          { id: "smart_inhaler", label: "Smart Inhaler", points: 50, weightKg: 0.1 },
          { id: "electric_fan", label: "Electric Fan", points: 50, weightKg: 2.0 },
          { id: "hair_dryer", label: "Hair Dryer", points: 45, weightKg: 0.8 },
          { id: "calculator", label: "Calculator", points: 35, weightKg: 0.2 },
          { id: "smart_watch", label: "Smart Watch", points: 70, weightKg: 0.1 },
          { id: "electric_toothbrush", label: "Electric Toothbrush", points: 60, weightKg: 0.2 },
          { id: "electric_razor", label: "Electric Razor", points: 60, weightKg: 0.3 },
        ];
        await seedCarbonCredits(defaults);
        credits = defaults;
      }
      
      // Sort alphabetically
      credits.sort((a,b) => a.label.localeCompare(b.label));
      setCarbonCredits(credits);

      // Now load model
      await loadModel();
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to load data.");
    }
  }

  async function loadModel() {
    try {
      setStatus("loading_model");
      const loadedModel = await tf.loadGraphModel('/model_web/model.json');
      setModel(loadedModel);
      setStatus("idle");
    } catch (err) {
      console.error("Failed to load model:", err);
      setStatus("error");
      setErrorMsg("Failed to load the AI model. Check the console.");
    }
  }

  async function startCamera() {
    if (status === "error" && !model) return;
    setStatus("scanning");
    setErrorMsg("");
    setQrDataUrl("");
    setItemResult(null);
    try {
      const ua = navigator.userAgent || "";
      const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isMobile = /Mobi|Android|iPhone/i.test(ua);
      
      // iPad -> front ("user")
      // Phone -> back ("environment")
      // Laptop -> default ("user")
      const mode = (isMobile && !isIPad) ? "environment" : "user";

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg("Camera access failed. Please check permissions.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function runCustomModelClassification(canvas) {
    if (!model) throw new Error("Model is not loaded yet.");
    const tensor = tf.browser.fromPixels(canvas);
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);
    const batched = resized.expandDims(0); 

    const prediction = model.predict(batched);
    const scores = await prediction.data();
    const maxScore = Math.max(...scores);
    const maxIndex = scores.indexOf(maxScore);
    
    tf.dispose([tensor, resized, batched, prediction]);

    const predictedClassId = EWASTE_CLASSES[maxIndex];
    const creditMatch = carbonCredits.find(c => c.id === predictedClassId);
    
    return {
      category: predictedClassId || "other",
      label: creditMatch ? creditMatch.label : (predictedClassId || "Unknown"),
      confidence: maxScore,
      suggestedPoints: creditMatch ? creditMatch.points : 10,
      estimatedWeightKg: creditMatch ? creditMatch.weightKg : 0.1,
    };
  }

  async function handleScanItem() {
    if (!videoRef.current || !canvasRef.current || !model) return;

    setStatus("analyzing");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    setAnalyzeProgress(0);
    for (let i = 10; i <= 90; i += 20) {
      setAnalyzeProgress(i);
      await new Promise(r => setTimeout(r, 250));
    }
    
    try {
      const classification = await runCustomModelClassification(canvas);
      setAnalyzeProgress(100);
      await new Promise(r => setTimeout(r, 200));

      if (classification.category === "other" || classification.confidence < 0.4) {
        setStatus("error");
        setErrorMsg(`Item not recognized as valid e-waste (detected: non e waste). Please try again or use manual classification.`);
        return;
      }
      
      await generateQrCode(classification);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "An error occurred during analysis.");
    }
  }

  async function generateQrCode(classification) {
    setItemResult(classification);

    const qrRes = await fetch("/api/generate-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        binId: bin.id,
        binName: bin.locationName,
        points: classification.suggestedPoints,
        label: classification.label,
        estimatedWeightKg: classification.estimatedWeightKg,
      }),
    });

    if (!qrRes.ok) throw new Error("Failed to generate reward token.");

    const { token } = await qrRes.json();
    const qrImage = await QRCode.toDataURL(token, {
      width: 300,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    setQrDataUrl(qrImage);
    setStatus("success");
    stopCamera();

    // Update local bin state so the capacity bar increments instantly
    setBin(prev => {
      if (!prev) return prev;
      return { ...prev, currentPoints: (prev.currentPoints || 0) + classification.suggestedPoints };
    });
  }

  function handleManualSubmit() {
    if (!manualSelection) return;
    const creditMatch = carbonCredits.find(c => c.id === manualSelection);
    if (!creditMatch) return;
    
    const classification = {
      category: manualSelection,
      label: creditMatch.label,
      confidence: 1.0,
      suggestedPoints: creditMatch.points,
      estimatedWeightKg: creditMatch.weightKg || 0.1,
    };
    
    setStatus("analyzing");
    generateQrCode(classification).catch(err => {
      setStatus("error");
      setErrorMsg(err.message);
    });
  }

  if (status === "loading_data") {
    return (
      <AdminLayout>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"60vh"}}><Spinner/></div>
      </AdminLayout>
    );
  }

  const currentPoints = bin?.currentPoints || 0;
  const maxPoints = bin?.capacityPoints || 1000;
  const pct = bin ? Math.round((currentPoints / maxPoints) * 100) : 0;

  return (
    <AdminLayout>
      <div className={s.page}>
        <div className={s.hd}>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/dashboard')}>
              <ArrowLeft size={16} />
            </Button>
            <h1>Bin Kiosk: {bin?.locationName}</h1>
          </div>
          
          <div className={s.binStats}>
            <div className={s.capWrap}>
              <span>Capacity: {pct}%</span>
              <div className={s.capBar}>
                <div className={s.capFill} style={{width: `${pct}%`, background: pct >= 80 ? "var(--red)" : pct >= 50 ? "var(--amber)" : "var(--g400)"}} />
              </div>
            </div>
            <Badge color="green">Admin Mode</Badge>
          </div>
        </div>

        <div className={s.kioskContainer}>
          <div className={s.content}>
            {status === "loading_model" && (
              <div className={s.loader}>
                <div className={s.spinner} />
                <span>Loading AI Model locally...</span>
              </div>
            )}

            {status === "idle" && (
              <div className={s.idleContainer}>
                <h2>Ready to Scan</h2>
                <p>Use the camera for auto-classification, or manually select an item.</p>
                <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem'}}>
                  <Button size="lg" onClick={startCamera}>
                    <Camera size={20} style={{marginRight: 8}}/> Auto-Scan (Camera)
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setStatus('manual')}>
                    <Edit2 size={20} style={{marginRight: 8}}/> Manual Override
                  </Button>
                </div>
              </div>
            )}

            {status === "manual" && (
              <div className={s.idleContainer}>
                <h2>Manual Classification</h2>
                <p style={{marginBottom: '2rem', color: '#666'}}>Select the item deposited to generate the correct Carbon Credits.</p>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px', margin: '0 auto'}}>
                  <select 
                    className={s.select} 
                    value={manualSelection}
                    onChange={(e) => setManualSelection(e.target.value)}
                  >
                    <option value="">-- Select Item --</option>
                    {carbonCredits.map(c => (
                      <option key={c.id} value={c.id}>{c.label} ({c.points} CC)</option>
                    ))}
                  </select>
                  
                  <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                    <Button variant="outline" style={{flex: 1}} onClick={() => setStatus('idle')}>Cancel</Button>
                    <Button style={{flex: 1}} disabled={!manualSelection} onClick={handleManualSubmit}>Generate QR</Button>
                  </div>
                </div>
              </div>
            )}

            {(status === "scanning" || status === "analyzing") && (
              <>
                <div className={s.videoWrap}>
                  <video ref={videoRef} className={s.video} playsInline muted />
                  <div className={s.scanOverlay} />
                </div>
                <canvas ref={canvasRef} className={s.hiddenCanvas} />
                
                <div className={s.controls}>
                  {status === "analyzing" ? (
                    <div className={s.progressWrap}>
                      <div className={s.progressText}>Analyzing item... {analyzeProgress}%</div>
                      <div className={s.progressBar}>
                        <div className={s.progressFill} style={{width: `${analyzeProgress}%`}} />
                      </div>
                    </div>
                  ) : (
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                      <Button variant="outline" size="lg" onClick={() => { stopCamera(); setStatus('idle'); }}>
                        Cancel
                      </Button>
                      <Button size="lg" onClick={handleScanItem}>
                        Classify Item
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}

            {status === "success" && itemResult && qrDataUrl && (
              <div className={s.qrContainer}>
                
                <div className={s.receiptCard}>
                  <div className={s.receiptHeader}>
                    <h2 className={s.receiptTitle}>Points: {Math.round(itemResult.suggestedPoints)}</h2>
                    <svg className={s.starIcon} width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  
                  {(() => {
                    const bd = getBreakdown(itemResult.label, itemResult.suggestedPoints);
                    return (
                      <div className={s.breakdown}>
                        <div className={s.receiptRow}>
                          <span className={s.rowMaterial}>Material Value</span>
                          <span className={s.receiptValue}>+{Math.round(bd.material)}</span>
                        </div>
                        <div className={s.receiptRow}>
                          <span className={s.rowCarbon}>Carbon Credit</span>
                          <span className={s.receiptValue}>+{Math.round(bd.carbon)}</span>
                        </div>
                        <div className={s.receiptRow}>
                          <span className={s.rowProcessing}>Processing Cost</span>
                          <span className={s.receiptValue}>+{Math.round(bd.processing)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className={s.qrPlaceholder}>
                    <img src={qrDataUrl} alt="QR Code" className={s.qrImageInline} />
                  </div>

                  <div className={s.receiptFooter}>
                    <svg className={s.recycleIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 19H4.815a1.83 1.83 0 01-1.57-.881 1.785 1.785 0 01-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 001.556-.89 1.784 1.784 0 000-1.777l-3.922-6.83"/><path d="M14 16l-3 3 3 3"/><path d="M4 8l3-3 3 3"/><path d="M12.5 3h-4"/><path d="M18.5 7h4"/>
                    </svg>
                    <span>Thank you for recycling!</span>
                  </div>
                </div>

                <div className={s.itemDetails}>
                  <p className={s.itemLabel}>{itemResult.label}</p>
                </div>
                
                <p className={s.instructionText}>
                  User can scan this QR code using the <strong>eBin App</strong> on their phone to claim their points.
                </p>
                <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center'}}>
                   <Button onClick={() => setStatus('idle')} variant="outline">Done</Button>
                   <Button onClick={startCamera}>Scan Next Item</Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className={s.qrContainer}>
                <div className={s.error}>{errorMsg}</div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1rem" }}>
                  <Button variant="outline" onClick={() => { stopCamera(); setStatus("idle"); }}>
                    Return Back
                  </Button>
                  <Button onClick={startCamera}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => { stopCamera(); setStatus("manual"); }}>
                    Manual Override
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
