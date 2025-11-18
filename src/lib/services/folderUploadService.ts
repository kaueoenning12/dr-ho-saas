import { supabase } from "@/integrations/supabase/client";
import { ALLOWED_FILE_TYPES, ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE } from "@/lib/constants";
import { uploadWithFetchDirect } from "./storageUploadHelper";

export interface FolderStructure {
  path: string;
  name: string;
  parentPath: string | null;
}

export interface UploadedFile {
  file: File;
  relativePath: string;
  folderPath: string;
  fileName: string;
}

export interface UploadResult {
  foldersCreated: string[];
  documentsCreated: number;
  errors: string[];
}

/**
 * Normalize folder path (remove leading/trailing slashes, normalize separators)
 */
export function normalizeFolderPath(path: string): string {
  return path
    .replace(/\\/g, '/') // Convert backslashes to forward slashes
    .replace(/^\/+|\/+$/g, '') // Remove leading/trailing slashes
    .replace(/\/+/g, '/'); // Replace multiple slashes with single
}

/**
 * Extract folder path from file path
 */
export function getFolderPathFromFilePath(filePath: string): string {
  const normalized = normalizeFolderPath(filePath);
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash === -1) return '';
  return normalized.substring(0, lastSlash);
}

/**
 * Get file name from file path
 */
export function getFileNameFromPath(filePath: string): string {
  const normalized = normalizeFolderPath(filePath);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.substring(lastSlash + 1);
}

/**
 * Extract file extension from filename (handles complex names with multiple dots)
 */
function getFileExtension(fileName: string): string {
  const lowerName = fileName.toLowerCase().trim();
  
  // Handle files without extension
  if (!lowerName.includes('.')) {
    return '';
  }
  
  // Get the last part after the last dot
  const parts = lowerName.split('.');
  if (parts.length < 2) {
    return '';
  }
  
  const ext = parts[parts.length - 1];
  return ext ? `.${ext}` : '';
}

/**
 * Check if file type is allowed
 * NOTE: All file types are now allowed - this function always returns true
 */
function isAllowedFileType(file: File): boolean {
  const fileName = file.name;
  const extension = getFileExtension(fileName);
  const mimeType = file.type || '';
  
  // Debug log
  console.log(`[File Validation] ${fileName}`, {
    extension,
    mimeType,
    size: file.size,
  });
  
  // Accept all file types
  console.log(`[File Validation] ✅ Aceito: ${fileName} (extensão: ${extension || 'nenhuma'}, MIME: ${mimeType || 'desconhecido'})`);
  return true;
}

/**
 * Process FileList and extract folder structure and files
 */
export function processFolderFiles(files: FileList): {
  folders: Map<string, FolderStructure>;
  filesToUpload: UploadedFile[];
  errors: string[];
} {
  const folders = new Map<string, FolderStructure>();
  const filesToUpload: UploadedFile[] = [];
  const errors: string[] = [];

  console.log(`[Folder Upload] Processando ${files.length} arquivo(s)`);
  
  let processedCount = 0;
  let rejectedCount = 0;
  
  // Process all files
  Array.from(files).forEach((file) => {
    const filePath = file.webkitRelativePath || file.name;
    const extension = getFileExtension(file.name);
    
    processedCount++;
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      rejectedCount++;
      const errorMsg = `Arquivo muito grande: ${filePath} (${(file.size / 1024 / 1024).toFixed(2)}MB, máximo: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB)`;
      errors.push(errorMsg);
      console.warn(`[Folder Upload] ${errorMsg}`);
      return;
    }

    // Validate file type (all types are now allowed, but we log for debugging)
    isAllowedFileType(file);

    // Get relative path (webkitRelativePath for folder uploads, name for single files)
    const relativePath = file.webkitRelativePath || file.name;
    const normalizedPath = normalizeFolderPath(relativePath);
    
    // Extract folder path and file name
    const folderPath = getFolderPathFromFilePath(normalizedPath);
    const fileName = getFileNameFromPath(normalizedPath);

    // Build folder structure
    if (folderPath) {
      const pathParts = folderPath.split('/');
      let currentPath = '';
      
      pathParts.forEach((part, index) => {
        const parentPath = index === 0 ? '' : pathParts.slice(0, index).join('/');
        currentPath = index === 0 ? part : `${currentPath}/${part}`;
        
        if (!folders.has(currentPath)) {
          folders.set(currentPath, {
            path: currentPath,
            name: part,
            parentPath: parentPath || null,
          });
        }
      });
    }

    filesToUpload.push({
      file,
      relativePath: normalizedPath,
      folderPath,
      fileName,
    });
    
    console.log(`[Folder Upload] ✅ Arquivo aceito: ${filePath} -> ${normalizedPath}`);
  });

  console.log(`[Folder Upload] Resumo: ${processedCount} processados, ${filesToUpload.length} aceitos, ${rejectedCount} rejeitados, ${folders.size} pastas criadas`);

  return { folders, filesToUpload, errors };
}

