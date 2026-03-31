import React from 'react';

interface KPICardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  trendGood?: boolean;
}

export default function KPICard({
  title, value, trend, trendUp,
  icon: Icon, iconColor, iconBg, trendGood = false,
}: KPICardProps) {
  const isTrendPositive = trendGood ? trendUp : !trendUp;
  const trendColorClass = isTrendPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${trendColorClass}`}>
          {trend}
        </div>
      </div>
      <div className="mt-auto">
        <h3 className="text-4xl font-bold text-slate-900 mb-1 tracking-tight">{value}</h3>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
      </div>
    </div>
  );
}