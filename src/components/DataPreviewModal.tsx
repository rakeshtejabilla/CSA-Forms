import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, AlertCircle, Loader2 } from 'lucide-react';

interface DataPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => void;
  initialData: any[];
  headers: string[];
  isUploading: boolean;
  errors: string[];
}

export default function DataPreviewModal({
  isOpen,
  onClose,
  onUpload,
  initialData,
  headers,
  isUploading,
  errors,
}: DataPreviewModalProps) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Create a deep copy of initial data to allow editing
      setData(JSON.parse(JSON.stringify(initialData)));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleCellChange = (rowIndex: number, header: string, value: string) => {
    const newData = [...data];
    newData[rowIndex][header] = value;
    setData(newData);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newData = data.filter((_, idx) => idx !== rowIndex);
    setData(newData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Preview Data</h3>
            <p className="text-xs text-slate-500 mt-1">
              Review and edit your data before uploading. Found {data.length} rows.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Errors Section */}
        {errors.length > 0 && (
          <div className="mx-6 mt-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-1">Import Failed with Errors</h4>
              <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                {errors.slice(0, 10).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {errors.length > 10 && (
                  <li>...and {errors.length - 10} more errors.</li>
                )}
              </ul>
              <p className="text-xs text-red-700 mt-2 font-medium">
                Please correct the data in the table below and try uploading again.
              </p>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-semibold border-b border-slate-200 w-12 text-center">#</th>
                  {headers.map((header) => (
                    <th key={header} className="px-4 py-3 font-semibold border-b border-slate-200 whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold border-b border-slate-200 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={headers.length + 2} className="px-4 py-8 text-center text-slate-400">
                      No data to preview.
                    </td>
                  </tr>
                ) : (
                  data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2 text-center text-slate-400 font-medium bg-slate-50/30">
                        {rowIndex + 1}
                      </td>
                      {headers.map((header) => (
                        <td key={`${rowIndex}-${header}`} className="px-0 py-0 border-x border-slate-50">
                          <input
                            type="text"
                            value={row[header] === null || row[header] === undefined ? '' : String(row[header])}
                            onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                            className="w-full h-full min-w-[120px] px-4 py-3 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:z-10 relative transition-all"
                            placeholder="Empty"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleDeleteRow(rowIndex)}
                          title="Delete Row"
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onUpload(data)}
            disabled={isUploading || data.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-brand-500/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
