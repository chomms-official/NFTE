import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mozziemap.vercel.app"),
  title: "MozzieMap",
  description: "Global Mosquito Outbreak Simulator",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "MozzieMap",
    description: "Global Mosquito Outbreak Simulator",
    url: "https://mozziemap.vercel.app",
    siteName: "MozzieMap",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MozzieMap - Global Mosquito Outbreak Simulator",
      },
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "MozzieMap Minimal Icon",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MozzieMap",
    description: "Global Mosquito Outbreak Simulator",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  themeColor: "#181916",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
