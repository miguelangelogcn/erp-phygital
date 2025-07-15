import AuthGuard from "@/components/auth/AuthGuard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - ERP Phygital",
  description: "Painel de controle do ERP Phygital",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
