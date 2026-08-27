import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';
import {
  Users,
  Building2,
  Search,
  Loader2,
  Calendar,
  Trash2,
  Edit2,
  X,
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

interface GroupedFarmer {
  key: string;
  name: string;
  phoneNumber: string;
  aadhaarNumber: string;
  state: string;
  district: string;
  mandal: string;
  village: string;
  records: Farmer[];
}

const groupFarmers = (list: Farmer[]): GroupedFarmer[] => {
  const groups: GroupedFarmer[] = [];

  list.forEach(f => {
    // Try to find a matching group for this record f using the Fuzzy Hierarchical Rule
    const match = groups.find(g => {
      // Rule 1: If Aadhaar matches (and is not empty), they are the same farmer
      if (f.aadhaarNumber && f.aadhaarNumber.trim() && g.aadhaarNumber && g.aadhaarNumber.trim()) {
        if (f.aadhaarNumber.trim() === g.aadhaarNumber.trim()) {
          return true;
        }
      }

      // Rule 2: If Phone matches AND Name matches, they are the same farmer
      if (f.phoneNumber && f.phoneNumber.trim() && g.phoneNumber && g.phoneNumber.trim()) {
        const phoneMatch = f.phoneNumber.trim() === g.phoneNumber.trim();
        const nameMatch = f.name.trim().toLowerCase() === g.name.trim().toLowerCase();
        if (phoneMatch && nameMatch) {
          return true;
        }
      }

      // Rule 3: If Phone matches BUT the Villages are completely different (and name does not match), they are different (returns false)
      return false;
    });

    if (match) {
      match.records.push(f);
      if (!match.aadhaarNumber && f.aadhaarNumber) match.aadhaarNumber = f.aadhaarNumber;
      if (!match.phoneNumber && f.phoneNumber) match.phoneNumber = f.phoneNumber;
    } else {
      groups.push({
        key: `group_${f.id}`,
        name: f.name,
        phoneNumber: f.phoneNumber,
        aadhaarNumber: f.aadhaarNumber,
        state: f.state,
        district: f.district,
        mandal: f.mandal,
        village: f.village,
        records: [f]
      });
    }
  });

  groups.forEach(g => {
    g.records.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.createdAt).getTime();
      return dateA - dateB;
    });
    // Use the latest record for headers
    const latest = g.records[g.records.length - 1];
    g.name = latest.name;
    g.state = latest.state;
    g.district = latest.district;
    g.mandal = latest.mandal;
    g.village = latest.village;
  });

  return groups;
};

