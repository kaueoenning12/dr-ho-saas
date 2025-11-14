import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Eye, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { deletePDFFile, uploadPDFFile } from "@/lib/services/documentService";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DocumentPDFManagerProps {
  currentPdfUrl?: string | null;
  onPdfChange: (pdfUrl: string | null) => void;
}

export function DocumentPDFManager({ currentPdfUrl, onPdfChange }: DocumentPDFManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, faça upload de um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "Por favor, faça upload de um arquivo menor que 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    try {
      const { publicUrl } = await uploadPDFFile(selectedFile, user.id);
      onPdfChange(publicUrl);
      setSelectedFile(null);
      toast({
        title: "PDF atualizado com sucesso",
        description: "O documento foi carregado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer upload",
        description: error.message || "Ocorreu um erro ao fazer upload do PDF",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentPdfUrl) return;

    setIsDeleting(true);
    try {
      await deletePDFFile(currentPdfUrl);
      onPdfChange(null);
      setShowDeleteConfirm(false);
      toast({
        title: "PDF removido com sucesso",
        description: "O documento foi removido do storage.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover PDF",
        description: error.message || "Ocorreu um erro ao remover o PDF",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm">Documento PDF</Label>

      {/* Current PDF Viewer */}
      {currentPdfUrl && !selectedFile && (
        <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
          <div className="p-3 bg-muted/50 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan" />
              <span className="text-sm font-medium text-foreground">PDF Atual</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => window.open(currentPdfUrl, "_blank")}
                className="h-8"
              >
                <Eye className="h-4 w-4 mr-1" />
                Visualizar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="h-8 text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="h-64 overflow-hidden">
            <iframe
              src={`${currentPdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="w-full h-full border-0"
              title="PDF Preview"
            />
          </div>
        </div>
      )}

      {/* No PDF indicator */}
      {!currentPdfUrl && !selectedFile && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/20">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-2">Nenhum PDF anexado</p>
          <p className="text-xs text-muted-foreground">Faça upload de um arquivo PDF</p>
        </div>
      )}

      {/* Selected file preview */}
      {selectedFile && (
        <div className="border border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan" />
              <div>
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fazendo upload...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Fazer upload do PDF
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload area */}
      {!selectedFile && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive
              ? "border-cyan bg-cyan/5"
              : "border-border hover:border-cyan/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            className="hidden"
          />
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-foreground mb-1">
              Arraste um arquivo PDF aqui ou{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-cyan hover:underline"
              >
                clique para selecionar
              </button>
            </p>
            <p className="text-xs text-muted-foreground">
              Máximo 10MB • Apenas arquivos PDF
            </p>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover PDF</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o PDF atual? Esta ação não pode ser desfeita e o arquivo será permanentemente deletado do storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

