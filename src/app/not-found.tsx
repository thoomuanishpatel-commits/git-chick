'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full bg-zinc-950 text-white font-mono flex flex-col items-center justify-center p-6 text-center selection:bg-cyan-500 selection:text-black">
      <div className="w-16 h-16 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-6 shadow-[0_0_30px_rgba(6,182,212,0.25)] animate-pulse">
        <Compass className="w-8 h-8" />
      </div>

      <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest bg-cyan-950/60 border border-cyan-500/20 px-3 py-1 rounded-full mb-3">
        404 — SECTOR NOT FOUND
      </span>

      <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-white mb-2">
        Requested Pathway Unavailable
      </h1>

      <p className="text-xs text-zinc-400 max-w-md leading-relaxed mb-8">
        The disaster response route you requested does not exist or has been relocated to another sector. Please return to the central command portal.
      </p>

      <Link
        href="/"
        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95 flex items-center gap-2 cursor-pointer"
      >
        <span className="text-base">🏠</span>
        <span>Go Back Home</span>
      </Link>
    </div>
  );
}
