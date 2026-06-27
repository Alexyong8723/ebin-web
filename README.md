# eBin - Smart E-Waste Recycling System ♻️

eBin is a comprehensive, AI-powered smart recycling platform designed to encourage and track electronic waste (e-waste) recycling. It rewards users with "Carbon Credits" for disposing of their e-waste properly and provides an administrative portal for managing recycling bins, users, and rewards.

## Features ✨

### For Users
* **Dashboard:** Track personal recycling history, view total carbon credits, and monitor top drop-off categories.
* **Smart Kiosk (AI Scanner):** Use a web-based camera kiosk powered by a local TensorFlow.js AI model to automatically classify e-waste (e.g., Laptops, Phones, Keyboards, Batteries).
* **QR Code Redemption:** The kiosk generates a secure, single-use QR code for accepted items. Users scan this with their phone to instantly claim their Carbon Credits.
* **Rewards Store:** Redeem accumulated carbon credits for vouchers and real-world rewards.
* **Interactive Map:** Find the nearest eBin locations and check their current capacity.

### For Administrators
* **Admin Dashboard:** Overview of system health, active eBins, recent drop-offs, and user growth.
* **eBin Management:** Manage physical bin locations, monitor their real-time capacity (tracked via points), and manually override capacities or send collector alerts when bins are full.
* **User & Rewards Management:** Manage the user base and update the rewards catalog.
* **Manual Classification Override:** Admins can manually select items at the kiosk if the AI fails to recognize a rare piece of e-waste.

## Tech Stack 🛠️

* **Framework:** [Next.js](https://nextjs.org/) (React)
* **Styling:** Vanilla CSS Modules with a modern, dynamic, and responsive glassmorphism aesthetic.
* **Database & Auth:** [Firebase](https://firebase.google.com/) (Firestore & Firebase Authentication)
* **AI Model:** [TensorFlow.js](https://www.tensorflow.org/js) (Runs completely in the browser for privacy and speed)
* **QR Generation:** `qrcode` library

## Running Locally 🚀

### 1. Clone the repository
```bash
git clone https://github.com/Alexyong8723/ebin-web.git
cd ebin-web
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
To connect the app to Firebase, you must create a `.env.local` file in the root of the project. 

**Note: `.env.local` is ignored by Git, so your secrets are safe and will never be pushed to GitHub.**

Create the file and add your Firebase config keys:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Deploying to Production 🌍

This project is optimized for deployment on [Vercel](https://vercel.com).
1. Import your GitHub repository into Vercel.
2. In the Vercel deployment settings, go to **Environment Variables** and add all the keys from your `.env.local` file.
3. Click **Deploy**.
4. The TensorFlow.js AI model (located in the `public/model_web` directory) will be automatically served via Vercel's global CDN, allowing the Smart Kiosk scanner to work instantly worldwide without any extra configuration.
