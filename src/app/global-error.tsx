'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white font-mono select-none">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-6 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="flex justify-center text-amber-400">
            <AlertTriangle className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-sm font-bold tracking-wider uppercase text-cyan-400">
            ResQ-AI System Reconnected
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The emergency portal has refreshed its active session.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.clear();
              } catch (e) {}
              reset();
            }}
            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reconnect Terminal</span>
          </button>
        </div>
      </body>
    </html>
  );
}
