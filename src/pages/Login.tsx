import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../context/useAuthStore';
import { Sparkles, Eye, EyeOff, Loader2, User, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const { token, login, register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ENUMERATOR' | 'ORG_ADMIN'>('ENUMERATOR');

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (token) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [token, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (isRegister) {
        await register(name, email, password, role);
      } else {
        await login(email, password);
      }
    } catch {}
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    clearError();
    setEmail('');
    setPassword('');
    setName('');
    setRole('ENUMERATOR');
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-brand-700 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-16 left-16 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-16 right-16 w-48 h-48 bg-white rounded-full blur-2xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Form Builder</h1>
          <p className="text-brand-100 text-lg font-medium">Center For Sustainable Agriculture</p>
          {/* <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Active Forms', value: '200+' },
              { label: 'Submissions', value: '50K+' },
              { label: 'Organizations', value: '120+' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-brand-100 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div> */}
        </div>
      </div>

      {/* Right sign-in panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-slate-800 text-lg">Form Builder</span>
              <span className="text-[10px] block text-slate-400 font-medium">Center For Sustainable Agriculture</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">
            {isRegister ? 'Create Account' : 'Welcome back'}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {isRegister
              ? 'Register a new account to get started'
              : 'Sign in to your account to continue'}
          </p>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm font-medium flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center shrink-0">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {isRegister && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="register-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="glass-input w-full pl-10"
                    required
                  />
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="glass-input w-full pl-10"
                  autoComplete="email"
                  required
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 pr-12"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="glass-input w-full cursor-pointer"
                >
                  <option value="ENUMERATOR">Enumerator (Data Collector)</option>
                  <option value="ORG_ADMIN">Organization Admin</option>
                </select>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-3.5 mt-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isRegister ? 'Registering...' : 'Signing in...'}
                </>
              ) : (
                isRegister ? 'Create Account' : 'Sign in'
              )}
            </button>
          </form>

          {/* <div className="mt-6 text-center">
            <button
              onClick={handleToggleMode}
              className="text-sm text-brand-500 hover:text-brand-600 transition font-medium"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register here"}
            </button>
          </div>

          {!isRegister && (
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-slate-500 text-xs font-semibold text-center uppercase tracking-wide mb-2">
                Demo Credentials
              </p>
              <p className="text-slate-700 text-xs font-mono text-center">
                admin@formbuilder.com &nbsp;/&nbsp; Password123
              </p>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}