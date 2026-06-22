"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui";
import s from "./page.module.css";

// Kiosk Configuration (in a real app, this might come from env or admin settings)
const KIOSK_BIN_ID = "kiosk-bin-001";
const KIOSK_BIN_NAME = "Main Lobby E-Bin";

export default function KioskPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle, scanning, analyzing, success, error
  const [errorMsg, setErrorMsg] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [itemResult, setItemResult] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setStatus("scanning");
    setErrorMsg("");
    setQrDataUrl("");
    setItemResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
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

  // This is the framework function for classification.
  // Currently, it calls the cloud API, but you can replace the logic inside
  // to run your custom local model (e.g., TensorFlow.js) in the future.
  async function runCustomModelClassification(base64Image) {
    // TODO: Replace this API call with your custom model inference logic
    const res = await fetch("/api/classify-waste", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64Image, mimeType: "image/jpeg" }),
    });

    if (!res.ok) {
      throw new Error("Classification failed");
    }

    return await res.json();
  }

  async function handleScanItem() {
    if (!videoRef.current || !canvasRef.current) return;

    setStatus("analyzing");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Capture frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get Base64 image
    const base64DataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const base64Image = base64DataUrl.split(",")[1]; // Remove data:image/jpeg;base64, prefix

    try {
      // 1. Classify the item using your model framework
      const classification = await runCustomModelClassification(base64Image);

      if (classification.category === "other" || classification.confidence < 0.4) {
        setStatus("error");
        setErrorMsg("Item not recognized as e-waste. Please try again.");
        return;
      }

      setItemResult(classification);

      // 2. Generate secure QR token for points redemption
      const qrRes = await fetch("/api/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          binId: KIOSK_BIN_ID,
          binName: KIOSK_BIN_NAME,
          points: classification.suggestedPoints,
          label: classification.label,
        }),
      });

      if (!qrRes.ok) {
        throw new Error("Failed to generate reward token.");
      }

      const { token } = await qrRes.json();

      // 3. Render QR Code visually
      const qrImage = await QRCode.toDataURL(token, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
      });

      setQrDataUrl(qrImage);
      setStatus("success");
      stopCamera();

    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "An error occurred during analysis.");
    }
  }

  function handleReset() {
    startCamera();
  }

  return (
    <div className={s.page}>
      <div className={s.kioskContainer}>
        <div className={s.header}>
          <h1 className={s.title}>eBin Auto-Scanner</h1>
          <p className={s.sub}>Place your item in view and tap Scan</p>
        </div>

        <div className={s.content}>
          {(status === "idle" || status === "scanning" || status === "analyzing") && (
            <>
              <div className={s.videoWrap}>
                <video ref={videoRef} className={s.video} playsInline muted />
                <div className={s.scanOverlay} />
              </div>
              <canvas ref={canvasRef} className={s.hiddenCanvas} />
              
              <div className={s.controls}>
                {status === "analyzing" ? (
                  <div className={s.loader}>
                    <div className={s.spinner} />
                    <span>Analyzing via Model...</span>
                  </div>
                ) : (
                  <Button size="lg" onClick={handleScanItem}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 8}}>
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    Classify Item
                  </Button>
                )}
              </div>
            </>
          )}

          {status === "success" && itemResult && qrDataUrl && (
            <div className={s.qrContainer}>
              <h2 className={s.successText}>Item Accepted!</h2>
              <div className={s.itemDetails}>
                <p className={s.itemLabel}>{itemResult.label}</p>
                <p className={s.itemPoints}>+{itemResult.suggestedPoints} Points</p>
              </div>
              <img src={qrDataUrl} alt="QR Code" className={s.qrImage} />
              <p className={s.instructionText}>
                Scan this QR code using the <strong>eBin App</strong> on your phone to claim your points.
              </p>
              <Button onClick={handleReset} variant="outline" style={{marginTop: 16}}>
                Scan Next Item
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className={s.qrContainer}>
              <div className={s.error}>{errorMsg}</div>
              <Button onClick={handleReset} style={{marginTop: 16}}>Try Again</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
