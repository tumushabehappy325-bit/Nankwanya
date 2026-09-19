import React from 'react';
import { Users, CheckCircle, XCircle, Clock, Heart, TrendingUp } from 'lucide-react';

export default function LiveResponseCounter({ activeRequest, alerts = [] }) {
  const totalAlerted = alerts.length;
  const confirmed = alerts.filter(a => a.status === 'confirmed').length;
  const declined = alerts.filter(a => a.status === 'declined').length;
  const pending = alerts.filter(a => a.status === 'sent' || a.status === 'delivered').length;

  const requiredUnits = activeRequest?.requiredUnits || 3;
  const progressPercent = Math.min(Math.round((confirmed / requiredUnits) * 100), 100);
  const responseRate = totalAlerted > 0 ? Math.round(((confirmed + declined) / totalAlerted) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* 1. Total Alerted */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Donors Alerted</span>
          <Users className="w-4 h-4 text-sky-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
            {totalAlerted}
          </span>
          <span className="text-[11px] text-sky-400 font-medium">via Pandora SMS</span>
        </div>
      </div>

      {/* 2. Confirmed (YES) */}
      <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl" />
        <div className="flex items-center justify-between text-emerald-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Confirmed (YES)</span>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
            {confirmed}
          </span>
          <span className="text-[11px] text-slate-400">/ {requiredUnits} required</span>
        </div>
      </div>

      {/* 3. Pending Response */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Reply</span>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono">
            {pending}
          </span>
          <span className="text-[11px] text-slate-400">in geofence</span>
        </div>
      </div>

      {/* 4. Response Rate / Goal Progress */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Goal Fulfillment</span>
          <TrendingUp className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
              {progressPercent}%
            </span>
            <span className="text-[11px] text-slate-400">{responseRate}% active response</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
