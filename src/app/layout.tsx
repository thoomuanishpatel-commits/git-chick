import type { Metadata } from "next";
import { Space_Grotesk, Inter, Space_Mono } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResQAI – Intelligent Disaster Response Platform",
  description: "Autonomous disaster response command center and real-time tactical coordinator.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#06b6d4" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                try {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for (var r of registrations) {
                        r.unregister();
                      }
                    });
                  }
                  if ('caches' in window) {
                    caches.keys().then(function(names) {
                      for (var name of names) {
                        caches.delete(name);
                      }
                    });
                  }
                } catch (e) {}
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 antialiased select-none">
        {children}
      </body>
    </html>
  );
}
