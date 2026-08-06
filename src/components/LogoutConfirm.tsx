'use client';

import React from 'react';
import { AlertTriangle, LogOut, X } from 'lucide-react';

interface LogoutConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirm({ isOpen, onClose, onConfirm }: LogoutConfirmProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-2xl p-6 shadow-2xl z-10 font-mono overflow-hidden">
        
        {/* Glowing emergency accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-60"></div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition outline-none"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon Banner */}
        <div className="flex items-center space-x-3 mb-4 select-none">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sign Out</h3>
            <span className="text-[7px] text-zinc-500 block uppercase tracking-widest mt-0.5">Console Session Guard</span>
          </div>
        </div>

        {/* Confirmation Message */}
        <p className="text-xs text-zinc-300 leading-relaxed mb-6">
          Are you sure you want to sign out? This will terminate your operational credentials session and lock access to the EOC dashboard.
        </p>

        {/* Action Buttons */}
        <div className="flex space-x-3 text-xs uppercase font-bold tracking-wider">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-900 border border-white/15 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition duration-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl transition-all duration-300 shadow-[0_4px_16px_rgba(239,68,68,0.15)] flex items-center justify-center gap-1.5 border border-red-500/20 active:scale-[0.99]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
