'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  formatDateWIT,
  formatTimeWIT,
  getNowWIT,
} from '@backend/index';
import {
  Lock,
  UserCheck,
  LogIn,
  Cloud,
  AlertCircle,
} from 'lucide-react';

export function LoginScreen() {
  const { login } = useAppStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [clockText, setClockText] = useState('--:--:-- WIT');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const d = getNowWIT();
      setClockText(`${formatTimeWIT(d)} • ${formatDateWIT(d)}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const ok = await login(username, password);
      if (!ok) {
        setErrorMsg(
          'Invalid credentials. Please verify your username/password in Supabase.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="dedicatedLoginScreen"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-950"
    >
      {/* Full-viewport Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 transform scale-105"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/d/1ssNXxu0_sfFSgaJ2-3UBEmU29F68avag')",
        }}
        aria-hidden="true"
      />

      {/* Semi-transparent Dark Overlay for High Contrast & Readability */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/70 to-sky-950/80 backdrop-blur-[3px]"
        aria-hidden="true"
      />

      {/* Centered Login Card with Modern Frosted Glassmorphism */}
      <div className="relative w-full max-w-md my-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden ring-1 ring-black/10 transition-all duration-300">
        {/* Top Decorative Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-sky-600 via-emerald-500 to-amber-500" />

        {/* Header & Branding */}
        <div className="p-6 sm:p-8 bg-gradient-to-b from-white/90 to-white/60 border-b border-slate-100/80 text-center">
          {/* Dual Brand Logos */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4">
            <div className="h-12 px-3.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-sm">
              <img
                src="/logos/bp-tangguh-logo.png"
                alt="BP Tangguh LNG"
                className="h-8 w-auto object-contain"
              />
            </div>
            <span className="text-slate-300 font-light text-xl select-none">
              |
            </span>
            <div className="h-12 px-3.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shadow-sm">
              <img
                src="/logos/samudera-logo.png"
                alt="Samudera Indonesia"
                className="h-7 max-w-[145px] object-contain"
              />
            </div>
          </div>

          {/* Clean Title & Subtitle */}
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Welcome
          </h1>
          <p className="text-xs text-slate-600 mt-1 font-medium">
            Tangguh Fuel Supply Monitoring • Offshore Operations
          </p>

          {/* Live WIT Clock Pill */}
          <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-1 rounded-full bg-sky-50/90 text-sky-800 border border-sky-200/80 text-[11px] font-mono shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{clockText}</span>
          </div>
        </div>

        {/* Login Form Body */}
        <div className="p-6 sm:p-8 bg-slate-50/50 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Enter email or username (e.g. admin)"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 bg-white transition font-medium text-slate-800 placeholder-slate-400 shadow-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600 bg-white transition text-slate-800 placeholder-slate-400 shadow-xs"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#0B557C] hover:bg-sky-900 active:scale-[0.99] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Verifying with Supabase...'
                  : 'Sign In to Operational Portal'}
              </span>
            </button>
          </form>

          <div className="rounded-xl p-3 bg-white/80 border border-slate-200/70 text-center">
            <span className="text-[11px] text-slate-700 font-semibold block">
              Single Sign-On &amp; RBAC Protected System
            </span>
            <span className="text-[10px] text-slate-400">
              Authorized personnel only • Contact administrator for credentials
            </span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5 font-medium">
            <Cloud className="w-3.5 h-3.5 text-sky-600" />
            <span>Cloud Real-Time Active</span>
          </span>
          <span>Standard Marine Bunkering v2.0</span>
        </div>
      </div>
    </div>
  );
}