export default function Farmers() {
  const { token, user } = useAuthStore();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [orgAdminsCount, setOrgAdminsCount] = useState(0);
  const [enumeratorsCount, setEnumeratorsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Village access assignment states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [enumerators, setEnumerators] = useState<any[]>([]);
  const [selectedEnumeratorId, setSelectedEnumeratorId] = useState('');
  const [allVillages, setAllVillages] = useState<string[]>([]);
  const [selectedVillages, setSelectedVillages] = useState<string[]>([]);
  const [newVillageInput, setNewVillageInput] = useState('');
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [userAssignedVillages, setUserAssignedVillages] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [formOrganizationId, setFormOrganizationId] = useState('');

  // Search and Cascades
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedMandal, setSelectedMandal] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('');

  // Dropdown options
  const [states, setStates] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [mandals, setMandals] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFarmerId, setEditingFarmerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
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

  const fetchFarmersAndStats = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Users Count (only for Admins)
      if (user?.role !== 'ENUMERATOR') {
        const usersRes = await axios.get(`${API_URL}/auth/users`, { headers });
        const userList = usersRes.data || [];
        setOrgAdminsCount(userList.filter((u: any) => u.role === 'ORG_ADMIN').length);
        setEnumeratorsCount(userList.filter((u: any) => u.role === 'ENUMERATOR').length);

        if (user?.role === 'SUPER_ADMIN') {
          try {
            const orgsRes = await axios.get(`${API_URL}/organizations`, { headers });
            setOrganizations(orgsRes.data || []);
          } catch (err) {
            console.error('Failed to load organizations in Farmers page:', err);
          }
        }
      } else {
        // Fetch current enumerator's village access
        try {
          const accessRes = await axios.get(`${API_URL}/auth/users/${user?.id}/village-access`, { headers });
          setUserAssignedVillages(accessRes.data || []);
        } catch (err) {
          console.error('Failed to load user village access:', err);
        }
      }

      // 2. Fetch Farmers List
      const farmersRes = await axios.get(`${API_URL}/farmers`, { headers });
      const list: Farmer[] = farmersRes.data || [];
      setFarmers(list);

      // 3. Extract unique States
      const uniqueStates = new Set<string>();
      list.forEach(f => {
        if (f.state) uniqueStates.add(f.state.trim());
      });
      setStates(Array.from(uniqueStates).sort());
    } catch (err) {
      console.error('Failed to load farmer registry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmersAndStats();
  }, [token]);

  // Recalculate dropdowns when state changes
  useEffect(() => {
    const uniqueDistricts = new Set<string>();
    farmers.forEach(f => {
      if (f.district && (!selectedState || f.state === selectedState)) {
        uniqueDistricts.add(f.district.trim());
      }
    });
    setDistricts(Array.from(uniqueDistricts).sort());
    setSelectedDistrict('');
    setSelectedMandal('');
    setSelectedVillage('');
  }, [selectedState, farmers]);

  // Recalculate dropdowns when district changes
  useEffect(() => {
    const uniqueMandals = new Set<string>();
    farmers.forEach(f => {
      if (f.mandal && 
          (!selectedState || f.state === selectedState) &&
          (!selectedDistrict || f.district === selectedDistrict)) {
        uniqueMandals.add(f.mandal.trim());
      }
    });
    setMandals(Array.from(uniqueMandals).sort());
    setSelectedMandal('');
    setSelectedVillage('');
  }, [selectedDistrict, farmers]);

  // Recalculate dropdowns when mandal changes
  useEffect(() => {
    const uniqueVillages = new Set<string>();
    farmers.forEach(f => {
      if (f.village && 
          (!selectedState || f.state === selectedState) &&
          (!selectedDistrict || f.district === selectedDistrict) &&
          (!selectedMandal || f.mandal === selectedMandal)) {
        uniqueVillages.add(f.village.trim());
      }
    });
    setVillages(Array.from(uniqueVillages).sort());
    setSelectedVillage('');
  }, [selectedMandal, farmers]);

  // Handle CRUD
  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingFarmerId(null);
    setFormName('');
    setFormAge('');
    setFormPhone('');
    setFormAadhaar('');
    setFormCropName('');
    setFormLandSize('');
    setFormState('');
    setFormDistrict('');
    setFormMandal('');
    setFormVillage('');
    setFormAssignedOrganization('');
    setFormEstimatedYield('');
    setFormTimestamp(new Date().toISOString().slice(0, 16)); // format local YYYY-MM-DDTHH:MM
    setFormOrganizationId('');
    setShowModal(true);
  };

  const handleOpenEditModal = (f: Farmer) => {
    setIsEditing(true);
    setEditingFarmerId(f.id);
    setFormName(f.name);
    setFormAge(String(f.age));
    setFormPhone(f.phoneNumber);
    setFormAadhaar(f.aadhaarNumber);
    setFormCropName(f.cropName);
    setFormLandSize(String(f.landSizeAcres));
    setFormState(f.state);
    setFormDistrict(f.district);
    setFormMandal(f.mandal);
    setFormVillage(f.village);
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
      name: formName,
      age: parseInt(formAge, 10),
      phoneNumber: formPhone,
      aadhaarNumber: formAadhaar,
      cropName: formCropName,
      landSizeAcres: parseFloat(formLandSize || '0'),
      state: formState,
      district: formDistrict,
      mandal: formMandal,
      village: formVillage,
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
      fetchFarmersAndStats();
    } catch (err) {
      console.error('Failed to save farmer:', err);
      alert('Error saving farmer record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFarmer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete farmer "${name}"?`)) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.delete(`${API_URL}/farmers/${id}`, { headers });
      fetchFarmersAndStats();
    } catch (err) {
      console.error('Failed to delete farmer:', err);
      alert('Error deleting farmer record.');
    }
  };

  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    setEnumerators([]);
    setSelectedEnumeratorId('');
    setSelectedVillages([]);
    setNewVillageInput('');
    
    // Extract unique villages currently in database
    const uniqueVillages = Array.from(new Set(farmers.map(f => f.village.trim()).filter(Boolean))).sort();
    setAllVillages(uniqueVillages);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const usersRes = await axios.get(`${API_URL}/auth/users`, { headers });
      const enumeratorUsers = (usersRes.data || []).filter((u: any) => u.role === 'ENUMERATOR');
      setEnumerators(enumeratorUsers);
    } catch (err) {
      console.error('Failed to fetch enumerators for assignment:', err);
    }
  };

  const handleEnumeratorChange = async (userId: string) => {
    setSelectedEnumeratorId(userId);
    if (!userId) {
      setSelectedVillages([]);
      return;
    }
    setLoadingAccess(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/auth/users/${userId}/village-access`, { headers });
      setSelectedVillages(res.data || []);
      
      // Make sure all assigned villages are present in allVillages selection list
      const merged = Array.from(new Set([...allVillages, ...(res.data || [])])).sort();
      setAllVillages(merged);
    } catch (err) {
      console.error('Failed to load user village access:', err);
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleToggleVillage = (villageName: string) => {
    if (selectedVillages.includes(villageName)) {
      setSelectedVillages(selectedVillages.filter(v => v !== villageName));
    } else {
      setSelectedVillages([...selectedVillages, villageName]);
    }
  };

  const handleAddNewVillage = () => {
    const trimmed = newVillageInput.trim();
    if (!trimmed) return;
    if (!allVillages.includes(trimmed)) {
      setAllVillages([...allVillages, trimmed].sort());
    }
    if (!selectedVillages.includes(trimmed)) {
      setSelectedVillages([...selectedVillages, trimmed]);
    }
    setNewVillageInput('');
  };

  const handleSaveVillageAccess = async () => {
    if (!selectedEnumeratorId) {
      alert('Please select an enumerator');
      return;
    }
    setSavingAccess(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/auth/users/${selectedEnumeratorId}/village-access`,
        { villages: selectedVillages },
        { headers }
      );
      setShowAssignModal(false);
      alert('Village access updated successfully!');
    } catch (err) {
      console.error('Failed to save village access:', err);
      alert('Failed to update village access.');
    } finally {
      setSavingAccess(false);
    }
  };

  // Filtering list logic
  const filteredFarmers = farmers.filter(f => {
    if (selectedState && f.state !== selectedState) return false;
    if (selectedDistrict && f.district !== selectedDistrict) return false;
    if (selectedMandal && f.mandal !== selectedMandal) return false;
    if (selectedVillage && f.village !== selectedVillage) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.phoneNumber.includes(q) ||
        f.aadhaarNumber.includes(q) ||
        f.cropName.toLowerCase().includes(q) ||
        f.state.toLowerCase().includes(q) ||
        f.district.toLowerCase().includes(q) ||
        f.mandal.toLowerCase().includes(q) ||
        f.village.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Farmer Crop Data</h2>
          <p className="text-xs text-slate-500 mt-1">Manage farmers database records, crop details, and location maps.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN') && (
            <button
              onClick={handleOpenAssignModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition shadow-sm animate-fade-in"
            >
              <Users className="w-4 h-4" />
              Assign Village Access
            </button>
          )}
        </div>

      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 ${user?.role === 'ENUMERATOR' ? '' : 'md:grid-cols-3'} gap-5`}>
        {/* Total Org Admins */}
        {user?.role !== 'ENUMERATOR' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Org Admins</span>
              <span className="text-2xl font-bold text-slate-850 mt-0.5 block">{orgAdminsCount}</span>
            </div>
          </div>
        )}

        {/* Total Enumerators */}
        {user?.role !== 'ENUMERATOR' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Enumerators</span>
              <span className="text-2xl font-bold text-slate-850 mt-0.5 block">{enumeratorsCount}</span>
            </div>
          </div>
        )}

        {/* Total Farmers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Farmers</span>
            <span className="text-2xl font-bold text-slate-850 mt-0.5 block">{groupFarmers(farmers).length}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search & Filters</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search farmer, crop, phone..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
            />
          </div>

          {/* State */}
          <div>
            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-400 transition"
            >
              <option value="">All States</option>
              {states.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              disabled={!selectedState}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-400 transition disabled:opacity-50"
            >
              <option value="">All Districts</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Mandal */}
          <div>
            <select
              value={selectedMandal}
              onChange={e => setSelectedMandal(e.target.value)}
              disabled={!selectedDistrict}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-400 transition disabled:opacity-50"
            >
              <option value="">All Mandals</option>
              {mandals.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Village */}
          <div>
            <select
              value={selectedVillage}
              onChange={e => setSelectedVillage(e.target.value)}
              disabled={!selectedMandal}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-400 transition disabled:opacity-50"
            >
              <option value="">All Villages</option>
              {villages.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Farmers Grid Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Farmers List</h3>
          <span className="text-[10px] text-brand-600 bg-brand-50 border border-brand-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {groupFarmers(filteredFarmers).length} matches
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            Loading registry...
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs italic">
            {user?.role === 'ENUMERATOR' ? (
              userAssignedVillages.length === 0 ? (
                "Org admin has not assigned any village to you."
              ) : (
                "No farmer records found in your assigned villages."
              )
            ) : (
              "No farmer records found. Click \"Add Farmer\" to get started."
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groupFarmers(filteredFarmers).map(gf => (
              <div key={gf.key} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                {/* Farmer Profile Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3.5 gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex flex-wrap items-center gap-2">
                      <span className="text-base text-slate-900 font-extrabold">{gf.name}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Aadhaar: {gf.aadhaarNumber || '—'}
                      </span>
                      <span className="text-[10px] bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Phone: {gf.phoneNumber || '—'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                      Location: <span className="text-slate-700 font-semibold">{gf.village || '—'}, {gf.mandal || '—'}, {gf.district || '—'}, {gf.state || '—'}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {gf.records.length} {gf.records.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>
                </div>

                {/* Historical Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Year / Date</th>
                        <th className="py-2.5 px-4">Crop Name</th>
                        <th className="py-2.5 px-4">Land Size</th>
                        <th className="py-2.5 px-4">Assigned Org</th>
                        <th className="py-2.5 px-4">Est. Yield</th>
                        <th className="py-2.5 px-4">Survey Age</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {gf.records.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {f.timestamp ? new Date(f.timestamp).toLocaleDateString() : new Date(f.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5 ml-5">
                              {f.timestamp ? new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(f.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-indigo-600">{f.cropName || '—'}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-600">{f.landSizeAcres || 0} acres</td>
                          <td className="py-2.5 px-4 text-slate-600">{f.assignedOrganization || '—'}</td>
                          <td className="py-2.5 px-4 font-semibold text-emerald-600">{f.estimatedYield || '—'}</td>
                          <td className="py-2.5 px-4 text-slate-500">{f.age} years old</td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex gap-1.5">
                              {user?.role !== 'ENUMERATOR' && (
                                <button
                                  onClick={() => handleOpenEditModal(f)}
                                  className="p-1.5 text-slate-450 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                  title="Edit Record"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {user?.role === 'SUPER_ADMIN' && (
                                <button
                                  onClick={() => handleDeleteFarmer(f.id, f.name)}
                                  className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Farmer Modal */}
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
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-450 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
              {/* Organization (for Super Admin only) */}
              {user?.role === 'SUPER_ADMIN' && (
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Assigned Organization *</label>
                  <select
                    required
                    value={formOrganizationId}
                    onChange={e => setFormOrganizationId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  >
                    <option value="">-- Select Organization --</option>
                    {organizations.map(o => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name & Age */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Age *</label>
                  <input
                    type="number"
                    required
                    value={formAge}
                    onChange={e => setFormAge(e.target.value)}
                    placeholder="Enter age"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
              </div>

              {/* Phone & Aadhaar */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="Enter phone"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Aadhaar Number *</label>
                  <input
                    type="text"
                    required
                    value={formAadhaar}
                    onChange={e => setFormAadhaar(e.target.value)}
                    placeholder="Enter 12-digit Aadhaar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
              </div>

              {/* Crop & Land Size */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Crop Name *</label>
                  <input
                    type="text"
                    required
                    value={formCropName}
                    onChange={e => setFormCropName(e.target.value)}
                    placeholder="e.g. Paddy, Cotton"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Land Size (Acres) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formLandSize}
                    onChange={e => setFormLandSize(e.target.value)}
                    placeholder="e.g. 2.5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
              </div>

              {/* State & District */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">State *</label>
                  <input
                    type="text"
                    required
                    value={formState}
                    onChange={e => setFormState(e.target.value)}
                    placeholder="Enter state"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">District *</label>
                  <input
                    type="text"
                    required
                    value={formDistrict}
                    onChange={e => setFormDistrict(e.target.value)}
                    placeholder="Enter district"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
              </div>

              {/* Mandal & Village */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Mandal *</label>
                  <input
                    type="text"
                    required
                    value={formMandal}
                    onChange={e => setFormMandal(e.target.value)}
                    placeholder="Enter mandal"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Village *</label>
                  <input
                    type="text"
                    required
                    value={formVillage}
                    onChange={e => setFormVillage(e.target.value)}
                    placeholder="Enter village"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
              </div>

              {/* Assigned Org & Est Yield */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Assigned Organization</label>
                  <input
                    type="text"
                    value={formAssignedOrganization}
                    onChange={e => setFormAssignedOrganization(e.target.value)}
                    placeholder="Enter assigned org"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">Estimated Yield</label>
                  <input
                    type="text"
                    value={formEstimatedYield}
                    onChange={e => setFormEstimatedYield(e.target.value)}
                    placeholder="e.g. 500 kg, 20 bags"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                  />
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <label className="text-xs text-slate-500 font-semibold mb-1 block">Survey Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formTimestamp}
                  onChange={e => setFormTimestamp(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-850 focus:outline-none focus:border-brand-400 transition"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-brand-500/20 flex items-center gap-1.5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Village Access Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowAssignModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-450 hover:text-slate-650 hover:bg-slate-50 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-500" />
              Assign Village Access
            </h3>

            <div className="space-y-4 py-4 overflow-y-auto flex-1 text-xs">
              {/* Select Enumerator */}
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Select Enumerator</label>
                <select
                  value={selectedEnumeratorId}
                  onChange={e => handleEnumeratorChange(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:border-brand-400 transition"
                >
                  <option value="">-- Choose Enumerator --</option>
                  {enumerators.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              {selectedEnumeratorId && (
                <>
                  {loadingAccess ? (
                    <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                      Loading permissions...
                    </div>
                  ) : (
                    <>
                      {/* Checkboxes List of Villages */}
                      <div>
                        <label className="block text-slate-500 font-semibold mb-2">Villages Permissions</label>
                        {allVillages.length === 0 ? (
                          <div className="text-slate-400 italic text-[11px] py-1">No villages currently registered. Use input below to add one.</div>
                        ) : (
                          <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 max-h-40 overflow-y-auto space-y-2">
                            {allVillages.map(village => (
                              <label key={village} className="flex items-center gap-2 cursor-pointer py-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedVillages.includes(village)}
                                  onChange={() => handleToggleVillage(village)}
                                  className="rounded border-slate-300 text-brand-500 focus:ring-brand-400 h-4 w-4"
                                />
                                <span className="text-slate-800 text-[11px] font-medium">{village}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Custom/New Village */}
                      <div className="border-t border-slate-100 pt-3">
                        <label className="block text-slate-500 font-semibold mb-1">Add Unlisted Village</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newVillageInput}
                            onChange={e => setNewVillageInput(e.target.value)}
                            placeholder="Type village name..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-850 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100 transition"
                          />
                          <button
                            type="button"
                            onClick={handleAddNewVillage}
                            className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingAccess || !selectedEnumeratorId}
                onClick={handleSaveVillageAccess}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition"
              >
                {savingAccess && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
