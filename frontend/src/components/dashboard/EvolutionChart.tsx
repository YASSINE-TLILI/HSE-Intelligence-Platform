import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const data30J = [
  { name: 'S1', declarés: 45, resolus: 30 },
  { name: 'S2', declarés: 52, resolus: 48 },
  { name: 'S3', declarés: 38, resolus: 35 },
  { name: 'S4', declarés: 65, resolus: 45 },
  { name: 'S5', declarés: 48, resolus: 42 },
  { name: 'S6', declarés: 70, resolus: 65 },
  { name: 'S7', declarés: 75, resolus: 58 },
  { name: 'S8', declarés: 42, resolus: 40 },
];
const data7J  = data30J.slice(-2);
const data90J = [
  { name: 'M1', declarés: 120, resolus: 110 },
  { name: 'M2', declarés: 150, resolus: 135 },
  { name: 'M3', declarés: 180, resolus: 160 },
];

export default function EvolutionChart({ range = '30J' }: { range?: string }) {
  const data = range === '7J' ? data7J : range === '90J' ? data90J : data30J;

  return (
    <div className="h-full w-full min-h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
          <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
          <Legend verticalAlign="top" align="left" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '13px', fontWeight: 500, color: '#64748b' }} />
          <Bar dataKey="declarés" name="Déclarés" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
          <Bar dataKey="resolus"  name="Résolus"  fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}