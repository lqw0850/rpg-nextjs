'use client'

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../lib/supabase/supabaseProvider';
import { supabase } from '../../lib/supabase/supabaseClient';
import { useRouter } from 'next/navigation';
import { TribalBackground } from '../../components/TribalBackground';

export default function LoginPage() {
  const { user, loading: authLoading } = useSupabase();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('请填写所有必填字段');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: username,
          password
        });
        if (error) {
          throw error;
        }
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: username,
          password
        });
        if (error) {
          throw error;
        }
        router.push('/');
      }
    } catch (error: any) {
      setError(error.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#EFEAD8] text-ink flex items-center justify-center font-sans">
      <TribalBackground />

      <div className="flex flex-col items-center w-full max-w-md mx-auto relative z-10 pt-[10vh] pb-10 transition-all duration-300">
        <h1 className="font-theme text-7xl md:text-8xl text-ink mb-8 select-none drop-shadow-sm opacity-90 text-center"
          style={{ 
              color: '#B0947A',
              fontSize: '200px',
              textAlign: 'center'
            }}>
          ReBelief
        </h1>

        <div className="w-full space-y-6">
          <div className="space-y-2 relative">
            <label className="font-hand text-2xl text-ink font-bold block">Username</label>
            <div className="relative">
              <input
                type="text"
                placeholder={isSignUp ? "Enter your email or account name" : "Enter your username"}
                className="w-full bg-white rounded-xl py-3 px-4 text-xl font-serif text-gray-700 shadow-lg border-none focus:outline-none focus:ring-2 focus:ring-ink/20 placeholder-gray-400"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-hand text-2xl text-ink font-bold block">Password</label>
            <input
              type="password"
              placeholder="Enter your Password"
              className="w-full bg-white rounded-xl py-3 px-4 text-xl font-serif text-gray-700 shadow-lg border-none focus:outline-none focus:ring-2 focus:ring-ink/20 placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isSignUp && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="font-hand text-2xl text-ink font-bold block">Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm your Password"
                className="w-full bg-white rounded-xl py-3 px-4 text-xl font-serif text-gray-700 shadow-lg border-none focus:outline-none focus:ring-2 focus:ring-ink/20 placeholder-gray-400"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm font-serif text-center">
              {error}
            </div>
          )}

          <div className="pt-8 text-center space-y-4">
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="font-hand text-4xl text-ink hover:scale-105 transition-transform font-bold block w-full text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Your Account' : 'Log In')}
            </button>
            
            <div className="flex items-center justify-center gap-2 font-serif text-lg text-ink font-bold">
              <span>{isSignUp ? "Already have an account?" : "Don't have an account?"}</span>
              <button 
                onClick={() => setIsSignUp(!isSignUp)}
                className="underline decoration-2 underline-offset-4 hover:text-ink-light transition-colors"
              >
                {isSignUp ? 'Log In now' : 'Join ReBelief now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
