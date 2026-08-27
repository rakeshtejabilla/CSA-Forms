import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../context/useAuthStore';
import { X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface ChartBuilderProps {
  dashboardId: string;
  onClose: () => void;
  onSaved: () => void;
}

export const ChartBuilder = ({ dashboardId, onClose, onSaved }: ChartBuilderProps) => {
  const { token } = useAuthStore();
  const [forms, setForms] = useState<any[]>([]);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [aggregation, setAggregation] = useState('COUNT');

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await axios.get(`${API_URL}/forms`, { headers: { Authorization: `Bearer ${token}` } });
        setForms(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchForms();
  }, [token]);

  const handleFormChange = (formId: string) => {
    const form = forms.find(f => f.id === formId);
    setSelectedForm(form || null);
    setXAxis('');
    setYAxis('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post(`${API_URL}/analytics/widgets`, {
        dashboardId,
        formId: selectedForm.id,
        title,
        chartType,
        queryConfig: {
          xAxis: chartType === 'kpi' ? 'NONE' : xAxis,
          yAxis,
          aggregation,
          dateRange: dateStart && dateEnd ? { start: dateStart, end: dateEnd } : undefined
        }
      }, { headers: { Authorization: `Bearer ${token}` } });
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Add Widget</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Widget Title</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" placeholder="e.g. Total Sales" />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Data Source (Form)</label>
              <select required value={selectedForm?.id || ''} onChange={e => handleFormChange(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none">
                <option value="">Select a form...</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase">Chart Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {['bar', 'line', 'pie', 'area', 'table', 'kpi'].map(type => (
                <button
                  key={type} type="button"
                  onClick={() => setChartType(type)}
                  className={`px-3 py-2 border rounded-lg text-xs font-semibold capitalize transition ${chartType === type ? 'bg-brand-50 border-brand-300 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {selectedForm && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-600 uppercase">Aggregation</label>
                <select value={aggregation} onChange={e => setAggregation(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                  {['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {chartType !== 'kpi' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Group By (X Axis)</label>
                  <select required value={xAxis} onChange={e => setXAxis(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                    <option value="">Select field...</option>
                    {selectedForm.fields.map((f: any) => <option key={f.id} value={f.id}>{f.label || f.id}</option>)}
                  </select>
                </div>
              )}

              {aggregation !== 'COUNT' && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase">Aggregate (Y Axis)</label>
                  <select required value={yAxis} onChange={e => setYAxis(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                    <option value="">Select numeric field...</option>
                    {selectedForm.fields.filter((f: any) => f.type === 'number').map((f: any) => <option key={f.id} value={f.id}>{f.label || f.id}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">Start Date</label>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase">End Date</label>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 hover:bg-slate-100 transition">Cancel</button>
            <button type="submit" disabled={saving || !selectedForm} className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition">
              {saving ? 'Saving...' : 'Add Widget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
