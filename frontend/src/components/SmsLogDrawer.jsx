import React, { useState } from 'react';
import { Terminal, X, CheckCircle, AlertCircle, RefreshCw, Send, ShieldCheck } from 'lucide-react';

export default function SmsLogDrawer({ isOpen, onClose, alerts = [] }) {
  const [filter, setFilter] = useState('all');

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'confirmed') return a.status === 'confirmed';
    if (filter === 'failed') return a.status === 'failed';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-950 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Africa's Talking SMS Gateway — Dispatch Audit Log
                <span className="text-xs bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded font-mono">
                  Live API Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Verifiable transmission logs for judges: payloads, timestamps, error envelopes, and SMS delivery reports.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex items-center gap-2 mb-3">
          {['all', 'confirmed', 'failed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                filter === f
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f} ({alerts.filter(a => f === 'all' ? true : a.status === f).length})
            </button>
          ))}
        </div>

        {/* Logs container */}
        <div className="flex-1 overflow-y-auto space-y-2.5 font-mono text-xs pr-1">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No transmission logs found matching filter.
            </div>
          ) : (
            filteredAlerts.map((log, idx) => (
              <div
                key={log.id || idx}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{new Date(log.sentAt || Date.now()).toLocaleTimeString()}</span>
                    <span className="font-bold text-slate-200">{log.donorName}</span>
                    <span className="text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/50">
                      {log.donorPhone}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{log.channel?.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      log.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                      log.status === 'failed' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                      'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60 text-slate-300">
                  <div className="text-[10px] text-slate-500 mb-0.5">MESSAGE PAYLOAD:</div>
                  "{log.message}"
                </div>

                {log.errorMessage && (
                  <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px] flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>API Notice: {log.errorMessage}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Africa's Talking Uganda Gateway Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
