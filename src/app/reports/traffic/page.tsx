// src/app/reports/traffic/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { getClients } from "@/lib/firebase/services/clients";
import { getMetaCampaigns } from "@/lib/firebase/services/metaReports";

import type { Client } from "@/types/client";
import type { MetaCampaign } from "@/types/metaCampaign";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Loader2, ArrowLeft, AlertCircle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};


export default function TrafficReportsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [errorReport, setErrorReport] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    const fetchClientsData = async () => {
      try {
        setLoadingClients(true);
        const clientsData = await getClients();
        setClients(clientsData);
      } catch (error) {
        console.error("Error fetching clients:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar clientes",
        });
      } finally {
        setLoadingClients(false);
      }
    };
    fetchClientsData();
  }, [toast]);

  const handleGenerateReport = async () => {
    if (!selectedClientId) {
      toast({
        variant: "destructive",
        title: "Filtro incompleto",
        description: "Por favor, selecione um cliente.",
      });
      return;
    }
    setLoadingReport(true);
    setErrorReport(null);
    try {
      // Nota: A lógica de filtragem por data não é aplicada aqui pois
      // os dados sincronizados não incluem timestamps por dia.
      // O relatório exibirá todas as campanhas sincronizadas para o cliente.
      const campaignsData = await getMetaCampaigns(selectedClientId);
      setCampaigns(campaignsData);
    } catch (err: any) {
      setErrorReport("Falha ao buscar dados das campanhas.");
      toast({
        variant: "destructive",
        title: "Erro ao gerar relatório",
        description: err.message,
      });
    } finally {
      setLoadingReport(false);
    }
  };
  
  const chartData = campaigns.map(c => ({
      name: c.name.substring(0, 15) + (c.name.length > 15 ? '...' : ''), // Shorten name for chart
      spend: c.spend,
  }));
  
  const chartConfig = {
    spend: {
      label: 'Gasto (R$)',
      color: 'hsl(var(--chart-1))',
    },
  };
  
  const renderReportContent = () => {
    if (loadingReport) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      );
    }

    if (errorReport) {
      return (
        <div className="text-center text-destructive py-10 flex flex-col items-center gap-2">
          <AlertCircle />
          <p>{errorReport}</p>
        </div>
      );
    }

    if (campaigns.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-10">
          <p>Nenhuma campanha sincronizada encontrada para este cliente ou período.</p>
          <p className="text-sm mt-2">Selecione um cliente e clique em "Gerar Relatório".</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral do Gasto</CardTitle>
            <CardDescription>Gasto total por campanha no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                    cursor={false}
                    content={<ChartTooltipContent 
                        formatter={(value) => formatCurrency(value as number)}
                        hideLabel 
                    />} 
                />
                <Bar dataKey="spend" fill="var(--color-spend)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes das Campanhas</CardTitle>
            <CardDescription>
              Uma lista detalhada de todas as campanhas sincronizadas da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell><Badge variant={campaign.status === 'ACTIVE' ? 'secondary' : 'outline'}>{campaign.status}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(campaign.spend)}</TableCell>
                      <TableCell className="text-right">{campaign.impressions.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">{campaign.clicks.toLocaleString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
              {loadingClients ? (
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
                <Label htmlFor="period">Período (Opcional)</Label>
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
            
            <Button onClick={handleGenerateReport} disabled={loadingReport || loadingClients}>
                {loadingReport && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {renderReportContent()}
    </main>
  );
}
