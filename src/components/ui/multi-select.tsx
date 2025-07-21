// src/components/ui/multi-select.tsx
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export type OptionType = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Selecione opções...",
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const handleRemove = (value: string) => {
    onChange(selected.filter((v) => v !== value));
  };
  
  const selectedLabels = selected.map(
      (value) => options.find((option) => option.value === value)?.label
  ).filter(Boolean);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto", className)}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {selectedLabels.length > 0 ? (
                selectedLabels.map((label, index) => (
                    <Badge
                        key={selected[index]}
                        variant="secondary"
                        className="mr-1 mb-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(selected[index])
                        }}
                    >
                        {label}
                        <X className="ml-1 h-3 w-3" />
                    </Badge>
                ))
            ) : (
                <span className="text-muted-foreground">{placeholder}</span>
            )}
           </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Procurar..." />
           <CommandList>
                <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                <CommandGroup>
                {options.length === 0 && disabled ? (
                    <CommandItem disabled>A carregar...</CommandItem>
                ) : (
                    options.map((option) => (
                        <CommandItem
                        key={option.value}
                        onSelect={() => handleSelect(option.value)}
                        >
                        <Check
                            className={cn(
                            "mr-2 h-4 w-4",
                            selected.includes(option.value) ? "opacity-100" : "opacity-0"
                            )}
                        />
                        {option.label}
                        </CommandItem>
                    ))
                )}
                </CommandGroup>
            </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect };
