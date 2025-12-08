/**
 * Service for generating folder icons using OpenAI API
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT = 10000; // 10 seconds

interface GenerateIconOptions {
  folderName: string;
  timeout?: number;
}

/**
 * Generate an SVG icon for a folder based on its name/theme using OpenAI
 */
export async function generateFolderIcon(
  options: GenerateIconOptions
): Promise<string | null> {
  const { folderName, timeout = REQUEST_TIMEOUT } = options;

  if (!OPENAI_API_KEY) {
    console.warn('[OpenAI Icon] API key not configured');
    return null;
  }

  const prompt = `Você é um designer de ícones especializado em criar ícones SVG minimalistas e representativos.

CONTEXTO: Esta pasta contém documentos relacionados a segurança do trabalho, saúde ocupacional, normas regulamentadoras (NRs), EPIs, treinamentos, legislação trabalhista e procedimentos de segurança.

NOME DA PASTA: "${folderName}"

TAREFA: Crie um ícone SVG que represente VISUALMENTE e ESPECIFICAMENTE o conteúdo/tema desta pasta. O ícone deve ser imediatamente reconhecível e relacionado ao nome da pasta.

INSTRUÇÕES:
1. Analise o nome da pasta "${folderName}" e identifique o tema/conceito principal
2. Crie um ícone que represente esse tema de forma clara e direta
3. Exemplos de mapeamento:
   - "EPI" ou "Equipamentos" → ícone de capacete, óculos, luvas, ou escudo de proteção
   - "Treinamento" ou "Cursos" → ícone de livro, certificado, ou capelo de formatura
   - "Normas" ou "NR" → ícone de documento com selo, lista de verificação, ou regulamento
   - "Legislação" → ícone de balança da justiça, documento oficial, ou código legal
   - "SST" ou "Segurança" → ícone de escudo, sinal de segurança, ou capacete
   - "Procedimentos" → ícone de checklist, fluxograma, ou documento com passos
   - "Relatórios" → ícone de gráfico, documento com dados, ou planilha
   - "Manuais" → ícone de livro aberto, manual técnico, ou guia
   - "Boas Práticas" → ícone de estrela, check verde, ou troféu

REQUISITOS TÉCNICOS:
- SVG minimalista e limpo, estilo flat design
- Dimensões: viewBox="0 0 24 24"
- Use apenas stroke (sem fill) ou fill sólido simples
- Cores: use apenas uma cor (preferencialmente preto/cinza escuro para stroke, ou cor sólida para fill)
- Linhas: stroke-width entre 1.5 e 2
- Sem gradientes, sombras ou efeitos complexos
- Adequado para exibição em 24x24 pixels

IMPORTANTE: O ícone DEVE estar diretamente relacionado ao tema da pasta. Se a pasta se chama "EPI", o ícone deve ser claramente um equipamento de proteção. Se é "Treinamento", deve ser claramente algo relacionado a educação/aprendizado.

Retorne APENAS o código SVG completo, sem markdown, sem explicações, sem comentários. Apenas o código SVG puro.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using mini for cost efficiency
        messages: [
          {
            role: 'system',
            content: 'You are an expert SVG icon designer specializing in creating meaningful, contextually relevant icons for document management systems. Your icons must clearly represent the folder\'s theme and content. Always return only the raw SVG code without any markdown formatting, explanations, or code blocks. The icon must be directly related to the folder name and its meaning.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[OpenAI Icon] API error:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      console.warn('[OpenAI Icon] No content in response');
      return null;
    }

    // Extract SVG from response (remove markdown code blocks if present)
    let svg = content
      .replace(/```svg\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/```html\n?/g, '')
      .trim();

    // Ensure it starts with <svg
    if (!svg.startsWith('<svg')) {
      // Try to extract SVG tag
      const svgMatch = svg.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        svg = svgMatch[0];
      } else {
        console.warn('[OpenAI Icon] Invalid SVG format');
        return null;
      }
    }

    // Validate and sanitize SVG
    const sanitizedSvg = sanitizeSvg(svg);
    if (!sanitizedSvg) {
      console.warn('[OpenAI Icon] SVG validation failed');
      return null;
    }

    return sanitizedSvg;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('[OpenAI Icon] Request timeout');
    } else {
      console.error('[OpenAI Icon] Error generating icon:', error);
    }
    return null;
  }
}

/**
 * Sanitize and validate SVG content
 */
function sanitizeSvg(svg: string): string | null {
  try {
    // Basic validation - check if it's a valid SVG structure
    if (!svg.includes('<svg') || !svg.includes('</svg>')) {
      return null;
    }

    // Ensure viewBox is set for proper scaling
    if (!svg.includes('viewBox')) {
      // Try to add viewBox if not present
      svg = svg.replace(
        /<svg([^>]*)>/i,
        '<svg$1 viewBox="0 0 24 24">'
      );
    }

    // Remove potentially dangerous attributes/scripts
    svg = svg
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, ''); // Remove javascript: protocols

    // Ensure SVG has proper namespace
    if (!svg.includes('xmlns=')) {
      svg = svg.replace(
        /<svg([^>]*)>/i,
        '<svg$1 xmlns="http://www.w3.org/2000/svg">'
      );
    }

    return svg;
  } catch (error) {
    console.error('[OpenAI Icon] SVG sanitization error:', error);
    return null;
  }
}

/**
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

