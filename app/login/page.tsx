'use client'

import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, AlertCircle, CheckCircle2, UserPlus, ArrowRight, Globe } from 'lucide-react';
import { Button } from '../../components/Button';
import { useSupabase } from '../../lib/supabase/supabaseProvider';
import { supabase } from '../../lib/supabase/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { user, loading: authLoading } = useSupabase();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  // 检查用户是否已登录
  useEffect(() => {
    if (!authLoading && user) {
      // 用户已登录，重定向到首页
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 表单验证
    if (!email || !password) {
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
        // 注册
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) {
          throw error;
        }
        setSuccess('注册成功，请检查邮箱并登录');
        setIsSignUp(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        // 登录
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          throw error;
        }
        // 登录成功，重定向到首页
        router.push('/');
      }
    } catch (error: any) {
      setError(error.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-ocean-950 to-ocean-900">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center text-center space-y-6 animate-float">
          <div className="relative">
            <div className="absolute -inset-4 bg-ocean-400/20 rounded-full blur-xl animate-pulse-slow"></div>
            <Globe size={80} className="text-ocean-100 relative z-10" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-ocean-400 mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              万界传说
            </h1>
            <p className="text-ocean-100/80 text-lg font-sans max-w-lg mx-auto">
              {isSignUp ? "创建新的时空账号" : "登录你的时空账号"}
            </p>
          </div>

          <div className="w-full bg-ocean-900/40 p-8 rounded-xl border border-ocean-700/50 backdrop-blur-sm shadow-xl transition-all duration-500">
            {error && (
              <div className="flex items-center gap-2 text-red-300 bg-red-900/20 border border-red-800/30 p-3 rounded-lg mb-4">
                <AlertCircle size={18} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-300 bg-green-900/20 border border-green-800/30 p-3 rounded-lg mb-4">
                <CheckCircle2 size={18} />
                <span className="text-sm">{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="text-ocean-100 text-sm font-serif flex items-center gap-2">
                    <Mail size={16} />
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-ocean-900/80 border border-ocean-600 rounded-lg px-4 py-3 text-white placeholder-ocean-500/70 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-all font-story"
                    required
                  />
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-ocean-100 text-sm font-serif flex items-center gap-2">
                    <Lock size={16} />
                    密码
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-ocean-900/80 border border-ocean-600 rounded-lg px-4 py-3 text-white placeholder-ocean-500/70 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-all font-story"
                    required
                  />
                </div>

                {isSignUp && (
                  <div className="space-y-2 text-left">
                    <label className="text-ocean-100 text-sm font-serif flex items-center gap-2">
                      <Lock size={16} />
                      确认密码
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-ocean-900/80 border border-ocean-600 rounded-lg px-4 py-3 text-white placeholder-ocean-500/70 focus:outline-none focus:border-ocean-400 focus:ring-1 focus:ring-ocean-400 transition-all font-story"
                      required
                    />
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                isLoading={loading} 
                className="w-full text-lg mt-4 flex justify-between items-center group"
              >
                <span>{isSignUp ? '注册' : '登录'}</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-ocean-400 hover:text-ocean-300 text-sm font-serif transition-colors flex items-center gap-1 mx-auto"
                >
                  {isSignUp ? (
                    <>
                      <User size={14} />
                      已有账号？立即登录
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      没有账号？立即注册
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="text-center mt-8">
            <p className="text-ocean-400/60 text-xs font-serif">
              登录即表示你同意我们的服务条款和隐私政策
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
