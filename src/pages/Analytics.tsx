import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';
import { DashboardView } from '../components/analytics/DashboardView';
import { ChartBuilder } from '../components/analytics/ChartBuilder';
import { Plus, LayoutDashboard, Share2, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Analytics() {
  const { token, user } = useAuthStore();
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const fetchDashboards = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/dashboards`, { headers: { Authorization: `Bearer ${token}` } });
      setDashboards(res.data);
      if (res.data.length > 0 && !selectedDashboard) {
        setSelectedDashboard(res.data[0]);
      } else if (selectedDashboard) {
        setSelectedDashboard(res.data.find((d: any) => d.id === selectedDashboard.id) || res.data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/analytics/dashboards`, { title: newTitle }, { headers: { Authorization: `Bearer ${token}` } });
      setNewTitle('');
      setShowCreate(false);
      setSelectedDashboard(res.data);
      fetchDashboards();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete dashboard?')) return;
    try {
      await axios.delete(`${API_URL}/analytics/dashboards/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (selectedDashboard?.id === id) setSelectedDashboard(null);
      fetchDashboards();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleShare = async (d: any) => {
    try {
      await axios.put(`${API_URL}/analytics/dashboards/${d.id}`, { isShared: !d.isShared }, { headers: { Authorization: `Bearer ${token}` } });
      fetchDashboards();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-4">
        <button onClick={() => setShowCreate(true)} className="w-full py-2.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition">
          <Plus className="h-4 w-4" /> New Dashboard
        </button>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col gap-3">
            <input autoFocus required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Dashboard title..." className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
              <button type="submit" className="text-xs font-semibold text-brand-600 hover:text-brand-700">Save</button>
            </div>
          </form>
        )}

        <div className="flex flex-col gap-1.5">
          {dashboards.map(d => (
            <div key={d.id} className={`flex items-center justify-between group px-3 py-2.5 rounded-xl border transition cursor-pointer ${selectedDashboard?.id === d.id ? 'bg-white border-brand-200 shadow-sm' : 'border-transparent hover:bg-slate-50'}`} onClick={() => setSelectedDashboard(d)}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <LayoutDashboard className={`h-4 w-4 shrink-0 ${selectedDashboard?.id === d.id ? 'text-brand-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium truncate ${selectedDashboard?.id === d.id ? 'text-slate-800' : 'text-slate-600'}`}>{d.title}</span>
              </div>
              {d.ownerId === user?.id && selectedDashboard?.id === d.id && (
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleToggleShare(d); }} className={`p-1 rounded hover:bg-slate-100 ${d.isShared ? 'text-blue-500' : 'text-slate-400'}`} title={d.isShared ? 'Shared' : 'Private'}>
                    <Share2 className="h-3 w-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-500" title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-slate-50/50 rounded-3xl border border-slate-200 p-6">
        {selectedDashboard ? (
          <DashboardView dashboard={selectedDashboard} onRefresh={fetchDashboards} onAddWidget={() => setShowAddWidget(true)} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <LayoutDashboard className="h-12 w-12 text-slate-300 mb-4" />
            <p className="font-medium">Select or create a dashboard</p>
          </div>
        )}
      </div>

      {showAddWidget && selectedDashboard && (
        <ChartBuilder dashboardId={selectedDashboard.id} onClose={() => setShowAddWidget(false)} onSaved={() => { setShowAddWidget(false); fetchDashboards(); }} />
      )}
    </div>
  );
}