import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';
import {
  LayoutTemplate, Plus, Search, Filter, Pencil, Trash2, Copy, Eye, EyeOff,
  Archive, Clock, Layers, Tag, CheckCircle, Loader2, X, ChevronDown, History, Upload,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  DRAFT: 'bg-amber-100 text-amber-700 border-amber-200',
  ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function ManageTemplatesPage() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();

  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [actionIsError, setActionIsError] = useState(false);
  const [importing, setImporting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const showMsg = (msg: string, isError = false) => {
    setActionMsg(msg);
    setActionIsError(isError);
    setTimeout(() => setActionMsg(''), 3500);
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/prebuilt-templates`, { headers });
      setTemplates(res.data || []);
    } catch {
      showMsg('Failed to load templates', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, [token]);

  const handlePublish = async (id: string) => {
    try {
      await axios.post(`${API_URL}/prebuilt-templates/${id}/publish`, {}, { headers });
      showMsg('Template published!');
      fetchTemplates();
    } catch (err: any) { showMsg(err.response?.data?.message || 'Failed to publish', true); }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await axios.post(`${API_URL}/prebuilt-templates/${id}/unpublish`, {}, { headers });
      showMsg('Template unpublished.');
      fetchTemplates();
    } catch (err: any) { showMsg(err.response?.data?.message || 'Failed to unpublish', true); }
  };

  const handleArchive = async (id: string) => {
    if (!window.confirm('Archive this template? It will be hidden from users.')) return;
    try {
      await axios.post(`${API_URL}/prebuilt-templates/${id}/archive`, {}, { headers });
      showMsg('Template archived.');
      fetchTemplates();
    } catch (err: any) { showMsg(err.response?.data?.message || 'Failed to archive', true); }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await axios.post(`${API_URL}/prebuilt-templates/${id}/duplicate`, {}, { headers });
      showMsg('Template duplicated!');
      fetchTemplates();
    } catch (err: any) { showMsg(err.response?.data?.message || 'Failed to duplicate', true); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Permanently delete the template "${name}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API_URL}/prebuilt-templates/${id}`, { headers });
      showMsg('Template deleted.');
      fetchTemplates();
    } catch (err: any) { showMsg(err.response?.data?.message || 'Failed to delete', true); }
  };

  const handleViewVersions = async (id: string, name: string) => {
    setSelectedTemplateName(name);
    setVersionsLoading(true);
    setShowVersionModal(true);
    try {
      const res = await axios.get(`${API_URL}/prebuilt-templates/${id}/versions`, { headers });
      setVersions(res.data || []);
    } catch { setVersions([]); }
    finally { setVersionsLoading(false); }
  };

  const handleImportXlsForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    showMsg('Parsing XLSForm schema...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/prebuilt-templates/import`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      showMsg('Template imported successfully!');
      await fetchTemplates();
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Import failed. Ensure the file has valid XLSForm sheets.', true);
    } finally {
      setImporting(false);
    }
  };

  // Categories from loaded templates
  const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean)));

  const filtered = templates.filter(t => {
    const matchSearch = !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = !categoryFilter || t.category === categoryFilter;
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <LayoutTemplate className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Manage Prebuilt Templates</h1>
            <p className="text-xs text-slate-500">Create, edit, and publish reusable form templates.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            id="xls-import-template"
            onChange={handleImportXlsForm}
            className="hidden"
          />
          <label
            htmlFor="xls-import-template"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing ? 'Uploading...' : 'Upload Template'}
          </label>
          <button
            onClick={() => navigate('/templates/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Action Message */}
      {actionMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${actionIsError ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`}>
          <span className={`w-2 h-2 rounded-full ${actionIsError ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          {actionMsg}
        </div>
      )}

      {/* Filters
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition placeholder-slate-400"
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 transition">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 transition">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        {(searchTerm || categoryFilter || statusFilter) && (
          <button onClick={() => { setSearchTerm(''); setCategoryFilter(''); setStatusFilter(''); }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400 font-medium">{filtered.length} templates</span>
      </div> */}

      {/* Template Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading templates...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LayoutTemplate className="w-8 h-8 text-indigo-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700">No templates found</h4>
          <p className="text-xs text-slate-500 mt-1">Create your first prebuilt template to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(template => (
            <div key={template.id} className="bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md rounded-2xl p-5 transition-all flex flex-col gap-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{template.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[template.status] || STATUS_COLORS.DRAFT}`}>
                      {template.status}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 font-medium">
                {template.category && (
                  <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                    <Filter className="w-3 h-3" />{template.category}
                  </span>
                )}
                <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                  <Layers className="w-3 h-3" />{template.fieldCount || 0} fields
                </span>
                <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                  <History className="w-3 h-3" />v{template.latestVersion?.versionNumber || 1}
                </span>
                <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg ml-auto">
                  <Clock className="w-3 h-3" />{new Date(template.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Tags */}
              {template.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.slice(0, 4).map((tag: string) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full font-medium">
                      #{tag}
                    </span>
                  ))}
                  {template.tags.length > 4 && (
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">+{template.tags.length - 4} more</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-3 border-t border-slate-100">
                <button onClick={() => navigate(`/templates/${template.id}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition border border-indigo-100">
                  <Pencil className="w-3 h-3" /> Edit
                </button>

                {template.status === 'DRAFT' && (
                  <button onClick={() => handlePublish(template.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition border border-emerald-100">
                    <CheckCircle className="w-3 h-3" /> Publish
                  </button>
                )}
                {template.status === 'PUBLISHED' && (
                  <button onClick={() => handleUnpublish(template.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition border border-amber-100">
                    <EyeOff className="w-3 h-3" /> Unpublish
                  </button>
                )}
                {template.status !== 'ARCHIVED' && (
                  <button onClick={() => handleArchive(template.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition border border-slate-200">
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                )}
                <button onClick={() => handleDuplicate(template.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition border border-slate-200">
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                <button onClick={() => handleViewVersions(template.id, template.name)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition border border-slate-200">
                  <History className="w-3 h-3" /> History
                </button>
                <button onClick={() => handleDelete(template.id, template.name)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition border border-rose-100 ml-auto">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Version History Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-100 shadow-xl flex flex-col gap-4 max-h-[80vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                Version History — {selectedTemplateName}
              </h3>
              <button onClick={() => setShowVersionModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-2">
              {versionsLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading versions...
                </div>
              ) : versions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No version history available.</p>
              ) : (
                versions.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Version {v.versionNumber}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(v.createdAt).toLocaleDateString()} · By {v.createdBy?.name || 'Unknown'}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {Array.isArray(v.fields) ? v.fields.length : 0} fields
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
