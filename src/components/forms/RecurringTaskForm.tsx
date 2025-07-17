// src/components/forms/RecurringTaskForm.tsx
"use client";

import React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import type { RecurringTask, NewRecurringTask, DayOfWeekNumber, RecurringChecklistItem } from "@/types/recurringTask";
import type { SelectOption } from "@/types/common";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Separator } from "../ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecurringTaskFormProps {
  task?: RecurringTask | null;
  users: SelectOption[];
  clients: SelectOption[];
  onSave: (data: NewRecurringTask | Partial<RecurringTask>) => void;
  onCancel: () => void;
  onDelete?: (taskId: string) => void;
  onChecklistItemChange?: (taskId: string, checklist: RecurringChecklistItem[]) => void;
  isSubmitting: boolean;
}

const dayOptions: { value: DayOfWeekNumber; label: string }[] = [
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' },
];

const RecurringTaskForm = ({ task, users = [], clients = [], onSave, onCancel, onDelete, onChecklistItemChange, isSubmitting }: RecurringTaskFormProps) => {
    const { register, control, handleSubmit, getValues } = useForm<NewRecurringTask>({
        defaultValues: {
            title: task?.title || "",
            description: task?.description || "",
            responsibleId: task?.responsibleId || "",
            assistantIds: task?.assistantIds || [],
            clientId: task?.clientId || "",
            dayOfWeek: task?.dayOfWeek || 1,
            isCompleted: task?.isCompleted || false,
            checklist: task?.checklist || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "checklist",
    });

    const onSubmit = (data: NewRecurringTask) => {
        const submissionData: NewRecurringTask | Partial<RecurringTask> = {
            ...data,
            assistantIds: Array.isArray(data.assistantIds) ? data.assistantIds : [],
            checklist: data.checklist?.map(item => ({
                ...item,
                id: item.id || crypto.randomUUID(),
                isCompleted: item.isCompleted || false,
            }))
        };
        if (task && task.id) {
            (submissionData as Partial<RecurringTask>).id = task.id;
        }

        if (task?.approvalStatus === 'rejected') {
            (submissionData as Partial<RecurringTask>).approvalStatus = 'pending';
        }
        
        onSave(submissionData);
    };

    const handleCheckboxChange = (index: number, checked: boolean) => {
        if (!task || !onChecklistItemChange) return;
        const currentChecklist = getValues("checklist") || [];
        const updatedChecklist = [...currentChecklist];
        updatedChecklist[index].isCompleted = checked;
        onChecklistItemChange(task.id, updatedChecklist);
    }
    
    // Ensure rejectionFeedback is an array and sort by date, most recent first
    const sortedFeedback = React.useMemo(() => {
        if (!task?.rejectionFeedback) {
            return [];
        }
        const feedbackArray = Array.isArray(task.rejectionFeedback)
            ? task.rejectionFeedback
            : [task.rejectionFeedback];

        return feedbackArray.slice().sort((a, b) => 
            b.rejectedAt.toDate().getTime() - a.rejectedAt.toDate().getTime()
        );
    }, [task?.rejectionFeedback]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-4">

            {onDelete && task && (
                 <div className="flex justify-end">
                    <Button type="button" variant="destructive" size="sm" onClick={() => onDelete(task.id)} disabled={isSubmitting}>
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir Tarefa
                    </Button>
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" {...register("title", { required: true })} placeholder="Título da tarefa recorrente" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" {...register("description")} placeholder="Descrição detalhada" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Controller
                        name="responsibleId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
                                <SelectContent>
                                    {users.filter(u => u.value).map(user => <SelectItem key={user.value} value={user.value}>{user.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Assistentes</Label>
                    <Controller
                        name="assistantIds"
                        control={control}
                        render={({ field }) => (
                            <MultiSelect
                                options={users.filter(u => u.value)}
                                selected={field.value || []}
                                onChange={field.onChange as any}
                                placeholder="Selecione assistentes"
                            />
                        )}
                    />
                </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Cliente</Label>
                     <Controller
                        name="clientId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger><SelectValue placeholder="Selecione um cliente (opcional)" /></SelectTrigger>
                                <SelectContent>
                                     {clients.filter(c => c.value).map(client => <SelectItem key={client.value} value={client.value}>{client.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Dia da Semana</Label>
                     <Controller
                        name="dayOfWeek"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                            <Select 
                                onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                                defaultValue={String(field.value)}
                            >
                                <SelectTrigger><SelectValue placeholder="Selecione o dia" /></SelectTrigger>
                                <SelectContent>
                                    {dayOptions.map(day => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
            </div>

            <div className="space-y-4">
                 <div>
                    <Label>Checklist</Label>
                     <Button type="button" size="sm" variant="ghost" onClick={() => append({ id: crypto.randomUUID(), text: '', isCompleted: false })}>
                         <Plus className="mr-2 h-4 w-4" /> Adicionar item
                    </Button>
                 </div>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 p-2 border rounded-md">
                        <Controller
                            name={`checklist.${index}.isCompleted`}
                            control={control}
                            render={({ field: checkField }) => (
                                <Checkbox
                                    checked={checkField.value}
                                    onCheckedChange={(checked) => handleCheckboxChange(index, !!checked)}
                                />
                            )}
                        />
                        <Input {...register(`checklist.${index}.text`)} placeholder="Descrição da subtarefa" className="flex-grow" />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            {task?.approvalStatus === 'rejected' && sortedFeedback && sortedFeedback.length > 0 && (
                <>
                <Separator />
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Histórico de Feedback</h3>
                     <Accordion type="single" collapsible className="w-full">
                        {sortedFeedback.map((feedbackItem, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger>
                                    Feedback de {format(feedbackItem.rejectedAt.toDate(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Alert variant="destructive" className="mb-6">
                                        <AlertDescription className="space-y-4">
                                            <div>
                                                <p className="text-sm font-semibold">Observações:</p>
                                                <p className="text-sm">{feedbackItem.notes}</p>
                                            </div>
                                            {feedbackItem.files && feedbackItem.files.length > 0 && (
                                                <div>
                                                    <p className="text-sm font-semibold">Ficheiros:</p>
                                                    <ul className="list-disc list-inside">
                                                        {feedbackItem.files.map((file, fileIndex) => (
                                                            <li key={fileIndex}>
                                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1 text-sm">
                                                                    <FileText className="h-4 w-4" /> {file.name}
                                                                </a>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {feedbackItem.audioUrl && (
                                                <div>
                                                    <p className="text-sm font-semibold">Áudio:</p>
                                                    <audio controls src={feedbackItem.audioUrl} className="w-full mt-1">
                                                        O seu navegador não suporta o elemento de áudio.
                                                    </audio>
                                                </div>
                                            )}
                                        </AlertDescription>
                                    </Alert>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
                </>
            )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Tarefa'}
            </Button>
        </div>
    </form>
  );
};

export default RecurringTaskForm;
