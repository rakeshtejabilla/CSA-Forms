import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../context/useAuthStore';
import { useOfflineStore } from '../context/useOfflineStore';
import { useForm, Controller } from 'react-hook-form';
import {
  ArrowLeft,
  Navigation,
  Save,
  CheckCircle,
  CloudLightning,
  AlertTriangle,
  RotateCcw,
  Star,
  Loader2,
  Upload,
} from 'lucide-react';



const API_URL = import.meta.env.VITE_API_URL || '/api';

const inputClass =
  'bg-slate-50 border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 rounded-xl text-sm px-4 py-2.5 w-full text-slate-800 outline-none transition placeholder-slate-400';

interface SignaturePadProps {
  onChange: (val: string) => void;
  value: string;
}

const SignaturePad = ({ onChange, value }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2 w-full">
      <canvas
        ref={canvasRef}
        width={500}
        height={150}
        className="bg-white border border-slate-200 rounded-lg cursor-crosshair w-full max-w-md h-[150px]"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={clear}
          className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-500 transition"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

interface FileUploadProps {
  onChange: (val: string) => void;
  value: string;
}

const FileUpload = ({ onChange, value }: FileUploadProps) => {
  const { token } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers: any = { 'Content-Type': 'multipart/form-data' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await axios.post(`${API_URL}/files/upload`, formData, { headers });
      onChange(res.data.url);
    } catch (err: any) {
      setError('File upload failed. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3 w-full">
      {value ? (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-slate-700 truncate">{value.split('/').pop()}</span>
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-rose-500 hover:underline font-medium"
          >
            Remove
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition relative">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-brand-600">Click to upload</span> or drag and drop
                </p>
              </>
            )}
          </div>
          <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
      )}
      {error && <span className="text-[11px] text-rose-600 font-medium">{error}</span>}
    </div>
  );
};

