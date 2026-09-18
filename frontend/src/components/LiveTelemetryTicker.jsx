import React from 'react';
import { Radio, ShieldCheck, Thermometer, Zap, AlertTriangle } from 'lucide-react';

export default function LiveTelemetryTicker({ containers = [] }) {
  if (!containers || containers.length === 0) return null;

  const totalUnits = containers.length;
  const criticalSpikes = containers.filter(c => c.temperatureStatus === 'CRITICAL' || c.temperatureStatus === 'WARNING').length;
  const compliantCount = totalUnits - criticalSpikes;
  const complianceRate = Math.round((compliantCount / totalUnits) * 100);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-bold text-[11px] uppercase tracking-wider">Live Event Stream</span>
        </div>
        <span className="text-slate-400 hidden sm:inline">|</span>
        <div className="flex items-center gap-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Cold-Chain SLA Rate: <strong className="text-emerald-400">{complianceRate}%</strong></span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Nominal: <strong className="text-slate-200">{compliantCount}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          <span>Excursions: <strong className={criticalSpikes > 0 ? "text-rose-400 font-bold" : "text-slate-200"}>{criticalSpikes}</strong></span>
        </div>

        <div className="hidden lg:flex items-center gap-1 text-slate-500 border-l border-slate-800 pl-3">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Real-time Socket.IO Sync</span>
        </div>
      </div>
    </div>
  );
}
