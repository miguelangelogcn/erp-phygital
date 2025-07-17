// src/components/modals/AttachmentViewer.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from 'lucide-react';

interface AttachmentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  fileName: string | null;
}

const isImage = (fileName: string) => /\.(jpe?g|png|gif|webp)$/i.test(fileName);
const isPdf = (fileName: string) => /\.pdf$/i.test(fileName);

export function AttachmentViewer({ isOpen, onClose, fileUrl, fileName }: AttachmentViewerProps) {
  if (!isOpen || !fileUrl || !fileName) {
    return null;
  }

  const renderContent = () => {
    if (isImage(fileName)) {
      return <img src={fileUrl} alt={fileName} className="max-w-full max-h-[70vh] mx-auto object-contain" />;
    }
    if (isPdf(fileName)) {
      return <iframe src={fileUrl} className="w-full h-[80vh]" title={fileName}></iframe>;
    }
    return (
      <div className="text-center p-8 flex flex-col items-center justify-center">
        <p className="mb-4">A pré-visualização não está disponível para este tipo de ficheiro.</p>
        <Button asChild>
          <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
            <Download className="mr-2 h-4 w-4" />
            Descarregar {fileName}
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-auto">
        <DialogHeader>
          <DialogTitle>{fileName}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