export default function DynamicFormRenderer() {
  const { formId } = useParams() as { formId: string };
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { isOnline, queueSubmission } = useOfflineStore();

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsData, setGpsData] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);

  const { handleSubmit, control, watch, setValue, register, formState: { errors } } = useForm();
  const formValues = watch();

  useEffect(() => {
    const fetchForm = async () => {
      setLoading(true);
      try {
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await axios.get(`${API_URL}/forms/${formId}`, { headers });
        setForm(res.data);
      } catch {
        setErrorMsg('Failed to load form. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [formId, token]);

  const handleCaptureGps = () => {
    setGpsLoading(true);
    const apply = (sim: { latitude: number; longitude: number; accuracy: number }) => {
      setGpsData(sim);
      setValue('gps', JSON.stringify(sim));
      setGpsLoading(false);
    };
    if (!navigator.geolocation) {
      setTimeout(() => apply({ latitude: 37.7749, longitude: -122.4194, accuracy: 10 }), 1000);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => apply({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => setTimeout(() => apply({ latitude: 37.7749, longitude: -122.4194, accuracy: 15 }), 1000),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      await queueSubmission(formId, data, user?.name, gpsData || undefined);
      setSuccess(true);
    } catch (e: any) {
      setErrorMsg(e.message || 'Submission failed. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const shouldShowField = (field: any) => {
    if (!field.conditions || !field.conditions.fieldId) return true;
    return String(formValues[field.conditions.fieldId]) === String(field.conditions.value);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-10 w-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Loading form...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto bg-white border border-slate-200 p-10 rounded-3xl text-center flex flex-col items-center gap-6 shadow-card relative overflow-hidden mt-8">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-emerald-400" />
        <div className="bg-emerald-100 p-5 rounded-full text-emerald-600">
          <CheckCircle className="h-12 w-12" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Submitted Successfully!</h2>
          <p className="text-sm text-slate-500 mt-2">
            {form?.settings?.successMessage || 'Thank you! Your response has been recorded.'}
          </p>
        </div>
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 flex items-center gap-2">
            <CloudLightning className="h-4 w-4" />
            <span>Saved offline — will sync automatically when back online.</span>
          </div>
        )}
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-card relative overflow-hidden my-4">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-emerald-400" />

      {/* Form Header */}
      <div className="p-6 md:p-8 border-b border-slate-100 flex items-start gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 rounded-xl transition shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">{form?.title || 'Untitled Form'}</h1>
          {form?.description && (
            <p className="text-xs text-slate-500 mt-1">{form.description}</p>
          )}
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 flex flex-col gap-6">
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {form?.fields?.map((field: any) => {
          if (!shouldShowField(field)) return null;
          return (
            <div key={field.id} className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                {field.label}
                {field.required && <span className="text-rose-500">*</span>}
              </label>

              {field.type === 'text' && (
                <input type="text" placeholder={field.placeholder || ''} {...register(field.id, { required: field.required })} className={inputClass} />
              )}
              {field.type === 'textarea' && (
                <textarea placeholder={field.placeholder || ''} rows={4} {...register(field.id, { required: field.required })} className={`${inputClass} h-28 resize-none`} />
              )}
              {field.type === 'number' && (
                <input type="number" placeholder={field.placeholder || ''} {...register(field.id, { required: field.required })} className={inputClass} />
              )}
              {field.type === 'email' && (
                <input type="email" placeholder={field.placeholder || ''} {...register(field.id, { required: field.required })} className={inputClass} />
              )}
              {field.type === 'date' && (
                <input type="date" {...register(field.id, { required: field.required })} className={inputClass} />
              )}
              {(field.type === 'select' || field.type === 'dropdown') && (
                <select {...register(field.id, { required: field.required })} className={`${inputClass} cursor-pointer`}>
                  <option value="">{field.placeholder || '— Select an option —'}</option>
                  {field.options?.map((opt: any, i: number) => {
                    const label = typeof opt === 'object' && opt !== null ? (opt.label || opt.value) : opt;
                    const value = typeof opt === 'object' && opt !== null ? opt.value : opt;
                    return (
                      <option key={i} value={value}>{label}</option>
                    );
                  })}
                </select>
              )}
              {field.type === 'radio' && (
                <div className="flex flex-col gap-2 mt-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {field.options?.map((opt: any, i: number) => {
                    const label = typeof opt === 'object' && opt !== null ? (opt.label || opt.value) : opt;
                    const value = typeof opt === 'object' && opt !== null ? opt.value : opt;
                    return (
                      <label key={i} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                        <input type="radio" value={value} {...register(field.id, { required: field.required })} className="text-brand-500 focus:ring-brand-200 border-slate-300 cursor-pointer" />
                        {label}
                      </label>
                    );
                  })}
                </div>
              )}
              {field.type === 'checkbox' && (
                <div className="flex flex-col gap-2 mt-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {field.options?.map((opt: any, i: number) => {
                    const label = typeof opt === 'object' && opt !== null ? (opt.label || opt.value) : opt;
                    const value = typeof opt === 'object' && opt !== null ? opt.value : opt;
                    return (
                      <label key={i} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" value={value} {...register(`${field.id}.${value}`)} className="text-brand-500 focus:ring-brand-200 rounded border-slate-300 cursor-pointer" />
                        {label}
                      </label>
                    );
                  })}
                </div>
              )}
              {field.type === 'rating' && (
                <Controller
                  name={field.id}
                  control={control}
                  rules={{ required: field.required }}
                  defaultValue={0}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex items-center gap-2 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" onClick={() => onChange(star)} className="p-0.5 hover:scale-110 transition">
                          <Star className={`h-7 w-7 ${star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
                        </button>
                      ))}
                    </div>
                  )}
                />
              )}
              {field.type === 'gps' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Navigation className="h-5 w-5 text-brand-500" />
                    {gpsData ? (
                      <p className="text-xs text-slate-700 font-semibold">
                        Lat: {gpsData.latitude.toFixed(6)}, Lng: {gpsData.longitude.toFixed(6)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">GPS coordinates not yet captured.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={gpsLoading}
                    className="px-4 py-1.5 bg-white border border-slate-200 hover:border-brand-300 hover:text-brand-600 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                  >
                    {gpsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    {gpsLoading ? 'Capturing...' : 'Capture GPS'}
                  </button>
                </div>
              )}

              {field.type === 'file' && (
                <Controller
                  name={field.id}
                  control={control}
                  rules={{ required: field.required }}
                  defaultValue=""
                  render={({ field: { value, onChange } }) => (
                    <FileUpload onChange={onChange} value={value} />
                  )}
                />
              )}

              {field.type === 'signature' && (
                <Controller
                  name={field.id}
                  control={control}
                  rules={{ required: field.required }}
                  defaultValue=""
                  render={({ field: { value, onChange } }) => (
                    <SignaturePad onChange={onChange} value={value} />
                  )}
                />
              )}

              {errors[field.id] && (
                <span className="text-[11px] text-rose-600 font-medium mt-0.5">This field is required.</span>
              )}
            </div>
          );
        })}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-2 py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white rounded-xl font-semibold tracking-tight shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {form?.settings?.submitButtonText || 'Submit Form'}
        </button>
      </form>
    </div>
  );
}