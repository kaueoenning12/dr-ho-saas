import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core dependencies
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor';
            }
            if (id.includes('react-router-dom')) {
              return 'router';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase';
            }
            if (id.includes('@radix-ui')) {
              return 'ui';
            }
            if (id.includes('pdfjs-dist') || id.includes('react-pdf')) {
              return 'pdf';
            }
            // Other node_modules go to vendor
            return 'vendor';
          }
          
          // Critical pages that should be separate chunks
          if (id.includes('src/pages/DocumentView')) {
            return 'document-view';
          }
          if (id.includes('src/pages/Documents')) {
            return 'documents';
          }
          if (id.includes('src/pages/Admin')) {
            return 'admin';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1500,
    sourcemap: mode === 'development',
    minify: 'esbuild',
    target: 'esnext',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
    ],
    force: true,
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
}));
