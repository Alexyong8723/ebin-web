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
              <div className={s.successIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h2 className={s.successTitle}>+{result.points} Points Earned!</h2>
              <p className={s.successBin}>{result.binName}</p>
              {result.label && <p className={s.successLabel}>{result.label}</p>}
              <p className={s.successMsg}>Points have been added to your account.</p>
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
