import React from 'react';
import { BarChart2 } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
      <BarChart2 className="w-12 h-12 opacity-30" />
      <p className="text-sm font-medium">Analytics coming soon.</p>
    </div>
  );
}