import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../context/useAuthStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export const WidgetRenderer = ({ widget }: { widget: any }) => {
  const { token } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.post(`${API_URL}/analytics/query`, {
          formId: widget.formId,
          config: widget.queryConfig
        }, { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data);
      } catch (e) {
        console.error('Failed to fetch widget data', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [widget, token]);

  if (loading) return <div className="h-full w-full flex items-center justify-center animate-pulse bg-slate-50 rounded-xl" />;

  const { chartType } = widget;

  if (chartType === 'kpi') {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-800">{data[0]?.value || 0}</span>
      </div>
    );
  }

  if (chartType === 'table') {
    return (
      <div className="h-full overflow-auto">
        <table className="w-full text-sm text-left text-slate-600">
          <thead className="text-xs uppercase bg-slate-50 text-slate-500 sticky top-0">
            <tr>
              <th className="px-4 py-3">{widget.queryConfig.xAxis || 'Category'}</th>
              <th className="px-4 py-3 text-right">{widget.queryConfig.aggregation}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                <td className="px-4 py-3 text-right">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === 'bar' ? (
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chartType === 'line' ? (
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        ) : chartType === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
            <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="#c4b5fd" />
          </AreaChart>
        ) : chartType === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} label>
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
          </PieChart>
        ) : <div/>}
      </ResponsiveContainer>
    </div>
  );
};
