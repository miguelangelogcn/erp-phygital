// src/components/modals/EventDetailsModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import type { CalendarEvent, EventChecklistItem } from "@/types/calendarEvent";
import type { SelectOption } from "@/types/common";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CommentSection } from "../comments/CommentSection";

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  users: SelectOption[];
  clients: SelectOption[];
  onChecklistItemChange?: (eventId: string, checklist: EventChecklistItem[]) => void;
}

export const EventDetailsModal = ({ event, isOpen, onClose, onEdit, users, clients, onChecklistItemChange }: EventDetailsModalProps) => {
  if (!event) return null;

  const responsible = users.find(u => u.value === event.responsibleId)?.label;
  const assistants = event.assistantIds?.map(id => users.find(u => u.value === id)?.label).filter(Boolean).join(", ");
  const client = clients.find(c => c.value === event.clientId)?.label;

  const formatDateTime = (timestamp: any) => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return "Data inválida";
    return format(timestamp.toDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };
  
  const startDate = formatDateTime(event.startDateTime);
  const endDate = formatDateTime(event.endDateTime);
  const docPath = `calendarEvents/${event.id}`;

  const handleCheckChange = (index: number, checked: boolean) => {
      if (!onChecklistItemChange || !event.checklist) return;
      const updatedChecklist = [...event.checklist];
      updatedChecklist[index] = { ...updatedChecklist[index], isCompleted: checked };
      onChecklistItemChange(event.id, updatedChecklist);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
           <DialogDescription>
            Detalhes da gravação.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold">Início:</span> {startDate}</div>
            <div><span className="font-semibold">Fim:</span> {endDate}</div>
            <div><span className="font-semibold">Cliente:</span> {client || "N/A"}</div>
            <div><span className="font-semibold">Responsável:</span> {responsible || "N/A"}</div>
            <div className="md:col-span-2"><span className="font-semibold">Auxiliares:</span> {assistants || "Nenhum"}</div>
          </div>

          <Separator className="my-2"/>

           {event.checklist && event.checklist.length > 0 && (
            <>
              <div>
                <h4 className="font-semibold mb-2">Checklist de Preparação</h4>
                <div className="space-y-2">
                  {event.checklist.map((item, index) => (
                    <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                            id={`check-details-${item.id}`}
                            checked={item.isCompleted}
                            onCheckedChange={(checked) => handleCheckChange(index, !!checked)}
                            disabled={!onChecklistItemChange}
                        />
                        <Label htmlFor={`check-details-${item.id}`} className={item.isCompleted ? "line-through text-muted-foreground" : ""}>
                            {item.text}
                        </Label>
                    </div>
                  ))}
                </div>
              </div>
              <Separator className="my-2"/>
            </>
          )}
          
          <div>
            <h4 className="font-semibold text-base mb-2">Roteiros Planeados</h4>
             {event.scripts && event.scripts.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                    {event.scripts.map((script, index) => (
                        <AccordionItem value={`script-${index}`} key={script.id || index}>
                            <AccordionTrigger>{script.title || `Roteiro ${index + 1}`}</AccordionTrigger>
                            <AccordionContent className="space-y-3 text-sm">
                                <p><strong className="text-muted-foreground">Público-alvo:</strong> {script.targetAudience || 'N/D'}</p>
                                <p><strong className="text-muted-foreground">Gancho (Hook):</strong> {script.hook || 'N/D'}</p>
                                <p><strong className="text-muted-foreground">Desenvolvimento:</strong> {script.development || 'N/D'}</p>
                                <p><strong className="text-muted-foreground">CTA:</strong> {script.cta || 'N/D'}</p>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
             ) : (
                <p className="text-sm text-muted-foreground">Nenhum roteiro adicionado a este evento.</p>
             )}
          </div>
          <Separator />
          <CommentSection docPath={docPath} />
        </div>
        <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={onEdit}>Editar Evento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
