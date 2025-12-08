import { useQuery } from "@tanstack/react-query";
import { generateFolderIcon, isOpenAIConfigured } from "@/lib/services/openaiIconService";
import { Folder } from "lucide-react";

const STORAGE_PREFIX = "folder-icon-";

/**
 * Get cached icon from localStorage
 */
function getCachedIcon(folderId: string): string | null {
  try {
    const cached = localStorage.getItem(`${STORAGE_PREFIX}${folderId}`);
    return cached;
  } catch (error) {
    console.error("[Folder Icon] Error reading from localStorage:", error);
    return null;
  }
}

/**
 * Cache icon in localStorage
 */
function cacheIcon(folderId: string, svg: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${folderId}`, svg);
  } catch (error) {
    console.error("[Folder Icon] Error writing to localStorage:", error);
  }
}

/**
 * Hook to get folder icon (cached or generated)
 */
export function useFolderIcon(folderId: string, folderName: string) {
  return useQuery({
    queryKey: ["folder-icon", folderId],
    queryFn: async () => {
      // Check cache first
      const cached = getCachedIcon(folderId);
      if (cached) {
        return cached;
      }

      // If OpenAI is not configured, return null to use fallback
      if (!isOpenAIConfigured()) {
        return null;
      }

      // Generate new icon
      const svg = await generateFolderIcon({ folderName });
      
      if (svg) {
        // Cache the generated icon
        cacheIcon(folderId, svg);
        return svg;
      }

      return null;
    },
    staleTime: Infinity, // Icons don't change, so cache forever
    gcTime: Infinity, // Keep in memory cache forever
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Component to render folder icon (SVG or fallback)
 */
export function FolderIconRenderer({ 
  folderId, 
  folderName, 
  className = "h-6 w-6 text-cyan stroke-[1.5]" 
}: { 
  folderId: string; 
  folderName: string;
  className?: string;
}) {
  const { data: svg, isLoading } = useFolderIcon(folderId, folderName);

  // Show fallback while loading or if generation failed
  if (isLoading || !svg) {
    return <Folder className={className} />;
  }

  // Render SVG - modify SVG to apply color classes
  // Extract color from className (text-cyan) and apply to SVG fill/stroke
  const colorMatch = className.match(/text-(\w+)/);
  const color = colorMatch ? colorMatch[1] : 'cyan';
  
  // Apply color to SVG by modifying fill and stroke attributes
  let svgWithStyles = svg;
  
  // If SVG has fill or stroke, replace with currentColor to inherit text color
  svgWithStyles = svgWithStyles.replace(
    /(fill|stroke)=["'][^"']*["']/gi,
    (match, attr) => {
      // Keep 'none' or 'transparent', but replace colors with currentColor
      if (match.includes('none') || match.includes('transparent')) {
        return match;
      }
      return `${attr}="currentColor"`;
    }
  );
  
  // If no fill or stroke attributes, add currentColor to ensure visibility
  if (!svgWithStyles.match(/(fill|stroke)=/i)) {
    svgWithStyles = svgWithStyles.replace(
      /<svg([^>]*)>/i,
      '<svg$1 fill="currentColor">'
    );
  }
  
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      dangerouslySetInnerHTML={{ __html: svgWithStyles }}
    />
  );
}

