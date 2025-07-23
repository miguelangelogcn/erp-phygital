// src/components/modals/TaskDetailsModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import type { Task } from "@/types/task";
import type { SelectOption } from "@/types/common";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  users: SelectOption[];
  clients: SelectOption[];
}

const TaskDetailsModal = ({ task, isOpen, onClose, onEdit, users, clients }: TaskDetailsModalProps) => {
  if (!task) return null;

  const responsible = users.find(u => u.value === task.responsibleId)?.label;
  const assistants = task.assistantIds?.map(id => users.find(u => u.value === id)?.label).filter(Boolean).join(", ");
  const client = clients.find(c => c.value === task.clientId)?.label;
  const dueDate = task.dueDate ? format(task.dueDate.toDate(), "PPP", { locale: ptBR }) : "Não definida";
  
  const statusMap: Record<string, string> = {
    todo: 'A Fazer',
    doing: 'Fazendo',
    done: 'Concluído'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <div className="text-sm text-muted-foreground">
             Detalhes da tarefa. Status:{" "}
            <Badge variant="secondary">{statusMap[task.status] || task.status}</Badge>
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="font-semibold">Responsável:</span> {responsible || "N/A"}</div>
            <div><span className="font-semibold">Cliente:</span> {client || "N/A"}</div>
            <div><span className="font-semibold">Data de Entrega:</span> {dueDate}</div>
            <div><span className="font-semibold">Assistentes:</span> {assistants || "N/A"}</div>
          </div>
          {task.checklist && task.checklist.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Checklist</h4>
                <div className="space-y-2">
                  {task.checklist.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <Checkbox id={`check-readonly-${index}`} checked={item.isCompleted} disabled />
                        <Label htmlFor={`check-readonly-${index}`} className={item.isCompleted ? "line-through text-muted-foreground" : ""}>
                            {item.text}
                        </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={onEdit}>Editar Tarefa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetailsModal;
