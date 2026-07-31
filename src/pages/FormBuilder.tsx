import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';
import { useBuilderStore, FormField, FieldType } from '../context/useBuilderStore';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Trash2,
  Plus,
  CheckCircle,
  FileText,
  Binary,
  Mail,
  List,
  CheckSquare,
  Dot,
  Calendar,
  Upload,
  Navigation,
  Sparkles,
  EyeOff,
  Loader2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  PlusCircle,
  FileSpreadsheet,
  Clock,
  Layers,
  BarChart2,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const sidebarInputClass =
  'bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-xs px-3 py-2 w-full text-slate-800 outline-none transition';

// ─── Sortable Field Card ───────────────────────────────────────────────────────
interface SortableFieldCardProps {
  field: FormField;
  idx: number;
  totalFields: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  getFieldIcon: (type: FieldType) => React.ReactNode;
}

function SortableFieldCard({
  field, idx, totalFields, isSelected,
  onSelect, onRemove, onMoveUp, onMoveDown, getFieldIcon,
}: SortableFieldCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative p-4 rounded-xl border transition-all cursor-pointer select-none ${
        isSelected
          ? 'bg-brand-50 border-brand-300 shadow-sm'
          : isDragging
          ? 'bg-slate-100 border-slate-300 shadow-lg'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left: drag handle + index + icon + label */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="p-1 text-slate-300 hover:text-slate-500 rounded-lg cursor-grab active:cursor-grabbing transition shrink-0"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg shrink-0">
            {idx + 1}
          </span>
          <span className="text-slate-400 shrink-0">{getFieldIcon(field.type)}</span>
          <span className="font-semibold text-slate-700 text-sm truncate">
            {field.label || 'Untitled field'}
          </span>
          {field.required && <span className="text-rose-500 text-xs font-bold shrink-0">*</span>}
        </div>

        {/* Right: up / down / delete — revealed on hover */}
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={idx === 0}
            onClick={onMoveUp}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition disabled:opacity-25 disabled:cursor-not-allowed"
            title="Move up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={idx === totalFields - 1}
            onClick={onMoveDown}
            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition disabled:opacity-25 disabled:cursor-not-allowed"
            title="Move down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition"
            title="Delete field"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Field preview details */}
      {field.placeholder && (
        <p className="text-xs text-slate-400 mt-2 ml-14 italic">
          Placeholder: {field.placeholder}
        </p>
      )}
      {(['select', 'dropdown', 'radio', 'checkbox'].includes(field.type?.toLowerCase())) && (
        <div className="flex items-center gap-2 flex-wrap mt-3 ml-14">
          {field.options?.map((opt: any, i: number) => {
            const label = typeof opt === 'object' && opt !== null ? (opt.label || opt.value) : opt;
            return (
              <span
                key={i}
                className="text-[10px] font-semibold px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-full"
              >
                {label}
              </span>
            );
          })}
        </div>
      )}
      {field.conditions?.fieldId && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-600 font-semibold mt-3 ml-14 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 w-fit">
          <EyeOff className="h-3 w-3" />
          Shown if &quot;{field.conditions.fieldId}&quot; = &quot;{field.conditions.value}&quot;
        </div>
      )}
    </div>
  );
}
// ─── Form Editor View ─────────────────────────────────────────────────────────
export default function FormBuilderPage() {
  const { formId } = useParams<{ formId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuthStore();
  const {
    fields, selectedFieldId, settings, past, future,
    setFields, addField, updateField, removeField, reorderFields,
    selectField, updateSettings, undo, redo, clearHistory,
  } = useBuilderStore();

  // Detect template mode from URL path
  const isTemplateMode = location.pathname.startsWith('/templates');
  const isNewForm = formId === 'new';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = fields.findIndex((f) => f.id === active.id);
    const toIndex = fields.findIndex((f) => f.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) reorderFields(fromIndex, toIndex);
  };

  const [formTitle, setFormTitle] = useState(isTemplateMode ? 'Untitled Template' : 'Untitled Form');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('DRAFT');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveIsError, setSaveIsError] = useState(false);

  // Template metadata state
  const [showTemplateMetaModal, setShowTemplateMetaModal] = useState(false);
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateTags, setTemplateTags] = useState('');
  const [templateThumbnail, setTemplateThumbnail] = useState('');

  useEffect(() => {
    const fetchFormDetails = async () => {
      if (!formId || formId === 'new') {
        setFormTitle(isTemplateMode ? 'Untitled Template' : 'Untitled Form');
        setFormDesc('');
        setFormStatus('DRAFT');
        setFields([]);
        clearHistory();
        setLoading(false);
        return;
      }
      setLoading(true);
      clearHistory();
      try {
        const endpoint = isTemplateMode
          ? `${API_URL}/prebuilt-templates/${formId}`
          : `${API_URL}/forms/${formId}`;
        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data;
        setFormTitle(data.name || data.title || '');
        setFormDesc(data.description || '');
        setFormStatus(data.status || 'DRAFT');
        const latestVersion = data.versions?.[0] || data.latestVersion;
        setFields(latestVersion?.fields || data.fields || []);
        if (isTemplateMode) {
          setTemplateCategory(data.category || '');
          setTemplateTags((data.tags || []).join(', '));
          setTemplateThumbnail(data.thumbnail || '');
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchFormDetails();
  }, [formId, token, isTemplateMode]);

  const handleSaveForm = async () => {
    // Template mode: show metadata modal on first save for new templates
    if (isTemplateMode && isNewForm) {
      setShowTemplateMetaModal(true);
      return;
    }
    await doSave();
  };

  const doSave = async (meta?: { category: string; tags: string; thumbnail: string }) => {
    setSaving(true);
    setSaveStatus('Saving...');
    setSaveIsError(false);
    try {
      if (isTemplateMode) {
        const tagsArr = (meta?.tags ?? templateTags).split(',').map((t) => t.trim()).filter(Boolean);
        const payload = {
          name: formTitle,
          description: formDesc,
          status: formStatus,
          category: meta?.category ?? templateCategory,
          tags: tagsArr,
          thumbnail: meta?.thumbnail ?? templateThumbnail,
          fields,
          conditionalLogic: settings?.conditionalLogic || [],
          settings,
        };
        if (formId && formId !== 'new') {
          await axios.put(`${API_URL}/prebuilt-templates/${formId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        } else {
          await axios.post(`${API_URL}/prebuilt-templates`, payload, { headers: { Authorization: `Bearer ${token}` } });
        }
        setSaveStatus('Template saved!');
        setTimeout(() => { setSaveStatus(''); navigate('/manage-templates'); }, 1500);
      } else {
        const payload = { title: formTitle, description: formDesc, status: formStatus, fields, settings };
        if (formId && formId !== 'new') {
          await axios.patch(`${API_URL}/forms/${formId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        } else {
          await axios.post(`${API_URL}/forms`, payload, { headers: { Authorization: `Bearer ${token}` } });
        }
        setSaveStatus('Saved successfully!');
        setTimeout(() => { setSaveStatus(''); navigate('/forms'); }, 1500);
      }
    } catch {
      setSaveStatus('Failed to save.');
      setSaveIsError(true);
      setTimeout(() => setSaveStatus(''), 4000);
    } finally {
      setSaving(false);
    }
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const getFieldIcon = (type: FieldType) => {
    const map: Record<FieldType, React.ReactNode> = {
      text: <FileText className="h-4 w-4" />,
      textarea: <FileText className="h-4 w-4" />,
      number: <Binary className="h-4 w-4" />,
      email: <Mail className="h-4 w-4" />,
      select: <List className="h-4 w-4" />,
      dropdown: <List className="h-4 w-4" />,
      checkbox: <CheckSquare className="h-4 w-4" />,
      radio: <Dot className="h-4 w-4" />,
      date: <Calendar className="h-4 w-4" />,
      file: <Upload className="h-4 w-4" />,
      rating: <Sparkles className="h-4 w-4" />,
      gps: <Navigation className="h-4 w-4" />,
    };
    return map[type] ?? <FileText className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading form structure...</p>
      </div>
    );
  }

  const fieldTypes: FieldType[] = ['text', 'textarea', 'number', 'email', 'select', 'checkbox', 'radio', 'date', 'file', 'rating', 'gps'];

  return (
    <div className="flex flex-col gap-5 h-full min-h-[80vh]">
      {/* Template Metadata Modal */}
      {showTemplateMetaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Template Details</h3>
              <button onClick={() => setShowTemplateMetaModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">Before saving, provide some details about this template.</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Category</label>
                <input type="text" value={templateCategory} onChange={e => setTemplateCategory(e.target.value)}
                  className="mt-1 bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3 py-2 w-full text-slate-800 outline-none transition"
                  placeholder="e.g. Agriculture, Health, Education" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tags (comma-separated)</label>
                <input type="text" value={templateTags} onChange={e => setTemplateTags(e.target.value)}
                  className="mt-1 bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-3 py-2 w-full text-slate-800 outline-none transition"
                  placeholder="e.g. survey, crop, livestock" />
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowTemplateMetaModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-semibold transition">
                Cancel
              </button>
              <button onClick={async () => {
                setShowTemplateMetaModal(false);
                await doSave({ category: templateCategory, tags: templateTags, thumbnail: templateThumbnail });
              }}
                className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isTemplateMode ? '/manage-templates' : '/forms')}
            className="p-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 rounded-xl transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-800 flex items-center gap-2">
              {isTemplateMode && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full uppercase tracking-wide">Template Mode</span>
              )}
              {formId && formId !== 'new' ? (isTemplateMode ? 'Edit Template' : 'Edit Form') : (isTemplateMode ? 'Create Prebuilt Template' : 'Create New Form')}
            </h1>
            <span className="text-xs text-slate-400">{isTemplateMode ? 'Build a reusable prebuilt template' : 'Build interactive survey forms'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="p-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-xl transition disabled:opacity-40 shadow-sm"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 rounded-xl transition disabled:opacity-40 shadow-sm"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1" />
          {saveStatus && (
            <span className={`text-xs font-semibold px-2 animate-pulse ${saveIsError ? 'text-rose-600' : 'text-brand-600'}`}>
              {saveStatus}
            </span>
          )}
          <button
            onClick={handleSaveForm}
            disabled={saving}
            className={`px-4 py-2 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-md ${
              isTemplateMode
                ? 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'
                : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/20'
            }`}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {isTemplateMode ? 'Save Template' : 'Save Form'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sidebar: Field Types */}
        <div className="lg:col-span-3 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-1">Form Elements</h2>
          <p className="text-[11px] text-slate-400 mb-4">Click to add to your form</p>
          <div className="grid grid-cols-2 gap-2">
            {fieldTypes.map((type) => (
              <button
                key={type}
                onClick={() => addField(type)}
                className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-brand-50 hover:border-brand-200 border border-slate-200 rounded-xl text-slate-500 hover:text-brand-600 transition cursor-pointer"
              >
                <span className="bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
                  {getFieldIcon(type)}
                </span>
                <span className="text-xs font-medium capitalize">{type}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Form meta */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="border-0 border-b border-transparent hover:border-slate-200 focus:border-brand-400 text-xl font-bold tracking-tight text-slate-800 focus:ring-0 p-1 w-full rounded transition outline-none bg-transparent"
              placeholder="Form Title"
            />
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="border-0 border-b border-transparent hover:border-slate-200 focus:border-brand-400 text-slate-500 text-sm focus:ring-0 p-1 w-full rounded h-16 resize-none transition outline-none bg-transparent"
              placeholder="Optional description for respondents..."
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Status:</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold rounded-lg text-brand-600 px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Fields Canvas */}
          <div className={`flex flex-col gap-3 min-h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 p-5 rounded-2xl relative`}>
            {fields.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-sm">
                  <Plus className="h-6 w-6 text-slate-300 animate-pulse" />
                </div>
                <p className="text-sm font-medium">Your form canvas is empty</p>
                <p className="text-xs text-slate-400">Select elements from the left panel to add fields</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {fields.map((field, idx) => (
                    <SortableFieldCard
                      key={field.id}
                      field={field}
                      idx={idx}
                      totalFields={fields.length}
                      isSelected={selectedFieldId === field.id}
                      onSelect={() => selectField(field.id)}
                      onRemove={() => removeField(field.id)}
                      onMoveUp={() => reorderFields(idx, idx - 1)}
                      onMoveDown={() => reorderFields(idx, idx + 1)}
                      getFieldIcon={getFieldIcon}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Right Sidebar: Properties */}
        <div className="lg:col-span-3">
          {selectedField ? (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-700">Field Properties</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Customize the selected field</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Label</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    className={sidebarInputClass}
                  />
                </div>

                {selectedField.type !== 'rating' && selectedField.type !== 'gps' && selectedField.type !== 'checkbox' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Placeholder</label>
                    <input
                      type="text"
                      value={selectedField.placeholder || ''}
                      onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                      className={sidebarInputClass}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-b border-slate-100 py-3">
                  <span className="text-xs text-slate-600 font-medium">Required</span>
                  <input
                    type="checkbox"
                    checked={!!selectedField.required}
                    onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                    className="rounded text-brand-500 focus:ring-brand-200 border-slate-300 cursor-pointer"
                  />
                </div>

                {(['select', 'dropdown', 'radio', 'checkbox'].includes(selectedField.type?.toLowerCase())) && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Options (comma separated)</label>
                    <textarea
                      value={
                        selectedField.options
                          ?.map((opt: any) => (typeof opt === 'object' && opt !== null ? (opt.label || opt.value) : opt))
                          .join(', ') || ''
                      }
                      onChange={(e) =>
                        updateField(selectedField.id, {
                          options: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                        })
                      }
                      className={`${sidebarInputClass} h-20 resize-none`}
                    />
                  </div>
                )}

                {/* Conditional Logic */}
                <div className="flex flex-col gap-2 pt-1">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                    <EyeOff className="h-3.5 w-3.5 text-amber-500" />
                    Conditional Logic
                  </label>
                  <p className="text-[10px] text-slate-400">Show this field only when another field matches a value.</p>
                  <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label className="text-[10px] text-slate-400 font-semibold">Depends on Field</label>
                    <select
                      value={selectedField.conditions?.fieldId || ''}
                      onChange={(e) => {
                        updateField(selectedField.id, {
                          conditions: { fieldId: e.target.value || undefined, value: selectedField.conditions?.value || '' },
                        });
                      }}
                      className="bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 w-full text-slate-600 outline-none"
                    >
                      <option value="">— No condition —</option>
                      {fields.filter((f) => f.id !== selectedField.id).map((f) => (
                        <option key={f.id} value={f.id}>{f.label || f.id}</option>
                      ))}
                    </select>

                    {selectedField.conditions?.fieldId && (
                      <div className="flex flex-col gap-1 mt-1">
                        <label className="text-[10px] text-slate-400 font-semibold">When value equals</label>
                        <input
                          type="text"
                          value={selectedField.conditions?.value || ''}
                          onChange={(e) =>
                            updateField(selectedField.id, {
                              conditions: { fieldId: selectedField.conditions?.fieldId, value: e.target.value },
                            })
                          }
                          placeholder="e.g. Yes"
                          className="bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 w-full text-slate-700 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-700">Form Settings</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Global form configuration</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Submit Button Text</label>
                  <input
                    type="text"
                    value={settings.submitButtonText || 'Submit'}
                    onChange={(e) => updateSettings({ submitButtonText: e.target.value })}
                    className={sidebarInputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Success Message</label>
                  <textarea
                    value={settings.successMessage || 'Thank you! Your submission has been received.'}
                    onChange={(e) => updateSettings({ successMessage: e.target.value })}
                    className={`${sidebarInputClass} h-20 resize-none`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}