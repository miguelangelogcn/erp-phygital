import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayoutComponent from "@/components/layout/DashboardLayout";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Dashboard - ERP Phygital",
  description: "Painel de controle do ERP Phygital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet"></link>
      </head>
      <body className="font-body antialiased">
        <AuthGuard>
          <AuthProvider>
            <DashboardLayoutComponent>{children}</DashboardLayoutComponent>
          </AuthProvider>
        </AuthGuard>
        <Toaster />
      </body>
    </html>
  );
}
