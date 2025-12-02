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

        console.log("[useSignedPdfUrl] URL original:", pdfUrl);

        let filePath: string;

        // Se já é uma URL completa (http/https), verificar se é pública ou assinada
        if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) {
          // Se já é uma URL assinada, usar diretamente
          if (pdfUrl.includes('/object/sign/')) {
            console.log("[useSignedPdfUrl] URL já é assinada, usando diretamente");
            setSignedUrl(pdfUrl);
            setIsLoading(false);
            return;
          }

          // Se é uma URL pública, extrair o path e gerar URL assinada
          if (pdfUrl.includes('/object/public/')) {
            console.log("[useSignedPdfUrl] URL pública detectada, extraindo path para gerar URL assinada");
            // Extrair o path do arquivo da URL pública
            // Exemplo: https://xxx.supabase.co/storage/v1/object/public/documents/path/to/file.pdf
            const publicPathMatch = pdfUrl.match(/\/object\/public\/documents\/(.+)$/);
            if (publicPathMatch && publicPathMatch[1]) {
              filePath = decodeURIComponent(publicPathMatch[1]);
              console.log("[useSignedPdfUrl] Path extraído da URL pública:", filePath);
            } else {
              // Tentar extrair de forma mais genérica
              const genericMatch = pdfUrl.match(/\/documents\/(.+)$/);
              if (genericMatch && genericMatch[1]) {
                filePath = decodeURIComponent(genericMatch[1]);
                console.log("[useSignedPdfUrl] Path extraído (genérico):", filePath);
              } else {
                throw new Error("Não foi possível extrair o path do arquivo da URL pública");
              }
            }
          } else {
            // URL completa mas não reconhecida, tentar usar diretamente
            console.warn("[useSignedPdfUrl] URL completa não reconhecida, tentando usar diretamente");
            setSignedUrl(pdfUrl);
            setIsLoading(false);
            return;
          }
        } else {
          // Extrair o path do arquivo - aceita tanto paths com prefixo "documents/" quanto paths relativos diretos
          // Exemplos aceitos:
          // - "documents/f16176fe-4fb9-43b3-a314-32c2bfee436d/1763494475651/ceramica.docx"
          // - "f16176fe-4fb9-43b3-a314-32c2bfee436d/1763494475651/ceramica.docx"
          if (pdfUrl.startsWith('documents/')) {
            // Remove o prefixo "documents/" se existir
            filePath = pdfUrl.replace(/^documents\//, '');
          } else {
            // Usa o path diretamente se não tiver prefixo
            filePath = pdfUrl;
          }
        }

        // Validação básica do path
        if (!filePath || filePath.trim().length === 0) {
          throw new Error("Path do arquivo inválido ou vazio");
        }

        console.log("[useSignedPdfUrl] File path processado:", filePath);

        // Gerar URL assinada válida por 1 hora
        const { data, error: signError } = await supabase.storage
          .from("documents")
          .createSignedUrl(filePath, 3600); // 3600 segundos = 1 hora

        if (signError) {
          console.error("[useSignedPdfUrl] Erro ao gerar URL assinada:", signError);
          throw new Error(`Erro ao gerar URL assinada: ${signError.message}`);
        }

        if (!data?.signedUrl) {
          throw new Error("URL assinada não foi retornada pelo servidor");
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
        setError(err.message || "Erro desconhecido ao gerar URL assinada");
      } finally {
        setIsLoading(false);
      }
    };

    generateSignedUrl();
  }, [pdfUrl]);

  return { signedUrl, isLoading, error };
}
