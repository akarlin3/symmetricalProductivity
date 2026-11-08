import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { STORAGE_KEY } from './state/defaultState';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <h1 className="text-base font-bold text-slate-100">
              State Recovery Required
            </h1>
            <p className="text-xs text-slate-400 font-mono break-words">
              {this.state.errorMessage || 'Cached state schema mismatch.'}
            </p>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem(STORAGE_KEY);
                } catch {
                  // Ignore
                }
                window.location.reload();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Reset Local State &amp; Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const win = window as unknown as { __SYMMETRY_MOUNTED__?: boolean };
if (!win.__SYMMETRY_MOUNTED__) {
  win.__SYMMETRY_MOUNTED__ = true;
  const rootEl = document.getElementById('root')!;
  rootEl.innerHTML = '';
  createRoot(rootEl).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>
  );
}
