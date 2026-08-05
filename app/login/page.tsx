'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://mpsnwijabfingujzirri.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wc253aWphYmZpbmd1anppcnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDUzNzIsImV4cCI6MjA4MzQyMTM3Mn0.RTNnZHJRnYjoeX9faOi324CbooNxNaW6Fm2xJrV609M'
);

export default function LoginPage() {
  const router = useRouter();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Status State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSuccessMsg("Login successful! Redirecting...");
      
      setTimeout(() => {
        router.push('/');
      }, 1000);

    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-['Prompt'] selection:bg-[#B08038]/30">
      
      {/* Left Side - Hero Image Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src="https://raw.githubusercontent.com/WaiHmueThit23/wallcraft_assets/main/Band_Introduction/Asset%2091@3x.webp" 
          alt="Wallcraft Aesthetic" 
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
        
        <div className="relative z-10 flex flex-col justify-end p-16 w-full pb-24 text-left">
          <div className="flex gap-1 h-1.5 w-20 mb-6">
            <div className="bg-[#6A6C5F] w-1/3" />
            <div className="bg-[#7B2715] w-1/3" />
            <div className="bg-[#B08038] w-1/3" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4 drop-shadow-lg text-left">
            <span className="text-[#B08038]">Welcome Back <br/> </span>
            <span className="text-[#c2bfb6]">To Wallcraft.</span>
          </h1>
          <p className="text-[#c2bfb6] font-light max-w-md text-sm leading-relaxed text-left">
            Sign in to access your saved textures, download high-resolution assets, and continue your modular wall design projects.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative">
        <div className="w-full max-w-md animate-reveal">
          
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-medium tracking-wide text-[#B08038] mb-2 uppercase">Log In</h2>
            <p className="text-[#c2bfb6] text-sm font-light">Enter your credentials to access your account.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 text-left">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#c2bfb6] font-bold block">Email Address</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#B08038] transition-colors" 
                placeholder="you@example.com" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-[0.2em] text-[#c2bfb6] font-bold block">Password</label>
                <Link href="#" prefetch={false} className="text-[10px] text-[#B08038] hover:text-white transition-colors">Forgot Password?</Link>
              </div>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-sm text-[#c2bfb6] placeholder-zinc-600 focus:outline-none focus:border-[#B08038] transition-colors" 
                placeholder="••••••••" 
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-sm text-red-500 text-xs">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-950/30 border border-green-900/50 rounded-sm text-green-400 text-xs">
                {successMsg}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full mt-4 bg-[#B08038] hover:bg-[#8f662a] text-[#c2bfb6] uppercase text-[11px] font-bold tracking-[0.2em] py-4 rounded-sm transition-all flex justify-center items-center gap-2 disabled:opacity-70"
            >
              {loading ? "Authenticating..." : "Log In"}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-zinc-500 text-xs">
              Don't have an account?{' '}
              <Link href="/register" prefetch={false} className="text-[#B08038] hover:text-white transition-colors underline-offset-4 hover:underline">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes reveal {
            0% { transform: translateY(30px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          .animate-reveal { 
            animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
          }
        `}
      </style>
    </div>
  );
}