/**
 * Create folder in database
 */
export async function createFolderInDatabase(
  folder: FolderStructure,
  userId: string
): Promise<string | null> {
  try {
    // Check if folder already exists
    const { data: existing } = await supabase
      .from('document_folders')
      .select('id')
      .eq('path', folder.path)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    // Get parent folder ID if exists
    let parentFolderId: string | null = null;
    if (folder.parentPath) {
      const { data: parent } = await supabase
        .from('document_folders')
        .select('id')
        .eq('path', folder.parentPath)
        .maybeSingle();
      
      if (parent) {
        parentFolderId = parent.id;
      }
    }

    // Create folder
    const { data, error } = await supabase
      .from('document_folders')
      .insert({
        name: folder.name,
        path: folder.path,
        parent_folder_id: parentFolderId,
        author_id: userId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error creating folder in database:', error);
    return null;
  }
}

/**
 * Create all folders in correct order (parents first)
 */
export async function createFoldersInDatabase(
  folders: Map<string, FolderStructure>,
  userId: string
): Promise<Map<string, string>> {
  const folderIdMap = new Map<string, string>();
  
  // Sort folders by depth (shallowest first)
  const sortedFolders = Array.from(folders.values()).sort((a, b) => {
    const depthA = a.path.split('/').length;
    const depthB = b.path.split('/').length;
    return depthA - depthB;
  });

  // Create folders in order
  for (const folder of sortedFolders) {
    const folderId = await createFolderInDatabase(folder, userId);
    if (folderId) {
      folderIdMap.set(folder.path, folderId);
    }
  }

  return folderIdMap;
}

/**
 * Upload file to storage with folder structure
 */
export async function uploadFileToStorage(
  file: File,
  folderPath: string,
  userId: string
): Promise<{ publicUrl: string; filePath: string }> {
  // Verificar autenticação
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  // Se não há sessão, tentar refresh
  if (!session) {
    console.warn('[Folder Upload] Sem sessão, tentando refresh...');
    const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshedSession) {
      session = refreshedSession;
      console.log('[Folder Upload] Sessão atualizada após refresh');
    } else {
      console.error('[Folder Upload] Erro ao fazer refresh:', refreshError);
      throw new Error('Não autenticado. Por favor, faça login novamente.');
    }
  }

  console.log('[Folder Upload] Verificando autenticação:', {
    hasSession: !!session,
    userId: session?.user?.id,
    expectedUserId: userId,
    sessionError: sessionError?.message,
    accessToken: session?.access_token ? 'present' : 'missing',
    tokenLength: session?.access_token?.length || 0,
  });

  // Verificar role do usuário
  if (session?.user?.id) {
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);
    
    console.log('[Folder Upload] Roles do usuário:', {
      roles: userRoles,
      roleError: roleError?.message,
    });
  }

  // Verificar se bucket existe (não bloquear se não conseguir listar - pode ser problema de permissão)
  try {
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.warn('[Folder Upload] Não foi possível listar buckets (pode ser normal):', bucketError);
    } else {
      const documentsBucket = buckets?.find(b => b.id === 'documents');
      console.log('[Folder Upload] Verificando bucket:', {
        bucketExists: !!documentsBucket,
        allBuckets: buckets?.map(b => b.id),
      });
    }
  } catch (error) {
    console.warn('[Folder Upload] Erro ao verificar bucket (continuando mesmo assim):', error);
  }

  const timestamp = Date.now();
  // Sanitize filename but preserve extension
  const extension = getFileExtension(file.name);
  const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = extension 
    ? `${userId}-${timestamp}-${sanitizedBaseName}${extension}`
    : `${userId}-${timestamp}-${sanitizedBaseName}`;
  
  // Build storage path with folder structure (relative to bucket, without bucket name)
  const storagePath = folderPath
    ? `${folderPath}/${fileName}`
    : fileName;

  // Verificar token explicitamente
  if (!session?.access_token) {
    console.error('[Folder Upload] ❌ Token de acesso não encontrado!');
    throw new Error('Token de autenticação não encontrado. Por favor, faça login novamente.');
  }

  console.log(`[Folder Upload] Fazendo upload: ${file.name} -> ${storagePath}`, {
    bucket: 'documents',
    storagePath,
    fileSize: file.size,
    hasToken: !!session?.access_token,
    tokenPreview: session?.access_token ? `${session.access_token.substring(0, 20)}...` : 'missing',
  });

  // Tentar upload direto com fetch (mais simples e direto)
  let uploadError: Error | null = null;
  
  try {
    console.log('[Folder Upload] Tentando upload com fetch direto...');
    const result = await uploadWithFetchDirect(file, storagePath, 'documents');
    console.log('[Folder Upload] ✅ Upload bem-sucedido!');
    return {
      publicUrl: result.publicUrl,
      filePath: storagePath,
    };
  } catch (error: any) {
    console.error('[Folder Upload] ❌ Erro no upload:', error);
    
    // Interpretar erro e dar mensagem útil
    const errorMsg = error.message || '';
    if (errorMsg.includes('403') || errorMsg.includes('denied') || errorMsg.includes('RLS')) {
      throw new Error(`Arquivo ${file.name}: Acesso negado. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor.`);
    } else if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('bucket')) {
      throw new Error(`Arquivo ${file.name}: Bucket não encontrado. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor.`);
    } else {
      throw new Error(`Arquivo ${file.name}: ${errorMsg}. Execute FIX_STORAGE_FORCE_DISABLE_RLS.sql no Supabase SQL Editor.`);
    }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(storagePath);

  console.log(`[Folder Upload] ✅ Upload concluído: ${file.name}`);

  return {
    publicUrl,
    filePath: storagePath,
  };
}

