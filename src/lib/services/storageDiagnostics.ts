import { supabase } from "@/integrations/supabase/client";

export interface StorageDiagnostics {
  rlsEnabled: boolean | null;
  bucketExists: boolean;
  policiesCount: number;
  canListBuckets: boolean;
  canReadStorage: boolean;
  issues: string[];
  recommendations: string[];
}

/**
 * Diagnostica o status do Supabase Storage
 * Verifica RLS, bucket, políticas e permissões
 */
export async function diagnoseStorage(): Promise<StorageDiagnostics> {
  const diagnostics: StorageDiagnostics = {
    rlsEnabled: null,
    bucketExists: false,
    policiesCount: 0,
    canListBuckets: false,
    canReadStorage: false,
    issues: [],
    recommendations: [],
  };

  try {
    // 1. Verificar se consegue listar buckets
    try {
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (!bucketError && buckets) {
        diagnostics.canListBuckets = true;
        diagnostics.bucketExists = buckets.some(b => b.id === 'documents');
        
        if (!diagnostics.bucketExists) {
          diagnostics.issues.push('Bucket "documents" não encontrado');
          diagnostics.recommendations.push('Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor para criar o bucket');
        }
      } else {
        // Se não conseguir listar, pode ser problema de permissão ou bucket não existe
        // Tentar verificar diretamente tentando listar arquivos do bucket
        console.warn('[Storage Diagnostics] Não foi possível listar buckets, tentando verificar bucket diretamente...');
        
        // Tentar listar arquivos do bucket para verificar se existe
        const { data: files, error: listError } = await supabase.storage
          .from('documents')
          .list('', { limit: 1 });
        
        if (!listError) {
          // Se conseguiu listar, o bucket existe
          diagnostics.bucketExists = true;
          diagnostics.canReadStorage = true;
        } else {
          // Se não conseguiu, pode ser que o bucket não existe ou RLS está bloqueando
          if (listError.message?.includes('not found') || listError.message?.includes('does not exist')) {
            diagnostics.issues.push('Bucket "documents" não encontrado');
            diagnostics.recommendations.push('Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor para criar o bucket');
          } else {
            diagnostics.issues.push(`Não foi possível acessar bucket: ${bucketError?.message || listError.message || 'Erro desconhecido'}`);
          }
        }
      }
    } catch (error: any) {
      diagnostics.issues.push(`Erro ao verificar buckets: ${error.message}`);
    }

    // 2. Verificar se consegue ler do storage (só se bucket existe)
    if (diagnostics.bucketExists) {
      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .list('', { limit: 1 });
        
        if (!error) {
          diagnostics.canReadStorage = true;
        } else {
          diagnostics.issues.push(`Não foi possível ler do storage: ${error.message}`);
          if (error.message?.includes('access') || error.message?.includes('denied') || error.message?.includes('403')) {
            diagnostics.recommendations.push('RLS pode estar bloqueando acesso. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor');
            diagnostics.rlsEnabled = true; // Inferir que RLS está habilitado
          }
        }
      } catch (error: any) {
        diagnostics.issues.push(`Erro ao ler storage: ${error.message}`);
      }
    }

    // 3. Verificar RLS e políticas via tentativa de acesso
    // Não podemos verificar RLS diretamente sem RPC, então inferimos pelo comportamento
    // Se não conseguir ler e não conseguir listar buckets, provavelmente RLS está bloqueando

    // 5. Gerar recomendações baseadas nos problemas encontrados
    if (diagnostics.issues.length > 0) {
      if (!diagnostics.canListBuckets && !diagnostics.canReadStorage) {
        diagnostics.recommendations.push('Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor');
      }
      
      if (diagnostics.issues.some(i => i.includes('access') || i.includes('denied'))) {
        diagnostics.recommendations.push('RLS está bloqueando uploads. Execute o SQL para desabilitar RLS');
      }
    }

    // 6. Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      diagnostics.issues.push('Usuário não autenticado');
      diagnostics.recommendations.push('Faça login novamente');
    }

  } catch (error: any) {
    diagnostics.issues.push(`Erro geral no diagnóstico: ${error.message}`);
  }

  return diagnostics;
}

/**
 * Verifica se o storage está pronto para uploads
 */
export async function isStorageReadyForUpload(): Promise<{ ready: boolean; message: string }> {
  const diagnostics = await diagnoseStorage();

  if (diagnostics.issues.some(i => i.includes('não autenticado'))) {
    return {
      ready: false,
      message: 'Usuário não autenticado. Por favor, faça login novamente.',
    };
  }

  if (!diagnostics.bucketExists) {
    return {
      ready: false,
      message: 'Bucket "documents" não encontrado. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor.',
    };
  }

  if (!diagnostics.canReadStorage && diagnostics.issues.some(i => i.includes('access') || i.includes('denied'))) {
    return {
      ready: false,
      message: 'RLS está bloqueando acesso ao storage. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor para desabilitar RLS.',
    };
  }

  if (diagnostics.issues.length > 0) {
    return {
      ready: false,
      message: `Problemas detectados: ${diagnostics.issues.join('; ')}. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor.`,
    };
  }

  return {
    ready: true,
    message: 'Storage está pronto para uploads',
  };
}

