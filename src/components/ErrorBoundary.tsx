import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Log additional diagnostic info for chunk loading errors
    if (error.message?.includes('Failed to fetch dynamically imported module')) {
      console.error('🔴 Chunk Loading Error Details:', {
        message: error.message,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        online: navigator.onLine,
        url: window.location.href
      });
    }
  }

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('Failed to fetch dynamically imported module');
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8 max-w-lg">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              {isChunkError ? 'Erro ao Carregar Componente' : 'Algo deu errado'}
            </h1>
            <p className="text-muted-foreground mb-4">
              {isChunkError 
                ? 'Não foi possível carregar alguns recursos da aplicação. Isso geralmente acontece devido a cache desatualizado.'
                : this.state.error?.message || "Erro desconhecido"}
            </p>
            {isChunkError && (
              <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6 text-sm text-left">
                <p className="font-semibold mb-2">💡 Soluções recomendadas:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Pressione <kbd className="px-2 py-1 bg-background border rounded">Ctrl + Shift + R</kbd> (Windows/Linux) ou <kbd className="px-2 py-1 bg-background border rounded">Cmd + Shift + R</kbd> (Mac)</li>
                  <li>Limpe o cache do navegador</li>
                  <li>Tente em modo anônimo/privado</li>
                </ol>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Recarregar Página
              </button>
              <button
                onClick={async () => {
                  // Clear all caches and reload
                  if ('caches' in window) {
                    try {
                      const names = await caches.keys();
                      await Promise.all(names.map(name => caches.delete(name)));
                    } catch (e) {
                      console.error('Failed to clear cache:', e);
                    }
                  }
                  window.location.reload();
                }}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors font-medium"
              >
                Limpar Cache e Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
