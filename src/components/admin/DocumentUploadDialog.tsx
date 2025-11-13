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
import { Upload, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { DOCUMENT_CATEGORIES, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useCreateDocument } from "@/hooks/useDocumentsQuery";


const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  keywords: z.string().min(1, "Add at least one keyword"),
  isPublished: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface DocumentUploadDialogProps {
  onSuccess?: () => void;
}

export function DocumentUploadDialog({ onSuccess }: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    },
  });

  const handleFileSelect = (file: File) => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
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

  const onSubmit = async (data: FormData) => {
    if (!selectedFile) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, faça upload de um arquivo PDF",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Create document record
      const keywordsArray = data.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      createDocument.mutate({
        title: data.title,
        description: data.description,
        category: data.category,
        keywords: keywordsArray,
        pdf_url: publicUrl,
        author_id: user.id,
        is_published: data.isPublished,
        file_size: selectedFile.size,
      });

      toast({
        title: "Sucesso!",
        description: `Documento "${data.title}" foi ${data.isPublished ? "publicado" : "salvo como rascunho"}.`,
      });

      form.reset();
      setSelectedFile(null);
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Falha no upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao fazer upload do documento",
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
          Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-elegant-lg">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-[20px] font-semibold tracking-tight text-navy">Upload New Document</DialogTitle>
          <DialogDescription className="text-[14px] font-light mt-1 text-navy/60">
            Add a new safety document to the library
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* File Upload Area */}
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
              {selectedFile ? (
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
                    Arraste seu PDF aqui, ou clique para escolher
                  </p>
                  <p className="text-[13px] text-muted-foreground font-light mb-6">
                    Tamanho máximo: 10MB
                  </p>
                  <Input
                    type="file"
                    accept=".pdf"
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
              )}
            </div>

            {/* Form Fields */}
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
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.filter((c) => c !== "All").map((category) => (
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
                    <FormLabel className="text-base">Publish immediately</FormLabel>
                    <FormDescription>
                      Make this document visible to all users
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
                disabled={uploading || !selectedFile}
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
