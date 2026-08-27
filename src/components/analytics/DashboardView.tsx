import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { WidgetRenderer } from './WidgetRenderer';
import { Download, FileText, Image as ImageIcon, Trash2, Edit } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../context/useAuthStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DashboardViewProps {
  dashboard: any;
  onRefresh: () => void;
  onAddWidget: () => void;
}

export const DashboardView = ({ dashboard, onRefresh, onAddWidget }: DashboardViewProps) => {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { token, user } = useAuthStore();
  const [exporting, setExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getWidgetSpan = (w: any) => {
    const width = w.layout?.w || 1;
    if (isMobile) return 'span 1 / span 1';
    if (isTablet) {
      return `span ${Math.min(width, 2)} / span ${Math.min(width, 2)}`;
    }
    return `span ${width} / span ${width}`;
  };

  const handleDeleteWidget = async (widgetId: string) => {
    if (!confirm('Are you sure you want to delete this widget?')) return;
    try {
      await axios.delete(`${API_URL}/analytics/widgets/${widgetId}`, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.text(dashboard.title, 10, 10);
      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
      pdf.save(`${dashboard.title.replace(/\s+/g, '_')}_Dashboard.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPNG = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `${dashboard.title.replace(/\s+/g, '_')}_Dashboard.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async (widget: any) => {
    try {
      const res = await axios.post(`${API_URL}/analytics/query`, {
        formId: widget.formId,
        config: widget.queryConfig
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      const ws = XLSX.utils.json_to_sheet(res.data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${widget.title.replace(/\s+/g, '_')}.xlsx`);
    } catch (e) {
      console.error('Failed to export widget data', e);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800">{dashboard.title}</h2>
          {dashboard.description && <p className="text-sm text-slate-500 mt-1">{dashboard.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} disabled={exporting} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition">
            <FileText className="h-4 w-4" /> PDF
          </button>
          <button onClick={handleExportPNG} disabled={exporting} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition">
            <ImageIcon className="h-4 w-4" /> PNG
          </button>
          {dashboard.ownerId === user?.id && (
            <button onClick={onAddWidget} className="px-4 py-2 bg-brand-500 hover:bg-brand-600 border border-transparent rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-md shadow-brand-500/20">
              Add Widget
            </button>
          )}
        </div>
      </div>

      <div ref={dashboardRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[400px]">
        {dashboard.widgets.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white border border-slate-200 border-dashed rounded-2xl">
            <p className="text-slate-500 text-sm font-medium">No widgets yet. Add one to start analyzing data!</p>
          </div>
        ) : (
          dashboard.widgets.map((w: any) => (
            <div key={w.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 relative group" style={{ gridColumn: getWidgetSpan(w) }}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 tracking-tight text-sm">{w.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => handleExportExcel(w)} title="Export to Excel" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  {dashboard.ownerId === user?.id && (
                    <button onClick={() => handleDeleteWidget(w.id)} title="Delete Widget" className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-[200px]">
                <WidgetRenderer widget={w} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
