import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarSync — Car Maintenance Tracker",
  description: "Track your car maintenance, get service reminders, and never miss an oil change.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: '#0f0f0f', color: '#f5f5f5' }}>
        {children}
        <Toaster
          toastOptions={{
            style: { background: '#1e1e1e', color: '#f5f5f5', border: '1px solid #2a2a2a' },
          }}
          position="top-center"
        />
      </body>
    </html>
  );
}
