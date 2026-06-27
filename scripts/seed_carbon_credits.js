import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc } from "firebase/firestore";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8").split("\n").reduce((acc, line) => {
  const [key, ...val] = line.split("=");
  if (key && val) acc[key.trim()] = val.join("=").trim();
  return acc;
}, {});

process.env = { ...process.env, ...env };

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CARBON_CREDITS = [
  // User's list
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
  { id: "battery", label: "Battery", points: 90, weightKg: 0.1 },
  
  // AI Model Classes (Defaults)
  { id: "flashlight", label: "Flashlight", points: 30, weightKg: 0.2 },
  { id: "keyboard", label: "Keyboard", points: 45, weightKg: 0.5 },
  { id: "laptop", label: "Laptop", points: 150, weightKg: 2.0 },
  { id: "mouse", label: "Mouse", points: 30, weightKg: 0.1 },
  { id: "pcb", label: "PCB", points: 50, weightKg: 0.2 },
  { id: "phone", label: "Phone", points: 100, weightKg: 0.2 },
  { id: "usb_drive", label: "USB Drive", points: 25, weightKg: 0.05 },
];

async function seed() {
  const batch = writeBatch(db);
  const creditsRef = collection(db, "carbon_credits");
  
  for (const item of CARBON_CREDITS) {
    const docRef = doc(creditsRef, item.id);
    batch.set(docRef, item);
  }
  
  await batch.commit();
  console.log("Successfully seeded carbon_credits collection!");
  process.exit(0);
}

seed().catch(console.error);
