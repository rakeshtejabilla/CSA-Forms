import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../context/useAuthStore';
import {
  Plus,
  FileText,
  Upload,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  Layers,
  BarChart2,
  ExternalLink,
  X,
  Loader2,
  Trash2,
  LayoutTemplate,
  Filter,
  Tag,
  History,
  CheckCircle,
  EyeOff,
  Download,
  UserPlus,
} from 'lucide-react';
import DataPreviewModal from '../components/DataPreviewModal';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface FormSummary {
  id: string;
  title: string;
  description?: string;
  version: number;
  fields: any[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  submissionCount?: number;
}

export default function ManageForms() {
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // XLSForm import state
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // Submission data import state
  const [showImportDataModal, setShowImportDataModal] = useState(false);
  const [selectedImportFormId, setSelectedImportFormId] = useState('');
  const [dataImporting, setDataImporting] = useState(false);
  const [dataImportStatus, setDataImportStatus] = useState('');

  // Data Preview Modal State
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);

  // Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedFormForAssign, setSelectedFormForAssign] = useState<FormSummary | null>(null);
  const [enumerators, setEnumerators] = useState<any[]>([]);
  const [assignedEnumeratorIds, setAssignedEnumeratorIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');

  const handleOpenAssignModal = async (e: React.MouseEvent, form: FormSummary) => {
    e.stopPropagation();
    setSelectedFormForAssign(form);
    setShowAssignModal(true);
    setAssigning(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // 1. Fetch all members in organization and filter enumerators
      const usersRes = await axios.get(`${API_URL}/auth/users`, { headers });
      const enumeratorUsers = (usersRes.data || []).filter((u: any) => u.role === 'ENUMERATOR');
      setEnumerators(enumeratorUsers);

      // 2. Fetch current assignments for this form
      const assignmentsRes = await axios.get(`${API_URL}/forms/${form.id}/assignments`, { headers });
      setAssignedEnumeratorIds(assignmentsRes.data || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedFormForAssign) return;
    setAssigning(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(
        `${API_URL}/forms/${selectedFormForAssign.id}/assignments`,
        { userIds: assignedEnumeratorIds },
        { headers }
      );
      setShowAssignModal(false);
      setSelectedFormForAssign(null);
    } catch (err) {
      console.error('Failed to save assignments:', err);
      alert('Failed to save assignments.');
    } finally {
      setAssigning(false);
    }
  };

  const handleToggleEnumerator = (userId: string) => {
    setAssignedEnumeratorIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleToggleSelectAll = () => {
    const visibleEnumerators = enumerators.filter(u =>
      u.name.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(assignSearchQuery.toLowerCase())
    );
    const visibleIds = visibleEnumerators.map(u => u.id);
    const allVisibleSelected = visibleIds.every(id => assignedEnumeratorIds.includes(id));

    if (allVisibleSelected) {
      setAssignedEnumeratorIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setAssignedEnumeratorIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleUploadConfirmed = async (dataToUpload: any[]) => {
    setDataImporting(true);
    setPreviewErrors([]);
    setDataImportStatus('Uploading data...');
    
    try {
      const ws = XLSX.utils.json_to_sheet(dataToUpload, { header: previewHeaders });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'data');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const file = new File([blob], 'upload.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_URL}/import-export/import/form/${selectedImportFormId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      
      const jobResult = response.data;
      if (jobResult && jobResult.failedCount > 0) {
        throw new Error(jobResult.errors.join('|||'));
      }
      
      setDataImportStatus('Import completed successfully!');
      setShowPreviewModal(false);
      setTimeout(() => { setShowImportDataModal(false); setDataImportStatus(''); }, 3000);
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
      setDataImportStatus('Import failed with validation errors.');
    } finally {
      setDataImporting(false);
    }
  };

  // Prebuilt Templates state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [apiTemplates, setApiTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('');

  const fetchForms = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/forms`, { headers: { Authorization: `Bearer ${token}` } });
      setForms(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const fetchApiTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const res = await axios.get(`${API_URL}/prebuilt-templates`, { headers: { Authorization: `Bearer ${token}` } });
      setApiTemplates(res.data || []);
    } catch {
      // silent
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => { fetchForms(); }, [token]);

  const handleDeleteForm = async (e: React.MouseEvent, formId: string, formTitle: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete the form "${formTitle}"?`)) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/forms/${formId}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchForms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete form');
    }
  };

  const handleImportXlsForm = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus('Parsing XLSForm schema...');
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/forms/import`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setImportStatus('XLSForm imported successfully!');
      await fetchForms();
    } catch (err: any) {
      setImportStatus(err.response?.data?.message || 'Import failed. Ensure the file has valid XLSForm sheets.');
    } finally {
      setImporting(false);
      setTimeout(() => setImportStatus(''), 4000);
    }
  };

  const handleUseTemplate = async (template: any) => {
    setCreatingTemplate(true);
    try {
      // For API templates (objects with latestVersion), use version fields
      const latestVersion = template.latestVersion || template.versions?.[0];
      const templateFields = latestVersion?.fields || template.formDefinition?.fields || [];
      const templateSettings = latestVersion?.settings || template.formDefinition?.settings || {};
      const payload = {
        title: template.name || template.formDefinition?.title,
        description: template.description || template.formDefinition?.description,
        status: 'DRAFT',
        fields: templateFields,
        settings: templateSettings,
      };
      const res = await axios.post(`${API_URL}/forms`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/forms/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create form from template');
    } finally {
      setCreatingTemplate(false);
      setShowTemplatesModal(false);
    }
  };

  const handleTemplateDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await axios.delete(`${API_URL}/prebuilt-templates/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchApiTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleTemplatePublish = async (id: string, currentStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const endpoint = currentStatus === 'PUBLISHED' ? 'unpublish' : 'publish';
    try {
      await axios.post(`${API_URL}/prebuilt-templates/${id}/${endpoint}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchApiTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleTemplateDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await axios.post(`${API_URL}/prebuilt-templates/${id}/duplicate`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchApiTemplates();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Duplicate failed');
    }
  };

  const downloadTemplate = (form: FormSummary) => {
    const fields = (form.fields || []) as any[];
    const headers = fields.map((f: any) => f.label || f.id || 'Field');
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
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'data');
    const safeTitle = (form.title || 'form').replace(/[^a-zA-Z0-9_\- ]/g, '_');
    XLSX.writeFile(wb, `${safeTitle}_template.xlsx`);
  };

  const downloadXlsFormBlueprint = (form: FormSummary) => {
    const fields = (form.fields || []) as any[];
    const surveyRows: any[] = [];
    const choicesRows: any[] = [];

    // Helper to generate clean ODK-compliant variable names
    const toCleanVariableName = (label: string, defaultId: string, existingNames: Set<string>): string => {
      let clean = (label || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      if (!clean) {
        clean = defaultId.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      }

      if (!/^[a-z_]/.test(clean)) {
        clean = 'q_' + clean;
      }

      let finalName = clean;
      let counter = 2;
      while (existingNames.has(finalName)) {
        finalName = `${clean}_${counter}`;
        counter++;
      }
      existingNames.add(finalName);
      return finalName;
    };

    const fieldIdMap = new Map<string, string>();
    const existingNames = new Set<string>();
    fields.forEach((f: any) => {
      const cleanName = toCleanVariableName(f.label, f.id, existingNames);
      fieldIdMap.set(f.id, cleanName);
    });

    const mapFieldToSurveyRow = (f: any) => {
      const cleanName = fieldIdMap.get(f.id) || f.id;
      let xlsType = f.type || 'text';
      if (xlsType === 'number') xlsType = 'integer';
      else if (xlsType === 'select' || xlsType === 'dropdown' || xlsType === 'radio') {
        xlsType = `select_one ${cleanName}_choices`;
      } else if (xlsType === 'checkbox') {
        xlsType = `select_multiple ${cleanName}_choices`;
      } else if (xlsType === 'gps') xlsType = 'geopoint';
      else if (xlsType === 'signature') xlsType = 'image';

      const row: any = {
        type: xlsType,
        name: cleanName,
        'label::English (en)': f.label || f.id,
        required: f.required ? 'true' : 'false',
      };

      if (f.helpText) row['hint::English (en)'] = f.helpText;
      if (f.relevance) row.relevant = f.relevance;

      return row;
    };

    const mapFieldChoices = (f: any) => {
      const cleanName = fieldIdMap.get(f.id) || f.id;
      if (f.options && Array.isArray(f.options)) {
        f.options.forEach((opt: any) => {
          const label = typeof opt === 'object' && opt !== null ? (opt.label || opt.value) : opt;
          const value = typeof opt === 'object' && opt !== null ? opt.value : opt;
          const cleanValue = String(value)
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_\-]/g, '');
          choicesRows.push({
            list_name: `${cleanName}_choices`,
            name: cleanValue,
            'label::English (en)': String(label),
          });
        });
      }
    };

    const repeatFieldIds = fields.filter(f => f.type === 'repeat').map(f => f.id);

    fields.forEach((f: any) => {
      if (f.groupId && repeatFieldIds.includes(f.groupId)) {
        return;
      }

      if (f.type === 'repeat') {
        const cleanName = fieldIdMap.get(f.id) || f.id;
        surveyRows.push({
          type: 'begin_repeat',
          name: cleanName,
          'label::English (en)': f.label || f.id,
        });

        const childFields = fields.filter((cf) => cf.groupId === f.id);
        childFields.forEach((cf) => {
          surveyRows.push(mapFieldToSurveyRow(cf));
          mapFieldChoices(cf);
        });

        surveyRows.push({
          type: 'end_repeat',
        });
      } else {
        surveyRows.push(mapFieldToSurveyRow(f));
        mapFieldChoices(f);
      }
    });

    const wb = XLSX.utils.book_new();

    const surveyWs = XLSX.utils.json_to_sheet(surveyRows);
    XLSX.utils.book_append_sheet(wb, surveyWs, 'survey');

    if (choicesRows.length > 0) {
      const choicesWs = XLSX.utils.json_to_sheet(choicesRows);
      XLSX.utils.book_append_sheet(wb, choicesWs, 'choices');
    } else {
      const choicesWs = XLSX.utils.json_to_sheet([]);
      XLSX.utils.book_append_sheet(wb, choicesWs, 'choices');
    }

    const settingsWs = XLSX.utils.json_to_sheet([{ allow_choice_duplicates: 'yes' }]);
    XLSX.utils.book_append_sheet(wb, settingsWs, 'settings');

    const safeTitle = (form.title || 'blueprint').replace(/[^a-zA-Z0-9_\- ]/g, '_');
    XLSX.writeFile(wb, `${safeTitle}_blueprint.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-brand-500" />
            Manage Forms
          </h2>
          <p className="text-slate-500 text-sm mt-1">Create, import and manage your survey forms</p>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {/* New Custom Form */}
          <button
            id="manage-forms-new"
            onClick={() => navigate('/forms/new')}
            className="flex items-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            New Custom Form
          </button>

          {/* Import XLSForm */}
          <input
            type="file"
            accept=".xlsx,.xls"
            id="xls-import-input"
            onChange={handleImportXlsForm}
            className="hidden"
          />
          <label
            htmlFor="xls-import-input"
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm"
          >
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            ) : (
              <Upload className="w-4 h-4 text-emerald-600" />
            )}
            {importing ? 'Processing...' : 'Upload Template Form (XLSForm)'}
          </label>

          {/* Import Submission Data */}
          <button
            onClick={() => {
              if (forms.length > 0) setSelectedImportFormId(forms[0].id);
              setShowImportDataModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-brand-500" />
            Upload Data (CSV format)
          </button>

          {/* Prebuilt Templates */}
          <button
            onClick={() => { setShowTemplatesModal(true); fetchApiTemplates(); }}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm"
          >
            <LayoutTemplate className="w-4 h-4 text-indigo-500" />
            Prebuilt Templates
          </button>
        </div>

        {importStatus && (
          <div className="mt-4 bg-brand-50 border border-brand-200 text-brand-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            {importStatus}
          </div>
        )}
      </div>

      {/* Forms List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-700">All Forms</h3>
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
            <p className="text-xs text-slate-500 mt-1 mb-5">Use the action buttons above to create or import your first form.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {forms.map((form) => (
              <div
                key={form.id}
                className="bg-white border border-slate-200 hover:border-brand-200 hover:shadow-md rounded-2xl p-5 transition-all group cursor-pointer"
                onClick={() => navigate(`/forms/${form.id}`)}
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
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                     <span
                       className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                         form.status === 'PUBLISHED'
                           ? 'bg-emerald-100 text-emerald-700'
                           : 'bg-slate-100 text-slate-500'
                       }`}
                     >
                       {form.status === 'PUBLISHED' ? 'Active' : 'Draft'}
                     </span>
                     {(user?.role === 'SUPER_ADMIN' || user?.role === 'ORG_ADMIN') && (
                       <button
                         onClick={(e) => handleOpenAssignModal(e, form)}
                         className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                         title="Assign to Enumerators"
                       >
                         <UserPlus className="w-4 h-4" />
                       </button>
                     )}
                     <button
                       onClick={(e) => handleDeleteForm(e, form.id, form.title)}
                       className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                       title="Delete Form"
                     >
                       <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
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
                  <button
                    onClick={() => downloadXlsFormBlueprint(form)}
                    title="Download XLSForm Blueprint for KoBoToolbox"
                    className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-indigo-200"
                  >
                    <Download className="w-3 h-3" />
                    Blueprint
                  </button>
                  <button
                    onClick={() => navigate(`/forms/${form.id}/analytics`)}
                    className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                  >
                    <BarChart2 className="w-3 h-3" />
                    Analytics
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Submission Data Modal */}
      {showImportDataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-500" />
                Upload Data (CSV / Excel)
              </h3>
              <button onClick={() => { setShowImportDataModal(false); setDataImportStatus(''); }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Select the destination form and upload the Excel or CSV file containing submission data.
            </p>

            {forms.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500">Create a form first before importing submission data.</p>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fileInput = document.getElementById('submissions-import-file') as HTMLInputElement;
                  const file = fileInput?.files?.[0];
                  if (!file || !selectedImportFormId) return;

                  setDataImporting(true);
                  setDataImportStatus('Uploading and parsing submission data...');
                  const formData = new FormData();
                  formData.append('file', file);

                  try {
                    const data = await file.arrayBuffer();
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

                    if (jsonData.length === 0) {
                      setDataImportStatus('The selected Excel file is empty.');
                      return;
                    }

                    const headers = Object.keys(jsonData[0]);
                    setPreviewHeaders(headers);
                    setPreviewData(jsonData);
                    setPreviewErrors([]);
                    setShowPreviewModal(true);
                  } catch (err: any) {
                    setDataImportStatus('Failed to parse Excel file: ' + err.message);
                  } finally {
                    setDataImporting(false);
                  }
                }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="target-form-select" className="text-xs font-semibold text-slate-600">Target Form Template</label>
                  <select
                    id="target-form-select"
                    value={selectedImportFormId}
                    onChange={(e) => setSelectedImportFormId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
                  >
                    {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="submissions-import-file" className="text-xs font-semibold text-slate-600">Excel or CSV File</label>
                  <input
                    type="file"
                    id="submissions-import-file"
                    accept=".xlsx,.xls,.csv"
                    required
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 file:cursor-pointer transition-all border border-slate-200 rounded-xl p-1 bg-slate-50"
                  />
                </div>

                {dataImportStatus && (
                  <div className="p-3 bg-brand-50 border border-brand-200 text-brand-700 rounded-xl text-xs font-semibold whitespace-pre-line max-h-40 overflow-y-auto">
                    {dataImportStatus}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { setShowImportDataModal(false); setDataImportStatus(''); }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs transition-all hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={dataImporting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-brand-500/20 disabled:opacity-50"
                  >
                    {dataImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Import Data
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 border border-slate-100 shadow-xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-indigo-500" />
                Prebuilt Templates
              </h3>
              <div className="flex items-center gap-2">
                {user?.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => { setShowTemplatesModal(false); navigate('/templates/new'); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-500/20 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Create Prebuilt Template
                  </button>
                )}
                <button onClick={() => setShowTemplatesModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Select a prebuilt template to start creating your form.
            </p>

            {/* Template search/filter */}
            <div className="flex gap-2">
              <input type="text" value={templateSearchTerm} onChange={e => setTemplateSearchTerm(e.target.value)}
                placeholder="Search templates..." className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition" />
              {/* <select value={templateCategoryFilter} onChange={e => setTemplateCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-indigo-400 transition">
                <option value="">All Categories</option>
                {Array.from(new Set(apiTemplates.map(t => t.category).filter(Boolean))).map(c => (
                  <option key={String(c)} value={String(c)}>{String(c)}</option>
                ))}
              </select> */}
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading templates...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-2">
                {apiTemplates
                  .filter(t => {
                    const matchSearch = !templateSearchTerm || t.name?.toLowerCase().includes(templateSearchTerm.toLowerCase());
                    const matchCat = !templateCategoryFilter || t.category === templateCategoryFilter;
                    return matchSearch && matchCat;
                  })
                  .map(template => (
                    <div key={template.id} className="bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md rounded-2xl p-5 transition-all flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                          <LayoutTemplate className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-slate-800 truncate">{template.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              template.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : template.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-500 border-slate-200'
                              : 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>{template.status}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 font-medium">
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
                          {template.tags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full font-medium">#{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-auto flex-wrap">
                        <button
                          onClick={() => handleUseTemplate(template)}
                          disabled={creatingTemplate}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                        >
                          {creatingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Use Template
                        </button>

                        {user?.role === 'SUPER_ADMIN' && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setShowTemplatesModal(false); navigate(`/templates/${template.id}`); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit">
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => handleTemplatePublish(template.id, template.status, e)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" title={template.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}>
                              {template.status === 'PUBLISHED' ? <EyeOff className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={(e) => handleTemplateDuplicate(template.id, e)}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition" title="Duplicate">
                              <Layers className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => handleTemplateDelete(template.id, template.name, e)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-auto" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                {apiTemplates.filter(t => {
                  const matchSearch = !templateSearchTerm || t.name?.toLowerCase().includes(templateSearchTerm.toLowerCase());
                  const matchCat = !templateCategoryFilter || t.category === templateCategoryFilter;
                  return matchSearch && matchCat;
                }).length === 0 && (
                  <div className="col-span-2 py-8 text-center text-slate-400 text-sm">
                    No templates found. {user?.role === 'SUPER_ADMIN' ? 'Create one using the button above.' : 'Check back later.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Assign Form Modal */}
      {showAssignModal && selectedFormForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-xl flex flex-col gap-4 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Assign Form</h3>
                <p className="text-xs text-slate-500 mt-0.5">Form: <span className="font-semibold text-slate-700">{selectedFormForAssign.title}</span></p>
              </div>
              <button
                onClick={() => { setShowAssignModal(false); setSelectedFormForAssign(null); }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Select All */}
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={assignSearchQuery}
                onChange={e => setAssignSearchQuery(e.target.value)}
                placeholder="Search enumerators by name or email..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
              />

              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>ENUMERATORS ({enumerators.length})</span>
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-indigo-600 hover:underline"
                >
                  Select / Deselect All
                </button>
              </div>
            </div>

            {/* Enumerator Checklist */}
            <div className="flex-1 overflow-y-auto max-h-[40vh] border border-slate-100 rounded-xl p-2 flex flex-col gap-1 bg-slate-50">
              {assigning ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : enumerators.filter(u =>
                u.name.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(assignSearchQuery.toLowerCase())
              ).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  No enumerators found.
                </div>
              ) : (
                enumerators
                  .filter(u =>
                    u.name.toLowerCase().includes(assignSearchQuery.toLowerCase()) ||
                    u.email.toLowerCase().includes(assignSearchQuery.toLowerCase())
                  )
                  .map(enumerator => (
                    <label
                      key={enumerator.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-white rounded-lg cursor-pointer transition border border-transparent hover:border-slate-150"
                    >
                      <input
                        type="checkbox"
                        checked={assignedEnumeratorIds.includes(enumerator.id)}
                        onChange={() => handleToggleEnumerator(enumerator.id)}
                        className="rounded text-indigo-500 focus:ring-indigo-200 border-slate-300 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{enumerator.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{enumerator.email}</p>
                      </div>
                    </label>
                  ))
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => { setShowAssignModal(false); setSelectedFormForAssign(null); }}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={assigning}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
              >
                {assigning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Assignments
              </button>
            </div>
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
        isUploading={dataImporting}
        errors={previewErrors}
      />
    </div>
  );
}
