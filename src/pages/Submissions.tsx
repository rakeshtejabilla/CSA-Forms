import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';
import {
  ArrowLeft,
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Layers,
  Search,
  User,
  Loader2,
  Upload,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import DataPreviewModal from '../components/DataPreviewModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function SubmissionsPage() {
  const { formId } = useParams<{ formId?: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  
  const canEdit = user?.role === 'ORG_ADMIN' || user?.role === 'SUPER_ADMIN';

  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>(formId || '');
  const [activeForm, setActiveForm] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [pageImporting, setPageImporting] = useState(false);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  const handleEditClick = (sub: any) => {
    setEditingRowId(sub.id);
    setEditingData({ ...sub.data });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingData({});
  };

  const handleSaveEdit = async (subId: string) => {
    setSavingEdit(true);
    setErrorMsg('');
    try {
      await axios.patch(`${API_URL}/submissions/${subId}`, { data: editingData }, { headers: { Authorization: `Bearer ${token}` } });
      const subRes = await axios.get(`${API_URL}/submissions/form/${selectedFormId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSubmissions(subRes.data.data || subRes.data);
      setEditingRowId(null);
      setEditingData({});
    } catch (err: any) {
      const errMsgs = err.response?.data?.errors;
      if (Array.isArray(errMsgs)) {
        setErrorMsg(`Edit failed:\n` + errMsgs.join('\n'));
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to update submission');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (subId: string) => {
    if (!window.confirm('Are you sure you want to delete this submission? This cannot be undone.')) return;
    setErrorMsg('');
    try {
      await axios.delete(`${API_URL}/submissions/${subId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSubmissions(prev => prev.filter(s => s.id !== subId));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete submission');
    }
  };

  const handlePageImportSubmissions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedFormId) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

      if (jsonData.length === 0) {
        setErrorMsg('The selected Excel file is empty.');
        return;
      }

      // Extract headers from the first object
      const headers = Object.keys(jsonData[0]);
      setPreviewHeaders(headers);
      setPreviewData(jsonData);
      setPreviewErrors([]);
      setShowPreviewModal(true);
    } catch (err: any) {
      setErrorMsg('Failed to parse Excel file: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadConfirmed = async (dataToUpload: any[]) => {
    setPageImporting(true);
    setPreviewErrors([]);
    
    try {
      // 1. Convert JSON array back to Excel file
      const ws = XLSX.utils.json_to_sheet(dataToUpload, { header: previewHeaders });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'data');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const file = new File([blob], 'upload.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // 2. Upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/import-export/import/form/${selectedFormId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      const jobId = response.data.jobId;
      const resultMsg = await new Promise<string>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const res = await axios.get(`${API_URL}/import-export/job/import/${jobId}/status`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.state === 'completed') {
              clearInterval(interval);
              const jobResult = res.data.result;
              if (jobResult && jobResult.failedCount > 0) {
                // Return errors so we can show them in the modal
                reject(new Error(jobResult.errors.join('|||')));
              } else {
                resolve('Import completed successfully!');
              }
            } else if (res.data.state === 'failed') {
              clearInterval(interval);
              reject(new Error(res.data.failedReason || 'Import failed'));
            }
          } catch (err) {
            clearInterval(interval);
            reject(err);
          }
        }, 1000);
      });

      // Reload submissions on success
      const subRes = await axios.get(`${API_URL}/submissions/form/${selectedFormId}`, { headers: { Authorization: `Bearer ${token}` } });
      setSubmissions(subRes.data.data || subRes.data);
      setShowPreviewModal(false);
      alert(resultMsg);
    } catch (err: any) {
      let errArray: string[] = [];
      const msg = err.message || '';
      
      if (msg.includes('|||')) {
        errArray = msg.split('|||');
      } else if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        errArray = err.response.data.errors;
      } else {
        errArray = [err.message || err.response?.data?.message || 'Import failed. Ensure columns match form fields.'];
      }
      
      setPreviewErrors(errArray);
    } finally {
      setPageImporting(false);
    }
  };

  useEffect(() => {
    if (formId) {
      setSelectedFormId(formId);
    }
  }, [formId]);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await axios.get(`${API_URL}/forms`, { headers: { Authorization: `Bearer ${token}` } });
        setForms(res.data);
        if (!formId && res.data.length > 0) {
          navigate(`/submissions/${res.data[0].id}`, { replace: true });
        }
      } catch {
        setErrorMsg('Failed to load forms list.');
      }
    };
    fetchForms();
  }, [token, formId, navigate]);

  useEffect(() => {
    if (!selectedFormId) return;
    const fetchSubmissions = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const formRes = await axios.get(`${API_URL}/forms/${selectedFormId}`, { headers: { Authorization: `Bearer ${token}` } });
        setActiveForm(formRes.data);
        const subRes = await axios.get(`${API_URL}/submissions/form/${selectedFormId}`, { headers: { Authorization: `Bearer ${token}` } });
        setSubmissions(subRes.data.data || subRes.data);
      } catch {
        setErrorMsg('Failed to load submissions.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [selectedFormId]);

  const pollExportJob = async (jobId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/import-export/job/export/${jobId}/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.state === 'completed') {
            clearInterval(interval);
            resolve(res.data.result.downloadUrl);
          } else if (res.data.state === 'failed') {
            clearInterval(interval);
            reject(new Error(res.data.failedReason || 'Export failed'));
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 1000);
    });
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    if (!selectedFormId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await axios.post(`${API_URL}/import-export/export/form/${selectedFormId}`, { format }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const downloadUrl = await pollExportJob(res.data.jobId);
      
      const link = document.createElement('a');
      // Construct full URL if needed, but relative should work assuming API_URL proxy setup or same domain
      link.href = downloadUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setErrorMsg(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => handleExport('csv');
  const exportToExcel = () => handleExport('xlsx');

  const filteredSubmissions = submissions.filter((sub) =>
    JSON.stringify(sub).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brand-500" />
              Submissions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">View records and export to multiple formats.</p>
          </div>
        </div>

        {/* Form Selector & Import */}
        <div className="flex items-center gap-2">
          <select
            value={selectedFormId}
            onChange={(e) => navigate(`/submissions/${e.target.value}`)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 shadow-sm transition"
          >
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.title} (v{f.version})
              </option>
            ))}
          </select>

          {selectedFormId && (
            <>
              <input
                type="file"
                id="submissions-page-import-input"
                accept=".xlsx,.xls,.csv"
                onChange={handlePageImportSubmissions}
                className="hidden"
              />
              <label
                htmlFor="submissions-page-import-input"
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                {pageImporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-500" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-brand-500" />
                )}
                {pageImporting ? 'Importing...' : 'Import Data'}
              </label>
            </>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* Search & Export */}
      {activeForm && submissions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search submissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { label: 'CSV', onClick: exportToCSV },
              { label: 'Excel', onClick: exportToExcel },
              { label: 'Print', onClick: () => window.print(), icon: <Printer className="w-3.5 h-3.5" /> },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                {btn.icon ?? <Download className="w-3.5 h-3.5" />}
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading submissions...
        </div>
      ) : !activeForm || submissions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-slate-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700">No submissions yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            This form hasn't received any submissions. Share the link to start collecting data.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-5">Date Submitted</th>
                  <th className="py-4 px-5">Submitter</th>
                  {activeForm.fields.slice(0, 4).map((field: any) => (
                    <th key={field.id} className="py-4 px-5">{field.label}</th>
                  ))}
                  {canEdit && <th className="py-4 px-5 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredSubmissions.map((sub) => {
                  const isEditing = editingRowId === sub.id;
                  return (
                  <tr key={sub.id} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-brand-50/30' : ''}`}>
                    <td className="py-3.5 px-5 text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 text-brand-400" />
                      {new Date(sub.submittedAt).toLocaleDateString()}{' '}
                      <span className="text-slate-400">{new Date(sub.submittedAt).toLocaleTimeString()}</span>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap text-slate-800 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-brand-400" />
                        {sub.submitterName || 'Guest'}
                      </span>
                    </td>
                    {activeForm.fields.slice(0, 4).map((field: any) => {
                      if (isEditing) {
                        return (
                          <td key={field.id} className="py-2 px-3">
                            <input
                              type="text"
                              value={editingData[field.id] !== undefined && editingData[field.id] !== null ? String(editingData[field.id]) : ''}
                              onChange={(e) => setEditingData({ ...editingData, [field.id]: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white border border-brand-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
                            />
                          </td>
                        );
                      }

                      const val = sub.data[field.id];
                      let displayVal = '—';
                      if (val !== undefined && val !== null) {
                        if (typeof val === 'object') {
                          displayVal = 'latitude' in val
                            ? `GPS (${val.latitude.toFixed(4)}, ${val.longitude.toFixed(4)})`
                            : JSON.stringify(val);
                        } else {
                          displayVal = String(val);
                        }
                      }
                      return (
                        <td key={field.id} className="py-3.5 px-5 truncate max-w-xs text-slate-600">
                          {displayVal}
                        </td>
                      );
                    })}
                    {canEdit && (
                      <td className="py-3.5 px-5 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleSaveEdit(sub.id)}
                              disabled={savingEdit}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={savingEdit}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(sub)}
                              className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sub.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400 font-medium text-right">
            Showing {filteredSubmissions.length} of {submissions.length} records
          </div>
        </div>
      )}
      {/* Data Preview Modal */}
      <DataPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onUpload={handleUploadConfirmed}
        initialData={previewData}
        headers={previewHeaders}
        isUploading={pageImporting}
        errors={previewErrors}
      />
    </div>
  );
}
