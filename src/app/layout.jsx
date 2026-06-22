import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/styles/globals.css";

export const metadata = {
  title: "eBin — Smart E-Waste Recycling",
  description: "Recycle e-waste at eBin stations and earn reward points.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "eBin",
  },
  icons: {
    apple: [
      { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icon-144.png", sizes: "144x144", type: "image/png" },
    ],
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#16a34a"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="eBin"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png"/>
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png"/>
        <link rel="apple-touch-icon" sizes="144x144" href="/icon-144.png"/>
        <link rel="manifest" href="/manifest.json"/>
      </head>
      <body>
        {/* Apply saved theme before first paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('ebin-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');})();` }}/>
        {/* Register service worker */}
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js');});}` }}/>
        <AuthProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
