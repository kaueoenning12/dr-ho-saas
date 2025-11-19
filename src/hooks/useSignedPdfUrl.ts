import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSignedPdfUrl(pdfUrl: string | null) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setIsLoading(false);
      return;
    }

    const generateSignedUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log("[useSignedPdfUrl] PDF URL original:", pdfUrl);

        // Extrair o path do arquivo da URL completa
        // Exemplo: "f16176fe-4fb9-43b3-a314-32c2bfee436d-1763495594328.pdf"
        const pathMatch = pdfUrl.match(/documents\/(.+)$/);
        if (!pathMatch) {
          console.error("[useSignedPdfUrl] Falha ao extrair path da URL:", pdfUrl);
          throw new Error("URL inválida - não encontrou path do documento");
        }

        const filePath = pathMatch[1];
        console.log("[useSignedPdfUrl] File path extraído:", filePath);

        // Gerar URL assinada válida por 1 hora
        const { data, error: signError } = await supabase.storage
          .from("documents")
          .createSignedUrl(filePath, 3600); // 3600 segundos = 1 hora

        if (signError) {
          console.error("[useSignedPdfUrl] Erro ao gerar URL assinada:", signError);
          throw signError;
        }

        console.log("[useSignedPdfUrl] URL assinada gerada com sucesso");
        console.log("[useSignedPdfUrl] Signed URL:", data.signedUrl);

        setSignedUrl(data.signedUrl);
      } catch (err: any) {
        console.error("[useSignedPdfUrl] Erro completo:", {
          message: err.message,
          originalUrl: pdfUrl,
          error: err
        });
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    generateSignedUrl();
  }, [pdfUrl]);

  return { signedUrl, isLoading, error };
}
