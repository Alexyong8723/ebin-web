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
  "keyboard",
  "microwave",
  "mobile",
  "mouse",
  "pcb",
  "player",
  "printer",
  "television",
  "washing machine",
];

// Map classes to points (used for generating the QR code)
const POINT_MAP = {
  battery: 15,
  keyboard: 10,
  microwave: 40,
  mobile: 25,
  mouse: 8,
  pcb: 20,
  player: 15,
  printer: 40,
  television: 45,
  "washing machine": 50,
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
      startCamera();
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
    
    // Normalize based on standard ImageNet/EfficientNet preprocessing if required by your model
    // Assuming standard [0, 255] -> [0, 1] normalization here. Update if your model needs [-1, 1] or mean subtraction.
    const normalized = resized.div(255.0);
    const batched = normalized.expandDims(0); // Shape [1, 224, 224, 3]

    // Run prediction
    const prediction = model.predict(batched);
    
    // Extract data
    const scores = await prediction.data();
    const maxScore = Math.max(...scores);
    const maxIndex = scores.indexOf(maxScore);
    
    // Cleanup tensors to prevent memory leaks!
    tf.dispose([tensor, resized, normalized, batched, prediction]);

    const predictedClass = EWASTE_CLASSES[maxIndex] || "other";
    
    return {
      category: predictedClass,
      label: predictedClass.charAt(0).toUpperCase() + predictedClass.slice(1),
      confidence: maxScore,
      suggestedPoints: POINT_MAP[predictedClass] || 10,
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
    
    try {
      // 1. Classify the item using local TF.js Model
      const classification = await runCustomModelClassification(canvas);

      if (classification.category === "other" || classification.confidence < 0.4) {
        setStatus("error");
        setErrorMsg(`Item not recognized as valid e-waste (detected: ${classification.category}). Please try again.`);
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
                    <span>Analyzing...</span>
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
              <Button onClick={startCamera} style={{marginTop: 16}}>Try Again</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
