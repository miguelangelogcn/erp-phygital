
import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayoutComponent from "@/components/layout/DashboardLayout";
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Dashboard - ERP Phygital",
  description: "Painel de controle do ERP Phygital",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AuthProvider>
        <DashboardLayoutComponent>{children}</DashboardLayoutComponent>
      </AuthProvider>
    </AuthGuard>
  );
}
