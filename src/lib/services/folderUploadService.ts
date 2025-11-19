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
 * Sanitize a filename by removing accents, special characters, and spaces
 */
export function sanitizeFileName(fileName: string): string {
  // Remove accents
  const withoutAccents = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Get extension
  const lastDot = withoutAccents.lastIndexOf('.');
  const name = lastDot > 0 ? withoutAccents.substring(0, lastDot) : withoutAccents;
  const ext = lastDot > 0 ? withoutAccents.substring(lastDot) : '';
  
  // Sanitize name part
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-z0-9_-]/g, '') // Remove special characters except - and _
    .substring(0, 100); // Limit length
  
  return sanitized + ext.toLowerCase();
}

/**
 * Sanitize a path segment
 */
export function sanitizePathSegment(segment: string): string {
  return segment
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .substring(0, 100);
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
 * Get folder name from path (last segment)
 */
export function getFolderNameFromPath(path: string): string {
  const normalized = normalizeFolderPath(path);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.substring(lastSlash + 1);
}

/**
 * Create a folder in the database
 */
export async function createFolderInDatabase(
  folderPath: string,
  parentFolderId: string | null,
  authorId: string,
  retries: number = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Check if folder already exists
      const { data: existing, error: checkError } = await supabase
        .from('document_folders')
        .select('id')
        .eq('path', folderPath)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        console.log(`[Folder Creation] ✅ Folder already exists: ${folderPath}`);
        return existing.id;
      }

      // Create new folder
      const folderName = getFolderNameFromPath(folderPath);
      
      const { data, error } = await supabase
        .from('document_folders')
        .insert({
          name: folderName,
          path: folderPath,
          parent_folder_id: parentFolderId,
          author_id: authorId
        })
        .select('id')
        .single();

      if (error) {
        // Se erro for de recursão, aguardar e tentar novamente
        if (error.message?.includes('infinite recursion') && attempt < retries) {
          console.warn(`[Folder Creation] ⚠️ Recursion detected, retrying (${attempt}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw error;
      }

      console.log(`[Folder Creation] ✅ Created folder: ${folderPath} (ID: ${data.id})`);
      return data.id;

    } catch (error: any) {
      console.error(`[Folder Creation] ❌ Error creating folder (attempt ${attempt}/${retries}):`, {
        folderPath,
        error: error.message
      });
      
      if (attempt === retries) {
        return null; // Failed after all retries
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return null;
}

/**
 * Process and create folder hierarchy recursively
 */
export async function processAndCreateFolderHierarchy(
  fullPath: string,
  authorId: string
): Promise<string | null> {
  if (!fullPath) return null;
  
  const normalized = normalizeFolderPath(fullPath);
  const segments = normalized.split('/').filter(s => s.length > 0);
  
  if (segments.length === 0) return null;
  
  let currentPath = '';
  let parentId: string | null = null;
  
  // Create each level sequentially
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    parentId = await createFolderInDatabase(currentPath, parentId, authorId);
  }
  
  return parentId; // Return ID of deepest folder
}

/**
 * Generate simplified storage path
 */
export function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFileName(fileName);
  return `${userId}/${timestamp}/${sanitized}`;
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

// Old createFolderInDatabase removed - using new implementation above

// Old createFoldersInDatabase removed - using processAndCreateFolderHierarchy instead

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
    console.log('[Folder Upload] Criando estrutura de pastas no banco...');
    const folderIdMap = new Map<string, string>(); // path -> folderId
    
    for (const [path, folder] of folders) {
      try {
        const folderId = await processAndCreateFolderHierarchy(path, userId);
        if (folderId) {
          folderIdMap.set(path, folderId);
          result.foldersCreated.push(path);
        } else {
          result.errors.push(`Erro ao criar pasta ${path}: falhou após tentativas`);
        }
      } catch (error) {
        console.error('[Folder Upload] Erro ao criar pasta:', path, error);
        result.errors.push(`Erro ao criar pasta ${path}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }

    // Upload files and create document records
    for (const fileInfo of filesToUpload) {
      try {
        // Validar tamanho antes de tentar upload
        if (fileInfo.file.size > MAX_FILE_SIZE) {
          const fileSizeMB = (fileInfo.file.size / (1024 * 1024)).toFixed(2);
          console.warn(`[Folder Upload] ⚠️ File too large, skipping: ${fileInfo.fileName} (${fileSizeMB}MB)`);
          result.errors.push(`Arquivo muito grande: ${fileInfo.fileName} (${fileSizeMB}MB, máximo: 10.00MB)`);
          continue; // Skip this file
        }

        // Get parent folder ID
        const parentFolderId = fileInfo.folderPath
          ? folderIdMap.get(fileInfo.folderPath) || null
          : null;

        // Upload file to storage with simplified path
        const simplifiedPath = generateStoragePath(userId, fileInfo.file.name);
        const { publicUrl, filePath } = await uploadWithFetchDirect(fileInfo.file, simplifiedPath, 'documents');

        // Create document record with folder association
        // IMPORTANTE: Salvar apenas o path relativo (filePath), não a URL pública
        const { error: docError } = await supabase
          .from('documents')
          .insert({
            title: fileInfo.fileName,
            description: metadata.description || `Arquivo: ${fileInfo.fileName}`,
            category: metadata.category,
            keywords: metadata.keywords,
            pdf_url: simplifiedPath, // ✅ Store only relative storage path
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

