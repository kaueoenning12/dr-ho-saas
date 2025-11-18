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

        // Extrair o path do arquivo da URL completa
        // Exemplo: "f16176fe-4fb9-43b3-a314-32c2bfee436d-1763495594328.pdf"
        const pathMatch = pdfUrl.match(/documents\/(.+)$/);
        if (!pathMatch) {
          throw new Error("URL inválida");
        }

        const filePath = pathMatch[1];

        // Gerar URL assinada válida por 1 hora
        const { data, error: signError } = await supabase.storage
          .from("documents")
          .createSignedUrl(filePath, 3600); // 3600 segundos = 1 hora

        if (signError) throw signError;

        setSignedUrl(data.signedUrl);
      } catch (err: any) {
        console.error("[useSignedPdfUrl] Erro ao gerar URL:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    generateSignedUrl();
  }, [pdfUrl]);

  return { signedUrl, isLoading, error };
}
