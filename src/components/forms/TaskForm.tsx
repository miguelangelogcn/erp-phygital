// src/components/forms/TaskForm.tsx
"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Timestamp } from "firebase/firestore";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
import type { Task, NewTask, ChecklistItem } from "@/types/task";
import type { SelectOption } from "@/types/common";

interface TaskFormProps {
  task?: Task | null;
  users: SelectOption[];
  clients: SelectOption[];
  onSave: (data: NewTask | Partial<Task>) => void;
  onCancel: () => void;
  onDelete?: (taskId: string) => void;
  isSubmitting: boolean;
}

type FormValues = Omit<NewTask, 'dueDate' | 'checklist'> & {
    dueDate?: Date | null;
    checklist?: (Omit<ChecklistItem, 'dueDate'> & { dueDate?: Date | null })[];
}

const TaskForm = ({ task, users = [], clients = [], onSave, onCancel, onDelete, isSubmitting }: TaskFormProps) => {
    const { register, control, handleSubmit, watch } = useForm<FormValues>({
        defaultValues: {
            title: task?.title || "",
            description: task?.description || "",
            responsibleId: task?.responsibleId || "",
            assistantIds: task?.assistantIds || [],
            clientId: task?.clientId || "",
            dueDate: task?.dueDate ? task.dueDate.toDate() : null,
            checklist: task?.checklist?.map(item => ({
                ...item,
                dueDate: item.dueDate ? item.dueDate.toDate() : null
            })) || [],
            status: task?.status || 'todo'
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "checklist",
    });

    const onSubmit = (data: FormValues) => {
        const submissionData: NewTask | Partial<Task> = {
            ...data,
            dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
            checklist: data.checklist?.map(item => ({
                ...item,
                id: item.id || crypto.randomUUID(),
                dueDate: item.dueDate ? Timestamp.fromDate(item.dueDate) : null
            }))
        };
        onSave(submissionData);
    };

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
                <Input id="title" {...register("title", { required: true })} placeholder="Título da tarefa" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" {...register("description")} placeholder="Descrição detalhada da tarefa" />
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
                                    {users.map(user => <SelectItem key={user.value} value={user.value}>{user.label}</SelectItem>)}
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
                                options={users}
                                selected={field.value || []}
                                onChange={field.onChange}
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
                                    <SelectItem value="">Nenhum</SelectItem>
                                    {clients.map(client => <SelectItem key={client.value} value={client.value}>{client.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Data de Entrega</Label>
                     <Controller
                        name="dueDate"
                        control={control}
                        render={({ field }) => (
                           <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={field.value ? new Date(field.value) : undefined}
                                        onSelect={field.onChange}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    />
                </div>
            </div>

            <div className="space-y-4">
                 <div>
                    <Label>Checklist</Label>
                     <Button type="button" size="sm" variant="ghost" onClick={() => append({ id: crypto.randomUUID(), text: '', isCompleted: false, responsibleId: '', dueDate: null })}>
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
                                    onCheckedChange={checkField.onChange}
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

export default TaskForm;
