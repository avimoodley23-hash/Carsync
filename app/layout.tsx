import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" style={{ background: '#F5F5F0', color: '#111111' }}>
        {children}
        <Toaster
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#111111',
              border: '1px solid #E5E5E0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
              borderRadius: '16px',
            },
          }}
          position="top-center"
        />
      </body>
    </html>
  );
}
