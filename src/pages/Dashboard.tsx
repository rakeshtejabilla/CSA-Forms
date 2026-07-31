import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../context/useAuthStore';
import {
  LayoutDashboard,
  FileText,
  BarChart2,
  Clock,
  Layers,
  TrendingUp,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Download,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface FormSummary {
  id: string;
  title: string;
  description?: string;
  version: number;
  fields: any[];
  isActive?: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/forms`, { headers: { Authorization: `Bearer ${token}` } });
        setForms(res.data || []);
        const sum = (res.data || []).reduce((acc: number, f: any) => acc + (f.submissionCount || 0), 0);
        setTotalSubmissions(sum);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const activeForms = forms.filter((f) => f.status === 'PUBLISHED');
  const recentForms = [...forms]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  const downloadTemplate = (form: FormSummary) => {
    const fields = (form.fields || []) as any[];
    // Build header row from field labels, falling back to id
    const headers = fields.map((f: any) => f.label || f.id || 'Field');
    // Build an example row with field IDs as hints
    const exampleRow = fields.map((f: any) => {
      const type = (f.type || '').toLowerCase();
      if (type === 'number') return 0;
      if (type === 'date') return new Date().toISOString().split('T')[0];
      if (type === 'radio' || type === 'select' || type === 'dropdown') {
        const opts = (f.options || []).map((o: any) =>
          typeof o === 'object' ? o.label || o.value : o
        );
        return opts.length ? `e.g. ${opts.slice(0, 3).join(' / ')}` : '';
      }
      if (type === 'checkbox') {
        const opts = (f.options || []).map((o: any) =>
          typeof o === 'object' ? o.label || o.value : o
        );
        return opts.length ? `e.g. ${opts[0]}` : '';
      }
      return '';
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    // Style header row width
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'data');
    const safeTitle = (form.title || 'form').replace(/[^a-zA-Z0-9_\- ]/g, '_');
    XLSX.writeFile(wb, `${safeTitle}_template.xlsx`);
  };

  const statCards = [
    {
      label: 'Total Forms',
      value: forms.length,
      icon: FileText,
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
    },
    {
      label: 'Active Forms',
      value: activeForms.length,
      icon: CheckCircle2,
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
    },
    {
      label: 'Total Submissions',
      value: totalSubmissions,
      icon: Layers,
      bg: 'bg-violet-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      valueColor: 'text-violet-700',
    },
    {
      label: 'Avg Fields / Form',
      value: forms.length
        ? Math.round(forms.reduce((a, f) => a + (f.fields?.length || 0), 0) / forms.length)
        : 0,
      icon: TrendingUp,
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-brand-500" />
            Dashboard
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Welcome back,{' '}
            <span className="text-brand-600 font-semibold">{user?.name || 'Admin'}</span>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-2xl p-5 border border-white shadow-sm`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${s.iconBg} p-2 rounded-xl`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
            </div>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <p className={`text-3xl font-bold ${s.valueColor}`}>{s.value}</p>
            )}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Forms */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Recent Forms
          </h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
            {forms.length} total
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading forms...
          </div>
        ) : forms.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700">No forms yet</h4>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Go to Manage Forms to create your first form.
            </p>
            <button
              onClick={() => navigate('/forms')}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-sm transition-all shadow-sm"
            >
              Go to Manage Forms
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {recentForms.map((form) => (
              <div
                key={form.id}
                className="bg-white border border-slate-200 hover:border-brand-200 hover:shadow-md rounded-2xl p-5 transition-all group cursor-pointer"
                onClick={() =>
                  user?.role === 'ENUMERATOR'
                    ? navigate(`/forms/${form.id}/fill`)
                    : navigate(`/forms/${form.id}`)
                }
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-brand-600 transition-colors">
                      {form.title}
                    </h4>
                    {form.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{form.description}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      form.status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {form.status === 'PUBLISHED' ? 'Active' : 'Draft'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium mb-4">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {form.fields?.length || 0} fields
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart2 className="w-3 h-3" />
                    v{form.version}
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    <Clock className="w-3 h-3" />
                    {new Date(form.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/forms/${form.id}/fill`)}
                    className="flex-1 py-2 bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-brand-100"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Fill Form
                  </button>
                  <button
                    onClick={() => downloadTemplate(form)}
                    title="Download Excel template for bulk data entry"
                    className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-emerald-200"
                  >
                    <Download className="w-3 h-3" />
                    Template
                  </button>
                  {user?.role !== 'ENUMERATOR' && (
                    <button
                      onClick={() => navigate(`/forms/${form.id}/analytics`)}
                      className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                    >
                      <BarChart2 className="w-3 h-3" />
                      Analytics
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}