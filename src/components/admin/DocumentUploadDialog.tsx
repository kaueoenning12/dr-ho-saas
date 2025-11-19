import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, Loader2, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DOCUMENT_CATEGORIES, MAX_FILE_SIZE } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useCreateDocument } from "@/hooks/useDocumentsQuery";
import { uploadFolderStructure } from "@/lib/services/folderUploadService";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadWithFetchDirect, setupRequestInterception } from "@/lib/services/storageUploadHelper";
import { useEffect } from "react";


const formSchema = z.object({
  title: z.string().optional(),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres"),
  category: z.string().min(1, "Por favor selecione uma categoria"),
  keywords: z.string().min(1, "Adicione pelo menos uma palavra-chave"),
  isPublished: z.boolean().default(true),
  isPremium: z.boolean().default(false),
  previewImageUrl: z.string().url("Deve ser uma URL válida").optional().or(z.literal("")),
}).refine((data) => {
  // Title is required only for single file upload
  return true; // We'll handle validation in the component
}, {
  message: "Título é obrigatório para upload de arquivo único",
  path: ["title"],
});

type FormData = z.infer<typeof formSchema>;

interface DocumentUploadDialogProps {
  onSuccess?: () => void;
}

export function DocumentUploadDialog({ onSuccess }: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false);
  
  // Configurar interceptação de requisições para debug
  useEffect(() => {
    if (import.meta.env.DEV) {
      setupRequestInterception();
    }
  }, []);
  const [uploadType, setUploadType] = useState<"file" | "folder">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const createDocument = useCreateDocument();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      keywords: "",
      isPublished: true,
      isPremium: false,
      previewImageUrl: "",
    },
  });
  
  const resetForm = () => {
    form.reset();
    setSelectedFile(null);
    setSelectedFiles(null);
    setUploadType("file");
  };

  const handleFileSelect = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: `Por favor, faça upload de um arquivo menor que ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFolderSelect = (files: FileList) => {
    if (files.length === 0) {
      toast({
        title: "Pasta vazia",
        description: "A pasta selecionada está vazia",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(files);
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

    if (e.dataTransfer.files) {
      if (uploadType === "folder") {
        handleFolderSelect(e.dataTransfer.files);
      } else {
        if (e.dataTransfer.files[0]) {
          handleFileSelect(e.dataTransfer.files[0]);
        }
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    // Validate based on upload type
    if (uploadType === "file") {
      if (!selectedFile) {
        toast({
          title: "Nenhum arquivo selecionado",
          description: "Por favor, selecione um arquivo",
          variant: "destructive",
        });
        return;
      }

      if (!data.title || data.title.length < 3) {
        toast({
          title: "Título inválido",
          description: "O título deve ter pelo menos 3 caracteres",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!selectedFiles || selectedFiles.length === 0) {
        toast({
          title: "Nenhuma pasta selecionada",
          description: "Por favor, selecione uma pasta",
          variant: "destructive",
        });
        return;
      }
    }

    setUploading(true);

    try {
      const keywordsArray = data.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (uploadType === "file" && selectedFile) {
        // Debug: Verificar autenticação antes do upload
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Se não há sessão, tentar refresh
        if (!session) {
          console.warn('[File Upload] Sem sessão, tentando refresh...');
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
          if (refreshedSession) {
            session = refreshedSession;
          } else {
            throw new Error('Não autenticado. Por favor, faça login novamente.');
          }
        }

        console.log('[File Upload] Verificando autenticação:', {
          hasSession: !!session,
          userId: session?.user?.id,
          expectedUserId: user.id,
          sessionError: sessionError?.message,
          hasToken: !!session?.access_token,
        });

        // Verificar bucket (não bloquear se não conseguir listar - pode ser problema de permissão)
        try {
          const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
          if (bucketListError) {
            console.warn('[File Upload] Não foi possível listar buckets (pode ser normal):', bucketListError);
          } else {
            const documentsBucket = buckets?.find(b => b.id === 'documents');
            console.log('[File Upload] Bucket encontrado:', !!documentsBucket);
          }
        } catch (error) {
          console.warn('[File Upload] Erro ao verificar bucket (continuando mesmo assim):', error);
        }

        // Single file upload
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        // Path should be relative to bucket, without bucket name
        const filePath = fileName;

        // Verificar token explicitamente
        if (!session?.access_token) {
          throw new Error('Token de autenticação não encontrado. Por favor, faça login novamente.');
        }

        console.log('[File Upload] Fazendo upload:', {
          bucket: 'documents',
          filePath,
          fileSize: selectedFile.size,
          hasToken: !!session?.access_token,
          tokenPreview: session?.access_token ? `${session.access_token.substring(0, 20)}...` : 'missing',
        });

        // Tentar upload direto com fetch (mais simples e direto)
        let uploadError: Error | null = null;
        
        try {
          console.log('[File Upload] Tentando upload com fetch direto...');
          await uploadWithFetchDirect(selectedFile, filePath, 'documents');
          console.log('[File Upload] ✅ Upload bem-sucedido!');
        } catch (error: any) {
          console.error('[File Upload] ❌ Erro no upload:', error);
          
          // Interpretar erro e dar mensagem útil
          const errorMsg = error.message || '';
          if (errorMsg.includes('403') || errorMsg.includes('denied') || errorMsg.includes('RLS')) {
            throw new Error('Acesso negado ao storage. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor para desabilitar RLS e permitir uploads.');
          } else if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('bucket')) {
            throw new Error('Bucket "documents" não encontrado. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor para criar o bucket.');
          } else {
            throw new Error(`Erro no upload: ${errorMsg}. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor.`);
          }
        }

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        createDocument.mutate({
          title: data.title!,
          description: data.description,
          category: data.category,
          keywords: keywordsArray,
          pdf_url: publicUrl,
          author_id: user.id,
          is_published: data.isPublished,
          is_premium: data.isPremium,
          preview_image_url: data.previewImageUrl || null,
          file_size: selectedFile.size,
        });

        toast({
          title: "Sucesso!",
          description: `Documento "${data.title}" foi ${data.isPublished ? "publicado" : "salvo como rascunho"}.`,
        });
      } else if (uploadType === "folder" && selectedFiles) {
        // Folder upload
        const result = await uploadFolderStructure(selectedFiles, user.id, {
          category: data.category,
          description: data.description,
          keywords: keywordsArray,
          isPublished: data.isPublished,
        });

        if (result.errors.length > 0) {
          const errorDetails = result.errors.slice(0, 3).join('; ');
          const moreErrors = result.errors.length > 3 ? ` e mais ${result.errors.length - 3} erro(s)` : '';
          
          toast({
            title: "Upload concluído com erros",
            description: `${result.documentsCreated} documento(s) criado(s). ${result.errors.length} erro(s) encontrado(s). ${errorDetails}${moreErrors}`,
            variant: "default",
            duration: 10000, // Show longer to read errors
          });
          console.error("Upload errors:", result.errors);
        } else {
          toast({
            title: "Sucesso!",
            description: `${result.documentsCreated} documento(s) criado(s) em ${result.foldersCreated.length} pasta(s).`,
          });
        }
      }

      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Falha no upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao fazer upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-brand hover:opacity-90 text-navy font-semibold text-[14px] rounded-lg shadow-cyan transition-all duration-200 h-10">
          <Upload className="h-4 w-4 stroke-[2]" />
          Enviar Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-elegant-lg">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-[20px] font-semibold tracking-tight text-navy">Enviar Novo Documento</DialogTitle>
          <DialogDescription className="text-[14px] font-light mt-1 text-navy/60">
            {uploadType === "file" 
              ? "Adicione um novo documento de segurança do trabalho à biblioteca. Qualquer tipo de arquivo é permitido."
              : "Faça upload de uma pasta inteira com documentos. A estrutura de pastas será preservada. Qualquer tipo de arquivo é permitido."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Upload Type Selection */}
            <Tabs value={uploadType} onValueChange={(v) => {
              setUploadType(v as "file" | "folder");
              setSelectedFile(null);
              setSelectedFiles(null);
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Arquivo Único</TabsTrigger>
                <TabsTrigger value="folder">Pasta</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* File/Folder Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
                dragActive
                  ? "border-accent bg-accent/5 scale-[1.02]"
                  : "border-border/60 hover:border-accent/40 hover:bg-muted/20"
              }`}
            >
              {uploadType === "file" ? (
                selectedFile ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-accent stroke-[1.5]" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-[15px] text-foreground truncate">{selectedFile.name}</p>
                      <p className="text-[13px] text-muted-foreground font-light mt-0.5">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="font-medium text-[13px] rounded-lg border-border/60"
                    >
                      Alterar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40 stroke-[1.5]" />
                    <p className="text-[15px] font-medium mb-1 text-foreground">
                      Arraste seu arquivo aqui, ou clique para escolher
                    </p>
                    <p className="text-[13px] text-muted-foreground font-light mb-6">
                      Qualquer tipo de arquivo | Tamanho máximo: {(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB
                    </p>
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button type="button" variant="outline" asChild className="font-medium rounded-lg">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Selecionar Arquivo
                      </label>
                    </Button>
                  </>
                )
              ) : (
                selectedFiles ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Folder className="h-6 w-6 text-accent stroke-[1.5]" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-medium text-[15px] text-foreground">
                        {selectedFiles.length} arquivo(s) selecionado(s)
                      </p>
                      <p className="text-[13px] text-muted-foreground font-light mt-0.5">
                        Pasta: {selectedFiles[0]?.webkitRelativePath?.split('/')[0] || 'Pasta'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFiles(null)}
                      className="font-medium text-[13px] rounded-lg border-border/60"
                    >
                      Alterar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40 stroke-[1.5]" />
                    <p className="text-[15px] font-medium mb-1 text-foreground">
                      Arraste uma pasta aqui, ou clique para escolher
                    </p>
                    <p className="text-[13px] text-muted-foreground font-light mb-6">
                      Qualquer tipo de arquivo | Tamanho máximo por arquivo: {(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB
                    </p>
                    <Input
                      type="file"
                      {...({ webkitdirectory: "", directory: "" } as any)}
                      multiple
                      onChange={(e) => {
                        if (e.target.files) handleFolderSelect(e.target.files);
                      }}
                      className="hidden"
                      id="folder-upload"
                    />
                    <Button type="button" variant="outline" asChild className="font-medium rounded-lg">
                      <label htmlFor="folder-upload" className="cursor-pointer">
                        Selecionar Pasta
                      </label>
                    </Button>
                  </>
                )
              )}
            </div>

            {/* Form Fields */}
            {uploadType === "file" && (
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[13px] font-medium">Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Document title"
                        className="h-11 text-[15px] font-normal border-border/60 rounded-lg focus-visible:ring-accent/20 focus-visible:border-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px] font-medium">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the document"
                      className="resize-none text-[15px] font-normal border-border/60 rounded-lg focus-visible:ring-accent/20 focus-visible:border-accent min-h-[100px]"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px] font-medium">Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 text-[15px] font-normal border-border/60 rounded-lg focus:ring-accent/20 focus:border-accent">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.filter((c) => c !== "Todas").map((category) => (
                        <SelectItem key={category} value={category} className="text-[14px]">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[13px] font-medium">Keywords</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="safety, equipment, training (comma-separated)"
                      className="h-11 text-[15px] font-normal border-border/60 rounded-lg focus-visible:ring-accent/20 focus-visible:border-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[12px] font-light">
                    Add keywords separated by commas to help users find this document
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Publicar imediatamente</FormLabel>
                    <FormDescription>
                      Tornar este documento visível para todos os usuários
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPremium"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Conteúdo Premium</FormLabel>
                    <FormDescription>
                      Requer avaliação do usuário para desbloquear (apenas planos Premium/Avançado)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isPremium") && (
              <FormField
                control={form.control}
                name="previewImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL da Imagem de Prévia (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/preview.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Imagem que será exibida borrada quando o documento estiver bloqueado
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={uploading}
                className="font-medium text-[14px] rounded-lg border-cyan/30 text-navy hover:bg-cyan/5"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={uploading || (uploadType === "file" ? !selectedFile : !selectedFiles)}
                className="bg-gradient-brand hover:opacity-90 text-navy font-semibold text-[14px] rounded-lg shadow-cyan transition-all duration-200"
              >
                {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin stroke-[2]" />}
                {uploading ? "Enviando..." : "Fazer Upload"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
