import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            Bem-vindo ao seu painel!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Login realizado com sucesso.</p>
        </CardContent>
      </Card>
    </div>
  );
}
