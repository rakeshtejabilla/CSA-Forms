import React from 'react';
import { useAuthStore } from '../context/useAuthStore';
import { User, Mail, Shield, Building, Clock, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();

  const roleLabel = (role?: string) => {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ORG_ADMIN') return 'Organization Admin';
    if (role === 'ENUMERATOR') return 'Enumerator';
    return role || 'User';
  };

  const roleBadgeClass = (role?: string) => {
    if (role === 'SUPER_ADMIN') return 'bg-rose-100 text-rose-700 border-rose-200';
    if (role === 'ORG_ADMIN') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Header Profile Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-500 to-indigo-500" />
        
        {/* Avatar */}
        <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 font-extrabold text-3xl shadow-sm shrink-0 border border-brand-200">
          {(user?.name || 'U').charAt(0).toUpperCase()}
        </div>

        <div className="text-center sm:text-left flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">{user?.name || 'User'}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border w-fit mx-auto sm:mx-0 ${roleBadgeClass(user?.role)}`}>
              {roleLabel(user?.role)}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
        <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider text-xs">
          Account Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <User className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Full Name</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{user?.name || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <Mail className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Email Address</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{user?.email || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <Shield className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Security Role</p>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">{roleLabel(user?.role)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <Building className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Organization ID</p>
              <p className="text-xs font-mono font-semibold text-slate-700 mt-0.5">{user?.organizationId || 'System Default'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Security Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-xl">
            <Clock className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Security & Session</h3>
            <p className="text-xs text-slate-400">Manage security settings and active session keys</p>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Session Token Active
          </span>
          <span className="bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase">
            Encrypted
          </span>
        </div>
      </div>
    </div>
  );
}
