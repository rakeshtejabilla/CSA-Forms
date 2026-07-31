import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
      {/* Icon Graphic */}
      <div className="w-24 h-24 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-500 mb-6 shadow-sm relative animate-bounce">
        <Compass className="w-12 h-12" />
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[10px] font-bold px-2 py-0.5 shadow-sm border border-white">
          404
        </span>
      </div>

      <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Page Not Found</h1>
      <p className="text-slate-500 text-sm mt-2 max-w-sm">
        The route you are trying to reach does not exist or may have been relocated.
      </p>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-brand-500/20"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </button>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl text-sm font-semibold transition-all shadow-sm"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
