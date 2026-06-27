"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import * as tf from "@tensorflow/tfjs";
import { Button } from "@/components/ui";
import s from "./page.module.css";

// Kiosk Configuration
const KIOSK_BIN_ID = "kiosk-bin-001";
const KIOSK_BIN_NAME = "Main Lobby E-Bin";

// Update this array if the model outputs classes in a different order (e.g. not alphabetical)
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

// Map classes to points (used for generating the QR code)
const POINT_MAP = {
  battery: 5,
  flashlight: 10,
  keyboard: 15,
  laptop: 50,
  mouse: 10,
  pcb: 20,
  phone: 30,
  usb_drive: 5,
  other: 0,
};

// Map classes to estimated weight in kg
const ESTIMATED_WEIGHT_MAP = {
  battery: 0.1,
  flashlight: 0.2,
  keyboard: 0.5,
  laptop: 2.0,
  mouse: 0.1,
  pcb: 0.2,
  phone: 0.2,
  usb_drive: 0.05,
  other: 0,
};

export default function KioskPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("loading_model"); // loading_model, idle, scanning, analyzing, success, error
  const [errorMsg, setErrorMsg] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [itemResult, setItemResult] = useState(null);
  const [model, setModel] = useState(null);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);

  useEffect(() => {
    loadModel();
    return () => {
      stopCamera();
    };
  }, []);

  async function loadModel() {
    try {
      setStatus("loading_model");
      // Load the converted TensorFlow.js model from the public folder
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

  async function runCustomModelClassification(canvas) {
    if (!model) throw new Error("Model is not loaded yet.");

    // Create a tensor from the canvas image
    const tensor = tf.browser.fromPixels(canvas);
    
    // Preprocess: Resize to 224x224, convert to float, normalize if necessary
    // Note: EfficientNet usually requires 224x224 and normalization depending on how it was trained
    const resized = tf.image.resizeBilinear(tensor, [224, 224]);
    
    // The Keras model already contains a 'Rescaling' layer internally!
    // If we divide by 255 here, the image gets double-normalized (turned almost black).
    // We just need to pass the raw [0, 255] pixels directly to the model.
    const batched = resized.expandDims(0); // Shape [1, 224, 224, 3]

    // Run prediction
    const prediction = model.predict(batched);
    
    // Extract data
    const scores = await prediction.data();
    const maxScore = Math.max(...scores);
    const maxIndex = scores.indexOf(maxScore);
    
    // Cleanup tensors to prevent memory leaks!
    tf.dispose([tensor, resized, batched, prediction]);

    const predictedClass = EWASTE_CLASSES[maxIndex] || "other";
    
    return {
      category: predictedClass,
      label: predictedClass.charAt(0).toUpperCase() + predictedClass.slice(1),
      confidence: maxScore,
      suggestedPoints: POINT_MAP[predictedClass] || 10,
      estimatedWeightKg: ESTIMATED_WEIGHT_MAP[predictedClass] || 0.1,
    };
  }

  async function handleScanItem() {
    if (!videoRef.current || !canvasRef.current || !model) return;

    setStatus("analyzing");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Capture frame exactly as it appears
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Simulate loading progress
    setAnalyzeProgress(0);
    for (let i = 10; i <= 90; i += 20) {
      setAnalyzeProgress(i);
      await new Promise(r => setTimeout(r, 250));
    }
    
    try {
      // 1. Classify the item using local TF.js Model
      const classification = await runCustomModelClassification(canvas);
      
      setAnalyzeProgress(100);
      await new Promise(r => setTimeout(r, 200));

      if (classification.category === "other" || classification.confidence < 0.4) {
        setStatus("error");
        setErrorMsg(`Item not recognized as valid e-waste (detected: non e waste). Please try again.`);
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
          estimatedWeightKg: classification.estimatedWeightKg,
        }),
      });

      if (!qrRes.ok) throw new Error("Failed to generate reward token.");

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

  return (
    <div className={s.page}>
      <div className={s.kioskContainer}>
        <div className={s.header}>
          <h1 className={s.title}>eBin Auto-Scanner</h1>
          <p className={s.sub}>Place your item in view and tap Scan</p>
        </div>

        <div className={s.content}>
          {status === "loading_model" && (
            <div className={s.loader}>
              <div className={s.spinner} />
              <span>Loading AI Model locally... (This may take a moment)</span>
            </div>
          )}

          {status === "idle" && (
            <div style={{textAlign: "center", padding: "4rem 1rem"}}>
              <h2 style={{marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "bold"}}>System Ready</h2>
              <p style={{marginBottom: "2rem", color: "#666"}}>Place your item ready, then enable the camera to begin scanning.</p>
              <Button size="lg" onClick={startCamera}>
                Enable Camera
              </Button>
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
                  <div style={{width: '100%', maxWidth: '300px', margin: '0 auto', textAlign: 'center'}}>
                    <div style={{marginBottom: '0.75rem', fontWeight: '500'}}>Analyzing item... {analyzeProgress}%</div>
                    <div style={{width: '100%', height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden'}}>
                      <div style={{width: `${analyzeProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease'}} />
                    </div>
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
                <p className={s.itemPoints}>+{itemResult.suggestedPoints} Points (Confidence: {(itemResult.confidence*100).toFixed(1)}%)</p>
              </div>
              <img src={qrDataUrl} alt="QR Code" className={s.qrImage} />
              <p className={s.instructionText}>
                Scan this QR code using the <strong>eBin App</strong> on your phone to claim your points.
              </p>
              <Button onClick={startCamera} variant="outline" style={{marginTop: 16}}>
                Scan Next Item
              </Button>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
