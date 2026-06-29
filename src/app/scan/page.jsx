"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { redeemQrToken } from "@/lib/firestore";
import UserLayout from "@/components/layout/UserLayout";
import { Button, Spinner } from "@/components/ui";
import jsQR from "jsqr";
import s from "./page.module.css";

const STATE = { IDLE:"idle", SCANNING:"scanning", SUCCESS:"success", ERROR:"error" };

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
  const data = ITEM_DATA[label];
  if (data) {
    return {
      material: (data.material * 0.5),
      carbon: (data.carbon * 0.3),
      processing: (data.processing * 0.2)
    };
  }
  // Fallback if item not found
  return {
    material: (totalPoints * 0.5),
    carbon: (totalPoints * 0.3),
    processing: (totalPoints * 0.2)
  };
}

export default function ScanPage() {
  const { user, setProfile } = useAuth();
  const router = useRouter();
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);

  const [status, setStatus]   = useState(STATE.IDLE);
  const [message, setMessage] = useState("");
  const [result, setResult]   = useState(null);  // { points, binName, label }
  const [camErr, setCamErr]   = useState("");

  // clean up camera on unmount
  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setCamErr(""); setMessage(""); setStatus(STATE.SCANNING);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal:"environment" }, width:{ ideal:1280 }, height:{ ideal:720 } }
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      scanLoop();
    } catch (err) {
      setStatus(STATE.IDLE);
      if (err.name === "NotAllowedError") setCamErr("Camera access denied. Please allow camera permission and try again.");
      else setCamErr("Could not access camera. Make sure no other app is using it.");
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t=>t.stop());
    streamRef.current = null;
  }

  function scanLoop() {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts:"dontInvert" });
      if (code) {
        stopCamera();
        handleToken(code.data);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }

  async function handleToken(token) {
    setStatus(STATE.SCANNING); // keep camera hidden, show spinner
    if (!token.startsWith("QR-")) {
      setStatus(STATE.ERROR);
      setMessage("This QR code is not a valid eBin points code.");
      return;
    }
    try {
      const res = await redeemQrToken(token, user.uid);
      setResult(res);
      setStatus(STATE.SUCCESS);
      // update profile points in context so sidebar updates without reload
      setProfile(p => p ? { ...p, pointsTotal: (p.pointsTotal||0) + res.points } : p);
    } catch (err) {
      setStatus(STATE.ERROR);
      setMessage(err.message || "Redemption failed. Please try again.");
    }
  }

  function reset() {
    setStatus(STATE.IDLE);
    setMessage("");
    setResult(null);
    setCamErr("");
  }

  return (
    <UserLayout>
      <div className={s.page}>
        <div className={s.header}>
          <h1 className={s.title}>Scan QR Code</h1>
          <p className={s.sub}>Point your camera at an eBin QR code to earn points</p>
        </div>

        <div className={s.card}>
          {/* IDLE */}
          {status === STATE.IDLE && (
            <div className={s.idleState}>
              <div className={s.qrIcon}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                  <path d="M14 14h.01M14 18h.01M18 14h.01M18 18h.01"/>
                </svg>
              </div>
              {camErr && <p className={s.camErr}>{camErr}</p>}
              <Button onClick={startCamera} size="lg">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Open Camera
              </Button>
              <p className={s.hint}>Camera access is required to scan the QR code</p>
            </div>
          )}

          {/* SCANNING */}
          {status === STATE.SCANNING && (
            <div className={s.scanState}>
              <div className={s.videoWrap}>
                <video ref={videoRef} className={s.video} playsInline muted/>
                <div className={s.scanOverlay}>
                  <div className={s.scanFrame}/>
                </div>
              </div>
              <canvas ref={canvasRef} className={s.hiddenCanvas}/>
              <p className={s.scanHint}>Align the QR code within the frame</p>
              <Button variant="ghost" onClick={()=>{ stopCamera(); reset(); }}>Cancel</Button>
            </div>
          )}

          {/* SUCCESS */}
          {status === STATE.SUCCESS && result && (
            <div className={s.successState}>
              <div className={s.receiptCard}>
                <div className={s.receiptHeader}>
                  <h2 className={s.receiptTitle}>Points: {Math.round(result.points)}</h2>
                  <svg className={s.starIcon} width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                
                {(() => {
                  const bd = getBreakdown(result.label, result.points);
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



                <div className={s.receiptFooter}>
                  <svg className={s.recycleIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 19H4.815a1.83 1.83 0 01-1.57-.881 1.785 1.785 0 01-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 001.556-.89 1.784 1.784 0 000-1.777l-3.922-6.83"/><path d="M14 16l-3 3 3 3"/><path d="M4 8l3-3 3 3"/><path d="M12.5 3h-4"/><path d="M18.5 7h4"/>
                  </svg>
                  <span>Thank you for recycling!</span>
                </div>
              </div>

              {result.label && <p className={s.successLabel}>{result.label}</p>}
              <p className={s.successMsg}>Points have been added to your account from {result.binName}.</p>
              
              <div className={s.successBtns}>
                <Button onClick={reset}>Scan Another</Button>
                <Button variant="ghost" onClick={()=>router.push("/dashboard")}>Go to Dashboard</Button>
              </div>
            </div>
          )}

          {/* ERROR */}
          {status === STATE.ERROR && (
            <div className={s.errorState}>
              <div className={s.errorIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h2 className={s.errorTitle}>Redemption Failed</h2>
              <p className={s.errorMsg}>{message}</p>
              <Button onClick={reset}>Try Again</Button>
            </div>
          )}
        </div>

        {/* hidden canvas always mounted for scan loop */}
        {status !== STATE.SCANNING && <canvas ref={canvasRef} className={s.hiddenCanvas}/>}
      </div>
    </UserLayout>
  );
}
