import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';
import {
  Users,
  Search,
  Loader2,
  MapPin,
  Phone,
  CreditCard,
  User,
  Filter,
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Farmer {
  id: string;
  name: string;
  age: number;
  phoneNumber: string;
  aadhaarNumber: string;
  cropName: string;
  landSizeAcres: number;
  state: string;
  district: string;
  mandal: string;
  village: string;
  organizationId: string | null;
  assignedOrganization: string | null;
  estimatedYield: string | null;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

interface UniqueFarmer {
  name: string;
  age: number;
  phoneNumber: string;
  aadhaarNumber: string;
  state: string;
  district: string;
  mandal: string;
  village: string;
  recordCount: number;
  /** first record id — used as edit anchor */
  firstId: string;
  /** raw records for inline edit */
  records: Farmer[];
}

type SortField = 'name' | 'age' | 'village' | 'district' | 'state';
type SortDir = 'asc' | 'desc';

/** De-duplicate farmers by Aadhaar / (phone + name) */
const buildUniqueFarmers = (list: Farmer[]): UniqueFarmer[] => {
  const groups: { key: string; farmer: UniqueFarmer }[] = [];

  list.forEach((f) => {
    const match = groups.find((g) => {
      if (
        f.aadhaarNumber?.trim() &&
        g.farmer.aadhaarNumber?.trim() &&
        f.aadhaarNumber.trim() === g.farmer.aadhaarNumber.trim()
      ) return true;
      if (
        f.phoneNumber?.trim() &&
        g.farmer.phoneNumber?.trim() &&
        f.phoneNumber.trim() === g.farmer.phoneNumber.trim() &&
        f.name.trim().toLowerCase() === g.farmer.name.trim().toLowerCase()
      ) return true;
      return false;
    });

    if (match) {
      match.farmer.recordCount += 1;
      match.farmer.records.push(f);
      if (!match.farmer.aadhaarNumber && f.aadhaarNumber) match.farmer.aadhaarNumber = f.aadhaarNumber;
      if (!match.farmer.phoneNumber && f.phoneNumber) match.farmer.phoneNumber = f.phoneNumber;
    } else {
      groups.push({
        key: f.id,
        farmer: {
          name: f.name,
          age: f.age,
          phoneNumber: f.phoneNumber,
          aadhaarNumber: f.aadhaarNumber,
          state: f.state,
          district: f.district,
          mandal: f.mandal,
          village: f.village,
          recordCount: 1,
          firstId: f.id,
          records: [f],
        },
      });
    }
  });

  return groups.map((g) => g.farmer);
};

export default function FarmersMasterList() {
  const { token, user } = useAuthStore();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);

  // ── filters ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMandal, setSelectedMandal] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [mandals, setMandals] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);

  // ── sort & pagination ─────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // ── Add / Edit modal ──────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFarmerId, setEditingFarmerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formAge, setFormAge] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAadhaar, setFormAadhaar] = useState('');
  const [formCropName, setFormCropName] = useState('');
  const [formLandSize, setFormLandSize] = useState('');
  const [formState, setFormState] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formMandal, setFormMandal] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formAssignedOrganization, setFormAssignedOrganization] = useState('');
  const [formEstimatedYield, setFormEstimatedYield] = useState('');
  const [formTimestamp, setFormTimestamp] = useState('');
  const [formOrganizationId, setFormOrganizationId] = useState('');

  // ── fetch data ────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/farmers`, { headers });
      const list: Farmer[] = res.data || [];
      setFarmers(list);
      setStates(Array.from(new Set(list.map((f) => f.state).filter(Boolean))).sort());

      if (user?.role === 'SUPER_ADMIN') {
        try {
          const orgsRes = await axios.get(`${API_URL}/organizations`, { headers });
          setOrganizations(orgsRes.data || []);
        } catch (_) { /* non-critical */ }
      }
    } catch (err) {
      console.error('Failed to load farmers master list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token]);

  // ── cascade effects ───────────────────────────────────────────────────
  useEffect(() => {
    setDistricts(Array.from(new Set(farmers.filter(f => !selectedState || f.state === selectedState).map(f => f.district).filter(Boolean))).sort());
    setSelectedDistrict(''); setSelectedMandal(''); setSelectedVillage(''); setPage(1);
  }, [selectedState, farmers]);

  useEffect(() => {
    setMandals(Array.from(new Set(farmers.filter(f => (!selectedState || f.state === selectedState) && (!selectedDistrict || f.district === selectedDistrict)).map(f => f.mandal).filter(Boolean))).sort());
    setSelectedMandal(''); setSelectedVillage(''); setPage(1);
  }, [selectedDistrict, farmers]);

  useEffect(() => {
    setVillages(Array.from(new Set(farmers.filter(f => (!selectedState || f.state === selectedState) && (!selectedDistrict || f.district === selectedDistrict) && (!selectedMandal || f.mandal === selectedMandal)).map(f => f.village).filter(Boolean))).sort());
    setSelectedVillage(''); setPage(1);
  }, [selectedMandal, farmers]);

  // ── modal helpers ─────────────────────────────────────────────────────
  const resetForm = () => {
    setFormName(''); setFormAge(''); setFormPhone(''); setFormAadhaar('');
    setFormCropName(''); setFormLandSize(''); setFormState(''); setFormDistrict('');
    setFormMandal(''); setFormVillage(''); setFormAssignedOrganization('');
    setFormEstimatedYield(''); setFormOrganizationId('');
    setFormTimestamp(new Date().toISOString().slice(0, 16));
  };

  const handleOpenAddModal = () => {
    setIsEditing(false); setEditingFarmerId(null);
    resetForm();
    setShowModal(true);
  };

  const handleOpenEditModal = (f: Farmer) => {
    setIsEditing(true); setEditingFarmerId(f.id);
    setFormName(f.name); setFormAge(String(f.age));
    setFormPhone(f.phoneNumber); setFormAadhaar(f.aadhaarNumber);
    setFormCropName(f.cropName); setFormLandSize(String(f.landSizeAcres));
    setFormState(f.state); setFormDistrict(f.district);
    setFormMandal(f.mandal); setFormVillage(f.village);
    setFormAssignedOrganization(f.assignedOrganization || '');
    setFormEstimatedYield(f.estimatedYield || '');
    setFormTimestamp(f.timestamp ? new Date(f.timestamp).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setFormOrganizationId(f.organizationId || '');
    setShowModal(true);
  };

  const handleSaveFarmer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const headers = { Authorization: `Bearer ${token}` };
    const payload = {
      name: formName, age: parseInt(formAge, 10),
      phoneNumber: formPhone, aadhaarNumber: formAadhaar,
      cropName: formCropName, landSizeAcres: parseFloat(formLandSize || '0'),
      state: formState, district: formDistrict,
      mandal: formMandal, village: formVillage,
      assignedOrganization: formAssignedOrganization || null,
      estimatedYield: formEstimatedYield || null,
      timestamp: formTimestamp ? new Date(formTimestamp).toISOString() : new Date().toISOString(),
      organizationId: formOrganizationId || undefined,
    };
    try {
      if (isEditing && editingFarmerId) {
        await axios.patch(`${API_URL}/farmers/${editingFarmerId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/farmers`, payload, { headers });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save farmer:', err);
      alert('Error saving farmer record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFarmer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete farmer "${name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/farmers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (err) {
      console.error('Failed to delete farmer:', err);
      alert('Error deleting farmer record.');
    }
  };

  // ── derive display data ───────────────────────────────────────────────
  const uniqueFarmers = buildUniqueFarmers(farmers);

  const filtered = uniqueFarmers.filter((f) => {
    if (selectedState && f.state !== selectedState) return false;
    if (selectedDistrict && f.district !== selectedDistrict) return false;
    if (selectedMandal && f.mandal !== selectedMandal) return false;
    if (selectedVillage && f.village !== selectedVillage) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.phoneNumber?.includes(q) ||
        f.aadhaarNumber?.includes(q) ||
        f.village?.toLowerCase().includes(q) ||
        f.district?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = '';
    let bv: string | number = '';
    if (sortField === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
    else if (sortField === 'age') { av = a.age; bv = b.age; }
    else if (sortField === 'village') { av = (a.village || '').toLowerCase(); bv = (b.village || '').toLowerCase(); }
    else if (sortField === 'district') { av = (a.district || '').toLowerCase(); bv = (b.district || '').toLowerCase(); }
    else if (sortField === 'state') { av = (a.state || '').toLowerCase(); bv = (b.state || '').toLowerCase(); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 text-slate-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="h-3 w-3 text-brand-500" />
      : <ChevronDown className="h-3 w-3 text-brand-500" />;
  };

  const maskAadhaar = (val: string) => {
    if (!val || val.trim() === '') return '—';
    const clean = val.replace(/\s/g, '');
    if (clean.length <= 4) return clean;
    return `XXXX XXXX ${clean.slice(-4)}`;
  };

  const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition';
  const selectClass = 'text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition';

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
        <p className="text-slate-500 text-sm">Loading farmers master list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Farmers Master List</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Directory of all registered farmers and their personal details.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">
              {uniqueFarmers.length}{' '}
              <span className="font-normal text-emerald-600">Total Farmers</span>
            </span>
          </div>
          {isAdmin && (
            <button
              id="fml-add-farmer"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-sm transition shadow-md shadow-brand-500/20"
            >
              <Plus className="h-4 w-4" />
              Add Farmer
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
          <Filter className="h-4 w-4" />
          Search &amp; Filters
        </div>
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="fml-search"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, phone, Aadhaar, village..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition"
            />
          </div>
          <select id="fml-state" value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className={selectClass}>
            <option value="">All States</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select id="fml-district" value={selectedDistrict} onChange={(e) => { setSelectedDistrict(e.target.value); setPage(1); }} className={selectClass} disabled={!selectedState}>
            <option value="">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select id="fml-mandal" value={selectedMandal} onChange={(e) => { setSelectedMandal(e.target.value); setPage(1); }} className={selectClass} disabled={!selectedDistrict}>
            <option value="">All Mandals</option>
            {mandals.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select id="fml-village" value={selectedVillage} onChange={(e) => { setSelectedVillage(e.target.value); setPage(1); }} className={selectClass} disabled={!selectedMandal}>
            <option value="">All Villages</option>
            {villages.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        {(selectedState || selectedDistrict || selectedMandal || selectedVillage || search) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {search && (
              <span className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-700 text-xs rounded-full px-3 py-1">
                <Search className="h-3 w-3" /> "{search}"
                <button onClick={() => { setSearch(''); setPage(1); }} className="ml-1 hover:text-brand-900">×</button>
              </span>
            )}
            {[{ label: selectedState, clear: () => setSelectedState('') },
              { label: selectedDistrict, clear: () => setSelectedDistrict('') },
              { label: selectedMandal, clear: () => setSelectedMandal('') },
              { label: selectedVillage, clear: () => setSelectedVillage('') }]
              .filter(c => c.label)
              .map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs rounded-full px-3 py-1">
                  {c.label}
                  <button onClick={c.clear} className="ml-1 hover:text-slate-900">×</button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* ── Results summary ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Showing <span className="font-semibold text-slate-700">{sorted.length}</span> farmer{sorted.length !== 1 ? 's' : ''}
          {sorted.length !== uniqueFarmers.length && <span> (filtered from {uniqueFarmers.length})</span>}
        </span>
        {totalPages > 1 && <span>Page {page} of {totalPages}</span>}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="text-slate-500 text-sm">No farmers found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 w-8">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-brand-600 transition" onClick={() => handleSort('name')}>
                    <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Farmer Name <SortIcon field="name" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-brand-600 transition" onClick={() => handleSort('age')}>
                    <span className="inline-flex items-center gap-1.5">Age <SortIcon field="age" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Aadhaar</span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-brand-600 transition" onClick={() => handleSort('village')}>
                    <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Village <SortIcon field="village" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-brand-600 transition" onClick={() => handleSort('district')}>
                    <span className="inline-flex items-center gap-1.5">District <SortIcon field="district" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-brand-600 transition hidden lg:table-cell" onClick={() => handleSort('state')}>
                    <span className="inline-flex items-center gap-1.5">State <SortIcon field="state" /></span>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Mandal</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Records</th>
                  {isAdmin && <th className="text-center px-4 py-3 font-semibold text-slate-600">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((f, idx) => (
                  <tr key={`${f.aadhaarNumber || f.phoneNumber || f.name}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                          {f.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800">{f.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.age ? `${f.age} yrs` : '—'}</td>
                    <td className="px-4 py-3">
                      {f.phoneNumber ? (
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">{f.phoneNumber}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{maskAadhaar(f.aadhaarNumber)}</td>
                    <td className="px-4 py-3 text-slate-700">{f.village || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{f.district || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{f.state || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{f.mandal || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold rounded-full w-7 h-7">
                        {f.recordCount}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(f.records[0])}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Edit Farmer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          {user?.role === 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handleDeleteFarmer(f.records[0].id, f.name)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                              title="Delete Farmer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <button
            id="fml-prev-page"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
              acc.push(p);
              return acc;
            }, [])
            .map((item, i) =>
              item === 'ellipsis' ? (
                <span key={`ell-${i}`} className="px-1 text-slate-400">...</span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === item ? 'bg-brand-500 text-white shadow shadow-brand-500/25' : 'border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  {item}
                </button>
              )
            )}
          <button
            id="fml-next-page"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      )}

      {/* ── Add / Edit Farmer Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveFarmer}
            className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-100 shadow-xl flex flex-col gap-4 max-h-[90vh]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                {isEditing ? 'Edit Farmer Record' : 'Add New Farmer'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
              {/* Organization — SUPER_ADMIN only */}
              {user?.role === 'SUPER_ADMIN' && (
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Assigned Organization *</label>
                  <select required value={formOrganizationId} onChange={e => setFormOrganizationId(e.target.value)} className={inputClass}>
                    <option value="">-- Select Organization --</option>
                    {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}

              {/* Name & Age */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Full Name *</label>
                  <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} placeholder="Enter name" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Age *</label>
                  <input type="number" required value={formAge} onChange={e => setFormAge(e.target.value)} placeholder="Enter age" className={inputClass} />
                </div>
              </div>

              {/* Phone & Aadhaar */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Phone Number *</label>
                  <input type="text" required value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="Enter phone" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Aadhaar Number *</label>
                  <input type="text" required value={formAadhaar} onChange={e => setFormAadhaar(e.target.value)} placeholder="12-digit Aadhaar" className={inputClass} />
                </div>
              </div>

              {/* Crop & Land Size */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Crop Name *</label>
                  <input type="text" required value={formCropName} onChange={e => setFormCropName(e.target.value)} placeholder="e.g. Paddy, Cotton" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Land Size (Acres) *</label>
                  <input type="number" step="0.01" required value={formLandSize} onChange={e => setFormLandSize(e.target.value)} placeholder="e.g. 2.5" className={inputClass} />
                </div>
              </div>

              {/* State & District */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">State *</label>
                  <input type="text" required value={formState} onChange={e => setFormState(e.target.value)} placeholder="Enter state" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">District *</label>
                  <input type="text" required value={formDistrict} onChange={e => setFormDistrict(e.target.value)} placeholder="Enter district" className={inputClass} />
                </div>
              </div>

              {/* Mandal & Village */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Mandal *</label>
                  <input type="text" required value={formMandal} onChange={e => setFormMandal(e.target.value)} placeholder="Enter mandal" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Village *</label>
                  <input type="text" required value={formVillage} onChange={e => setFormVillage(e.target.value)} placeholder="Enter village" className={inputClass} />
                </div>
              </div>

              {/* Assigned Org & Est. Yield */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Assigned Organization</label>
                  <input type="text" value={formAssignedOrganization} onChange={e => setFormAssignedOrganization(e.target.value)} placeholder="Enter assigned org" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Estimated Yield</label>
                  <input type="text" value={formEstimatedYield} onChange={e => setFormEstimatedYield(e.target.value)} placeholder="e.g. 500 kg, 20 bags" className={inputClass} />
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-1 block">Survey Date &amp; Time *</label>
                <input type="datetime-local" required value={formTimestamp} onChange={e => setFormTimestamp(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-brand-500/20 flex items-center gap-1.5">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Add Farmer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
