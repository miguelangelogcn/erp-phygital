// src/app/reports/traffic/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { getClients } from "@/lib/firebase/services/clients";
import type { Client } from "@/types/client";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function TrafficReportsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    const fetchClientsData = async () => {
      try {
        setLoading(true);
        const clientsData = await getClients();
        setClients(clientsData);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar clientes",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchClientsData();
  }, [toast]);

  const handleGenerateReport = () => {
    if (!selectedClientId || !dateRange) {
        toast({
            variant: "destructive",
            title: "Filtros incompletos",
            description: "Por favor, selecione um cliente e um período.",
        });
        return;
    }
    // Lógica para buscar e exibir os dados do relatório virá aqui
    console.log("Gerando relatório para:", { selectedClientId, dateRange });
  };


  return (
    <main className="p-4 md:p-6 space-y-6">
       <div className="flex justify-between items-center">
         <div>
            <h1 className="text-3xl font-bold">Relatórios de Tráfego</h1>
            <p className="text-muted-foreground">Analise o desempenho das campanhas da Meta.</p>
         </div>
         <Button variant="outline" asChild>
          <Link href="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione o cliente e o período para gerar o relatório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              {loading ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>A carregar clientes...</span>
                </div>
              ) : (
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="period">Período</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "LLL dd, y", { locale: ptBR })}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y", { locale: ptBR })
                        )
                        ) : (
                        <span>Selecione um intervalo</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                        locale={ptBR}
                    />
                    </PopoverContent>
                </Popover>
            </div>
            
            <Button onClick={handleGenerateReport}>
                Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader>
            <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground">Selecione um cliente e um período para ver os relatórios.</p>
        </CardContent>
       </Card>
    </main>
  );
}
