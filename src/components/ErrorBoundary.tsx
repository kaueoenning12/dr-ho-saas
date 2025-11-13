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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-foreground mb-4">Algo deu errado</h1>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {this.state.error?.message || "Erro desconhecido"}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-6 py-2 bg-cyan text-white rounded-lg hover:bg-cyan/90 transition-colors mr-3"
              >
                Tentar novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
