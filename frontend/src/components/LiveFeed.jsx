import React from 'react';
import { Activity, CheckCircle2, XCircle, Smartphone, Radio, Clock } from 'lucide-react';

export default function LiveFeed({ alerts = [] }) {
  // Sort by respondedAt desc, then sentAt desc
  const activeResponses = [...alerts]
    .filter(a => a.status === 'confirmed' || a.status === 'declined' || a.status === 'sent' || a.status === 'delivered')
    .sort((a, b) => {
      const timeA = new Date(a.respondedAt || a.sentAt || 0).getTime();
      const timeB = new Date(b.respondedAt || b.sentAt || 0).getTime();
      return timeB - timeA;
    });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[520px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400" />
            Live Donor Mobilization Feed
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
          {activeResponses.length} events
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {activeResponses.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Radio className="w-8 h-8 mb-2 opacity-40 animate-pulse" />
            <p className="text-xs">No broadcast active yet.</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Create a blood request to trigger Africa's Talking SMS alerts and watch live responses.
            </p>
          </div>
        ) : (
          activeResponses.map((alert) => {
            const isConfirmed = alert.status === 'confirmed';
            const isDeclined = alert.status === 'declined';
            const isPending = alert.status === 'sent' || alert.status === 'delivered';

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border transition-all duration-300 text-xs ${
                  isConfirmed
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-slate-200'
                    : isDeclined
                    ? 'bg-rose-950/20 border-rose-900/30 text-slate-300'
                    : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    {isConfirmed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {isDeclined && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    {isPending && <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    <span className="truncate max-w-[140px]">{alert.donorName}</span>
                    <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-slate-800 text-rose-300 border border-rose-900/40">
                      {alert.donorBloodType || alert.bloodType}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    isConfirmed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    isDeclined ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}>
                    {isConfirmed ? 'YES (Available)' : isDeclined ? 'Declined' : 'Alert Sent'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <div className="flex items-center gap-2">
                    <span>{alert.distanceKm ? `${alert.distanceKm} km away` : 'In radius'}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">{alert.donorPhone}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Smartphone className="w-3 h-3 text-slate-400" />
                    <span>
                      {alert.responseChannel === 'sms' ? "Africa's Talking SMS" :
                       alert.responseChannel === 'sms_simulated' ? 'SMS Inbound' :
                       alert.responseChannel === 'inapp' ? 'In-App Tap' : 'SMS Outbound'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
