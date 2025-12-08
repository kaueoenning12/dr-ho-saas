import type { Json } from "@/integrations/supabase/types";

/**
 * Clean a single feature string by removing quotes, escapes, brackets, and extra characters
 */
function cleanFeatureString(str: string): string {
  let cleaned = str.trim();
  
  // Remove leading/trailing brackets
  cleaned = cleaned.replace(/^\[+|\]+$/g, "");
  
  // Remove leading/trailing quotes (single or double)
  cleaned = cleaned.replace(/^["']+|["']+$/g, "");
  
  // Remove escape sequences - handle multiple levels
  cleaned = cleaned.replace(/\\\\+/g, "");
  cleaned = cleaned.replace(/\\"/g, '"');
  cleaned = cleaned.replace(/\\'/g, "'");
  cleaned = cleaned.replace(/\\/g, "");
  
  // Remove any remaining leading/trailing quotes and brackets after cleaning escapes
  cleaned = cleaned.replace(/^["'\[\]]+|["'\[\]]+$/g, "");
  
  // Remove trailing commas and spaces
  cleaned = cleaned.replace(/,\s*$/, "").trim();
  
  // Remove any remaining brackets in the middle (shouldn't happen, but just in case)
  cleaned = cleaned.replace(/[\[\]]/g, "");
  
  return cleaned;
}

/**
 * Parse features from various formats, handling double-encoded JSON and escape sequences
 * @param features - Features in various formats: string, array, JSON string, or null/undefined
 * @returns Array of clean feature strings
 */
export function parseFeatures(
  features: string | null | undefined | Json | string[]
): string[] {
  // Handle null/undefined
  if (!features) return [];

  // If already an array, process it
  if (Array.isArray(features)) {
    // Check if it's a simple array of strings (not nested JSON strings)
    const allSimpleStrings = features.every(
      item => typeof item === "string" && 
      !item.trim().startsWith("[") && 
      !item.trim().startsWith('"[') &&
      !item.includes('\\"')
    );
    
    if (allSimpleStrings) {
      return features
        .map((f) => cleanFeatureString(String(f)))
        .filter(Boolean);
    }
    
    // If array has only one item and it's a string that looks like JSON, parse it
    if (features.length === 1 && typeof features[0] === "string") {
      const singleItem = features[0].trim();
      
      // Check if it looks like a JSON array string
      if (singleItem.startsWith("[") || singleItem.startsWith('"[')) {
        try {
          // Remove outer quotes if present
          let toParse = singleItem;
          if (toParse.startsWith('"') && toParse.endsWith('"')) {
            toParse = toParse.slice(1, -1);
          }
          
          // Clean escape sequences before parsing
          toParse = toParse.replace(/\\\\/g, "\\");
          toParse = toParse.replace(/\\"/g, '"');
          
          // Try to parse
          let innerParsed = JSON.parse(toParse);
          
          // If we got a string, try parsing again (double-encoded)
          if (typeof innerParsed === "string") {
            innerParsed = JSON.parse(innerParsed);
          }
          
          if (Array.isArray(innerParsed)) {
            // Recursively parse the inner array
            return parseFeatures(innerParsed);
          }
        } catch (e) {
          // If parsing fails, try a more aggressive approach
          try {
            // Try to extract array content manually
            let content = singleItem;
            // Remove outer array brackets and quotes
            content = content.replace(/^\[?"?|"?\]?$/g, "");
            // Split by comma and clean each item
            if (content.includes(",") || content.includes('",')) {
              const items = content.split(/",?\s*|,\s*"/);
              return items
                .map(item => cleanFeatureString(item))
                .filter(Boolean);
            }
          } catch (e2) {
            console.warn("[parseFeatures] Failed to parse:", e2);
          }
        }
      }
    }
    
    // Process array items recursively
    const result: string[] = [];
    for (const item of features) {
      if (Array.isArray(item)) {
        const nested = parseFeatures(item);
        result.push(...nested);
      } else if (typeof item === "string") {
        const trimmed = item.trim();
        
        // Check if string is a JSON array
        if (trimmed.startsWith("[") || trimmed.startsWith('"[')) {
          try {
            let toParse = trimmed;
            if (toParse.startsWith('"') && toParse.endsWith('"')) {
              toParse = toParse.slice(1, -1);
            }
            toParse = toParse.replace(/\\\\/g, "\\");
            toParse = toParse.replace(/\\"/g, '"');
            
            const innerParsed = JSON.parse(toParse);
            if (Array.isArray(innerParsed)) {
              const nested = parseFeatures(innerParsed);
              result.push(...nested);
              continue;
            }
          } catch {
            // If parsing fails, try splitting by comma
            if (trimmed.includes(",") || trimmed.includes('",')) {
              const items = trimmed.split(/",?\s*|,\s*"/);
              items.forEach(subItem => {
                const cleaned = cleanFeatureString(subItem);
                if (cleaned) result.push(cleaned);
              });
              continue;
            }
          }
        }
        
        // Clean up the string
        const cleaned = cleanFeatureString(trimmed);
        if (cleaned) {
          result.push(cleaned);
        }
      } else {
        const str = String(item).trim();
        if (str) {
          result.push(cleanFeatureString(str));
        }
      }
    }
    return result.filter(Boolean);
  }

  // Convert to string if not already
  let featuresStr = typeof features === "string" ? features : String(features);
  featuresStr = featuresStr.trim();

  if (!featuresStr) return [];

  // Try to parse as JSON multiple times (handles double-encoded JSON)
  let parsed: any = featuresStr;
  let maxAttempts = 5;
  let attempts = 0;

  while (attempts < maxAttempts && typeof parsed === "string") {
    try {
      // Clean before parsing
      let toParse = parsed;
      toParse = toParse.replace(/\\\\/g, "\\");
      toParse = toParse.replace(/\\"/g, '"');
      
      const attempt = JSON.parse(toParse);
      
      // If we got an array, check if it needs further parsing
      if (Array.isArray(attempt)) {
        // Recursively parse the array
        return parseFeatures(attempt);
      }
      // If we got a non-string, we're done
      if (typeof attempt !== "string") {
        parsed = attempt;
        break;
      }
      // If we got a string, try parsing again (might be double-encoded)
      parsed = attempt;
      attempts++;
    } catch {
      // If parsing fails, try splitting by comma
      if (parsed.includes(",") || parsed.includes('",')) {
        const items = parsed.split(/",?\s*|,\s*"/);
        return items
          .map(item => cleanFeatureString(item))
          .filter(Boolean);
      }
      // If parsing fails, break and handle as plain string
      break;
    }
  }

  // If it's still a string, try to split it
  if (typeof parsed === "string") {
    // Try splitting by newlines first
    if (parsed.includes("\n")) {
      return parsed
        .split("\n")
        .map((f) => cleanFeatureString(f))
        .filter(Boolean);
    }
    // Try splitting by commas
    if (parsed.includes(",") || parsed.includes('",')) {
      const items = parsed.split(/",?\s*|,\s*"/);
      return items
        .map(item => cleanFeatureString(item))
        .filter(Boolean);
    }
    // Return as single item
    const cleaned = cleanFeatureString(parsed);
    return cleaned ? [cleaned] : [];
  }

  // Fallback: return as single item array
  const cleaned = cleanFeatureString(String(parsed));
  return cleaned ? [cleaned] : [];
}