/**
 * Upload folder structure to storage and database
 */
export async function uploadFolderStructure(
  files: FileList,
  userId: string,
  metadata: {
    category: string;
    description: string;
    keywords: string[];
    isPublished: boolean;
  }
): Promise<UploadResult> {
  const result: UploadResult = {
    foldersCreated: [],
    documentsCreated: 0,
    errors: [],
  };

  try {
    console.log(`[Folder Upload] Iniciando upload de ${files.length} arquivo(s)`);
    
    // Process files and extract structure
    const { folders, filesToUpload, errors } = processFolderFiles(files);
    result.errors.push(...errors);

    if (filesToUpload.length === 0) {
      const errorMsg = errors.length > 0 
        ? `Nenhum arquivo válido encontrado na pasta. ${errors.length} arquivo(s) rejeitado(s) por tamanho (máximo: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB por arquivo)`
        : 'Nenhum arquivo encontrado na pasta';
      result.errors.push(errorMsg);
      console.error(`[Folder Upload] ${errorMsg}`);
      return result;
    }
    
    console.log(`[Folder Upload] ${filesToUpload.length} arquivo(s) válido(s) para upload`);

    // Create folders in database
    const folderIdMap = await createFoldersInDatabase(folders, userId);
    result.foldersCreated = Array.from(folderIdMap.keys());

    // Upload files and create document records
    for (const fileInfo of filesToUpload) {
      try {
        // Get parent folder ID
        const parentFolderId = fileInfo.folderPath
          ? folderIdMap.get(fileInfo.folderPath) || null
          : null;

        // Upload file to storage
        const { publicUrl, filePath } = await uploadFileToStorage(
          fileInfo.file,
          fileInfo.folderPath,
          userId
        );

        // Create document record
        const { error: docError } = await supabase
          .from('documents')
          .insert({
            title: fileInfo.fileName,
            description: metadata.description || `Arquivo: ${fileInfo.fileName}`,
            category: metadata.category,
            keywords: metadata.keywords,
            pdf_url: publicUrl,
            author_id: userId,
            is_published: metadata.isPublished,
            file_size: fileInfo.file.size,
            folder_path: fileInfo.folderPath || null,
            parent_folder_id: parentFolderId,
          });

        if (docError) {
          result.errors.push(`Erro ao criar documento ${fileInfo.fileName}: ${docError.message}`);
        } else {
          result.documentsCreated++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        result.errors.push(`Erro ao processar ${fileInfo.fileName}: ${errorMessage}`);
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    result.errors.push(`Erro ao fazer upload da pasta: ${errorMessage}`);
    return result;
  }
}

