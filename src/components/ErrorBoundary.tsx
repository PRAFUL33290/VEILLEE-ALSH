import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Une erreur inattendue est survenue.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, errorInfo);
  }

  private handleReload = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#360408] p-6 text-[#FFF8EA]">
          <div className="w-full max-w-md rounded-2xl border-2 border-[#F5B324]/70 bg-[#48070D] p-6 text-center shadow-2xl">
            <h1 className="text-xl font-extrabold text-[#FDE68A]">
              Le défi des Mudras
            </h1>
            <p className="mt-2 text-sm text-[#F3D9A4]/90">
              Une erreur technique est survenue pendant la synchronisation. Vos données locales
              sont préservées.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#FCD34D] bg-gradient-to-b from-[#DC2626] to-[#991B1B] px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-white cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Recharger le jeu</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
