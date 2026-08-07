'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff, Loader2, Compass, Radio, Server } from 'lucide-react';

export default function Login({ onBackToPortal }: { onBackToPortal?: () => void }) {
  const { login, inactivityWarning, dismissInactivityWarning } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string; general?: string }>({});
  const [authSuccess, setAuthSuccess] = useState(false);

  // Auto-dismiss inactivity warning when user starts editing credentials
  useEffect(() => {
    if (inactivityWarning && (username || password)) {
      dismissInactivityWarning();
    }
  }, [username, password, inactivityWarning, dismissInactivityWarning]);

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = 'Department email is required';
    } else if (!username.includes('@')) {
      newErrors.username = 'Enter a valid department security address';
    }
    
    if (!password) {
      newErrors.password = 'Security passphrase is required';
    } else if (password.length < 6) {
      newErrors.password = 'Passphrase must contain at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || authSuccess) return;
    
    setErrors({});
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const res = await login(username, password, rememberMe);
      if (res.success) {
        setAuthSuccess(true);
      } else {
        setErrors({ general: res.error || 'Authentication denied. Check credentials.' });
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrors({ general: 'EOC secure gate offline. Please retry.' });
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col md:flex-row text-white selection:bg-cyan-500 selection:text-black font-sans relative overflow-hidden"
      style={{
        backgroundImage: 'url(/admin_background.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      
      {/* LEFT SIDE: Full-Height Animated Disaster Hero Section */}
      <div className="w-full md:w-1/2 relative bg-slate-950/30 border-r border-white/5 flex flex-col justify-between p-8 md:p-12 overflow-hidden h-[40vh] md:h-auto">
        
        {/* Animated Cyber Grid Overlay */}
        <div className="absolute inset-0 cyber-grid-moving opacity-20 pointer-events-none"></div>
        
        {/* Radial Ambient Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none"></div>

        {/* Top Header Tag */}
        <div className="flex items-center justify-between w-full z-10 select-none">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-black text-sm font-mono tracking-tighter shadow-lg shadow-cyan-500/15">
              RQ
            </div>
            <div>
              <span className="font-bold tracking-wider text-xs uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent block">
                TSDMA ResQAI
              </span>
              <span className="text-[7px] font-mono text-zinc-500 block uppercase tracking-widest mt-0.5">Tactical Control Terminal</span>
            </div>
          </div>
          
          {onBackToPortal && (
            <button
              onClick={onBackToPortal}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-zinc-500 text-zinc-300 hover:text-white transition text-[9px] uppercase tracking-wider font-mono"
            >
              ← Back to Portal
            </button>
          )}
        </div>


        {/* Parallax Floating Tactical Modules Indicator */}
        <div className="z-10 my-auto text-left max-w-sm select-none hidden md:block">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent leading-tight font-mono">
            TELANGANA STATE EOC
          </h1>
          <p className="text-[10px] text-zinc-400 font-mono mt-2 leading-relaxed uppercase tracking-wider">
            Operational grade command console. Monitoring realtime telemetry, automated dispatch routing, and citizen SOS requests.
          </p>
          
          {/* Floating Indicators grid */}
          <div className="grid grid-cols-2 gap-3 mt-6 text-[8px] font-mono text-zinc-400">
            <div className="flex items-center space-x-2 bg-white/[0.02] border border-white/5 p-2 rounded-lg backdrop-blur-sm">
              <span className="text-cyan-400">🌊</span>
              <span>FLOOD ANALYSIS</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/[0.02] border border-white/5 p-2 rounded-lg backdrop-blur-sm">
              <span className="text-red-400">🔥</span>
              <span>FIRE RESPONSE</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/[0.02] border border-white/5 p-2 rounded-lg backdrop-blur-sm">
              <span className="text-purple-400">🛰️</span>
              <span>SATELLITE INTEL</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/[0.02] border border-white/5 p-2 rounded-lg backdrop-blur-sm">
              <span className="text-emerald-400">🚒</span>
              <span>TACTICAL FLEET</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="z-10 flex justify-between items-center text-[8px] font-mono text-zinc-500 uppercase tracking-widest border-t border-white/5 pt-4">
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Gate Secure</span>
          </div>
          <span>v2.8-stable</span>
        </div>
      </div>

      {/* RIGHT SIDE: Centered premium Glassmorphism Login Card */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 relative bg-transparent">
        
        {/* Ambient background glows */}
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-cyan-600/5 blur-[100px] pointer-events-none"></div>

        {/* Actual Form Card */}
        <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-2xl relative shadow-2xl border border-white/10 overflow-hidden">
          
          {/* Card subtle scan line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-30 shadow-[0_1px_8px_#06b6d4]"></div>

          {/* Access Granted Overlay Animation */}
          {authSuccess && (
            <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-cyan-950 border border-cyan-500 flex items-center justify-center shadow-[0_0_24px_rgba(6,182,212,0.3)] mb-4 animate-bounce">
                <Shield className="w-7 h-7 text-cyan-400" />
              </div>
              <h2 className="text-lg font-bold tracking-wider font-mono text-white uppercase">ACCESS GRANTED</h2>
              <p className="text-[10px] text-zinc-400 font-mono mt-1 uppercase tracking-widest">Welcome Back, Department Official</p>
              
              <div className="mt-8 flex flex-col items-center space-y-2">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                <span className="text-[8px] font-mono text-cyan-500 animate-pulse tracking-widest uppercase">Initializing Telemetry Networks...</span>
              </div>
            </div>
          )}

          {/* Login Card Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center shadow-inner mb-3">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-base font-bold tracking-wider uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent font-mono">
              Disaster Management Department
            </h2>
            <p className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase mt-0.5">
              Secure Emergency Operations Portal
            </p>
          </div>

          {/* Inactivity timeout alert */}
          {inactivityWarning && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-[9px] font-mono mb-4 flex items-start gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="leading-tight">
                <div className="font-bold">SESSION AUTO-LOGOUT</div>
                <div className="opacity-85 mt-0.5">You were logged out due to 10 minutes of operational inactivity. Please sign in again.</div>
              </div>
            </div>
          )}

          {/* General Auth Error Message */}
          {errors.general && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-xl text-[9px] font-mono mb-4 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="leading-tight">
                <div className="font-bold">SECURITY BARRIER</div>
                <div className="opacity-85 mt-0.5">{errors.general}</div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 font-mono">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label htmlFor="username-field" className="text-[8px] text-zinc-400 uppercase tracking-widest font-bold block">
                Security Username (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <input
                  id="username-field"
                  type="text"
                  placeholder="officer@tsdma.gov.in"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting || authSuccess}
                  className={`w-full pl-9 pr-4 py-2.5 text-xs bg-zinc-950/80 border rounded-xl outline-none transition focus:bg-zinc-950 focus:shadow-[0_0_12px_rgba(6,182,212,0.15)] ${
                    errors.username ? 'border-red-500/50 text-red-200' : 'border-white/10 text-white focus:border-cyan-500/50'
                  }`}
                  aria-invalid={!!errors.username}
                  aria-describedby={errors.username ? 'username-error' : undefined}
                />
              </div>
              {errors.username && (
                <p id="username-error" className="text-red-400 text-[8px] tracking-wide mt-1">
                  * {errors.username}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password-field" className="text-[8px] text-zinc-400 uppercase tracking-widest font-bold block">
                  Security Passphrase
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[8px] text-zinc-500 hover:text-zinc-300 transition outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? 'HIDE PASSPHRASE' : 'SHOW PASSPHRASE'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <input
                  id="password-field"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting || authSuccess}
                  className={`w-full pl-9 pr-10 py-2.5 text-xs bg-zinc-950/80 border rounded-xl outline-none transition focus:bg-zinc-950 focus:shadow-[0_0_12px_rgba(6,182,212,0.15)] ${
                    errors.password ? 'border-red-500/50 text-red-200' : 'border-white/10 text-white focus:border-cyan-500/50'
                  }`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-red-400 text-[8px] tracking-wide mt-1">
                  * {errors.password}
                </p>
              )}
            </div>

            {/* Checkbox & Forgot link */}
            <div className="flex justify-between items-center text-[9px] pt-1 select-none">
              <label className="flex items-center space-x-2 text-zinc-400 hover:text-white cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting || authSuccess}
                  className="w-3.5 h-3.5 rounded border-white/10 bg-zinc-950 checked:bg-cyan-500 checked:border-cyan-500 outline-none transition focus:ring-1 focus:ring-cyan-500"
                />
                <span>REMEMBER CONSOLE SESSION</span>
              </label>

              <button
                type="button"
                onClick={() => alert('TSDMA Security Directive: Passphrase resets require secure physical EOC smartcard authorization. Contact EOC Network Operations Center.')}
                className="text-cyan-500 hover:text-cyan-400 hover:underline transition"
              >
                FORGOT PASSPHRASE?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting || authSuccess}
              className="w-full relative py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-zinc-950 font-bold uppercase rounded-xl transition-all duration-300 shadow-[0_4px_16px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2 border border-cyan-400/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-xs tracking-wider"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>SECURE GATEWAY SCANS ACTIVE...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-zinc-950" />
                  <span>SIGN IN TO EMERGENCY INTERFACE</span>
                </>
              )}
            </button>
          </form>

          {/* Warning Footer */}
          <div className="mt-6 border-t border-white/5 pt-4 text-center font-mono text-[8px] text-zinc-500 leading-normal uppercase select-none">
            <div className="font-bold text-red-500/80 tracking-widest flex items-center justify-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full animate-ping"></span>
              <span>AUTHORIZED EOC PERSONNEL ONLY</span>
            </div>
            <div className="opacity-75 mt-0.5">UNAUTHORIZED ACCESS IS STRICTLY PROHIBITED BY STATE SECURITY DIRECTIVES.</div>
          </div>
        </div>
      </div>

      {/* Global CSS for Parallax Cyber Grid */}
      <style jsx>{`
        .cyber-grid-moving {
          background-size: 30px 30px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          animation: grid-scroll 60s linear infinite;
        }
        @keyframes grid-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 500px 500px; }
        }
        .animate-spin-slow {
          animation: spin 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
