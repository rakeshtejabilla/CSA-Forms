import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  X,
  Check,
  ChevronRight,
  Globe,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Organization {
  id: string;
  name: string;
  code: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: string;
  createdAt: string;
  _count?: { users: number };
  users?: any[];
}

export default function OrganizationsPage() {
  const { token } = useAuthStore();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [actionStatus, setActionStatus] = useState('');
  const [actionIsError, setActionIsError] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');

  const headers = { Authorization: `Bearer ${token}` };

  const showStatus = (msg: string, isError = false) => {
    setActionStatus(msg);
    setActionIsError(isError);
    setTimeout(() => setActionStatus(''), 3500);
  };

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/organizations`, { headers });
      setOrgs(res.data || []);
    } catch {
      showStatus('Failed to load organizations', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, [token]);

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormStatus('ACTIVE');
    setEditingOrg(null);
    setShowForm(false);
  };

  const openEditForm = (org: Organization) => {
    setFormName(org.name);
    setFormCode(org.code);
    setFormDescription(org.description || '');
    setFormEmail(org.email || '');
    setFormPhone(org.phone || '');
    setFormAddress(org.address || '');
    setFormStatus(org.status || 'ACTIVE');
    setEditingOrg(org);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formName,
      code: formCode,
      description: formDescription || undefined,
      email: formEmail || undefined,
      phone: formPhone || undefined,
      address: formAddress || undefined,
      status: formStatus,
    };
    try {
      if (editingOrg) {
        await axios.patch(`${API_URL}/organizations/${editingOrg.id}`, payload, { headers });
        showStatus('Organization updated successfully!');
      } else {
        await axios.post(`${API_URL}/organizations`, payload, { headers });
        showStatus('Organization created successfully!');
      }
      resetForm();
      fetchOrgs();
    } catch (err: any) {
      showStatus(err.response?.data?.message || 'Failed to save organization.', true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this organization?')) return;
    try {
      await axios.delete(`${API_URL}/organizations/${id}`, { headers });
      showStatus('Organization deactivated.');
      fetchOrgs();
      if (selectedOrg?.id === id) setSelectedOrg(null);
    } catch (err: any) {
      showStatus(err.response?.data?.message || 'Failed to deactivate organization.', true);
    }
  };

  const viewOrgDetails = async (org: Organization) => {
    try {
      const res = await axios.get(`${API_URL}/organizations/${org.id}`, { headers });
      setSelectedOrg(res.data);
    } catch {
      showStatus('Failed to load organization details', true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading organizations...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-violet-100 p-3 rounded-xl">
            <Building2 className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Organizations</h1>
            <p className="text-xs text-slate-500">Manage organizations and their members.</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-brand-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          Add Organization
        </button>
      </div>

      {actionStatus && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          actionIsError
            ? 'bg-rose-50 border border-rose-200 text-rose-700'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        }`}>
          <span className={`w-2 h-2 rounded-full ${actionIsError ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          {actionStatus}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">
                {editingOrg ? 'Edit Organization' : 'New Organization'}
              </h3>
              <button onClick={resetForm} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Name *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required
                    className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition"
                    placeholder="Organization Name" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Code *</label>
                  <input type="text" value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} required
                    className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition font-mono"
                    placeholder="ORG-CODE" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Description</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2}
                  className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition resize-none"
                  placeholder="Brief description..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Email</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition"
                    placeholder="org@email.com" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Phone</label>
                  <input type="text" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                    className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition"
                    placeholder="+1 555 0100" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Address</label>
                <input type="text" value={formAddress} onChange={e => setFormAddress(e.target.value)}
                  className="bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-800 outline-none transition"
                  placeholder="123 Main St, City" />
              </div>
              {editingOrg && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Status</label>
                  <select value={formStatus} onChange={e => setFormStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3.5 py-2.5 w-full text-slate-700 cursor-pointer outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={resetForm}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold shadow-sm shadow-brand-500/20 transition flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  {editingOrg ? 'Save Changes' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Organizations List */}
        <div className={`${selectedOrg ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col gap-4`}>
          {orgs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-violet-400" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">No organizations yet</h4>
              <p className="text-xs text-slate-500 mt-1">Click "Add Organization" to create the first one.</p>
            </div>
          ) : (
            orgs.map(org => (
              <div
                key={org.id}
                onClick={() => viewOrgDetails(org)}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                  selectedOrg?.id === org.id ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-200 hover:border-brand-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      org.status === 'ACTIVE' ? 'bg-violet-100' : 'bg-slate-100'
                    }`}>
                      <Building2 className={`h-5 w-5 ${
                        org.status === 'ACTIVE' ? 'text-violet-600' : 'text-slate-400'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-brand-600 transition-colors">
                        {org.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {org.code}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          org.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {org.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                      <Users className="h-3 w-3" />
                      {org._count?.users || 0}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditForm(org); }}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(org.id); }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Deactivate"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand-400 transition" />
                  </div>
                </div>
                {org.description && (
                  <p className="text-xs text-slate-500 mt-2 truncate">{org.description}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedOrg && (
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden sticky top-6">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700">Organization Details</h3>
              <button onClick={() => setSelectedOrg(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-slate-800">{selectedOrg.name}</h4>
                <span className="text-xs font-mono text-slate-400">{selectedOrg.code}</span>
              </div>
              {selectedOrg.description && (
                <p className="text-xs text-slate-600">{selectedOrg.description}</p>
              )}
              <div className="space-y-2">
                {selectedOrg.email && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {selectedOrg.email}
                  </div>
                )}
                {selectedOrg.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {selectedOrg.phone}
                  </div>
                )}
                {selectedOrg.address && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {selectedOrg.address}
                  </div>
                )}
              </div>

              {/* Members */}
              <div>
                <h5 className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">Members</h5>
                {selectedOrg.users && selectedOrg.users.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrg.users.map((u: any) => (
                      <div key={u.id} className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-[11px] shrink-0">
                          {(u.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                          u.role === 'ORG_ADMIN'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}>
                          {u.role === 'ORG_ADMIN' ? 'Admin' : 'Enumerator'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No members yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
