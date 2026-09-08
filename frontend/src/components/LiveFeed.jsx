import React, { useState } from 'react';
import { Activity, CheckCircle2, XCircle, Smartphone, Radio, Clock, Shield, PhoneCall, Lock } from 'lucide-react';
import { requestDonorContact } from '../services/api';
import { useAuth } from '../context/AuthContext';

function getInitials(name) {
  if (!name) return 'D.';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map(p => p[0].toUpperCase() + '.').join('');
}

export default function LiveFeed({ alerts = [] }) {
  const { user } = useAuth();
  const [revealedContacts, setRevealedContacts] = useState({});
  const [requestingId, setRequestingId] = useState(null);

  // Sort by respondedAt desc, then sentAt desc
  const activeResponses = [...alerts]
    .filter(a => a.status === 'confirmed' || a.status === 'declined' || a.status === 'sent' || a.status === 'delivered')
    .sort((a, b) => {
      const timeA = new Date(a.respondedAt || a.sentAt || 0).getTime();
      const timeB = new Date(b.respondedAt || b.sentAt || 0).getTime();
      return timeB - timeA;
    });

  const handleRequestContact = async (alert) => {
    try {
      setRequestingId(alert.id);
      const requester = user?.name ? `${user.name} (${user.facilityName || 'MRRH'})` : 'Hospital Staff (MRRH)';
      const res = await requestDonorContact(alert.id, requester);
      if (res.success) {
        setRevealedContacts(prev => ({
          ...prev,
          [alert.id]: {
            phone: res.phone,
            requestedAt: res.disclosure?.requestedAt || new Date().toISOString(),
            requestedBy: res.disclosure?.requestedBy || requester
          }
        }));
      }
    } catch (e) {
      console.error('Failed to request donor contact:', e);
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col h-[520px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
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

      {/* DPPA 2019 Privacy Assurance Banner */}
      <div className="mb-2 px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-[10px] text-slate-400">
        <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="leading-tight">
          <strong>DPPA Privacy Shield:</strong> Donor contact numbers masked by default to eliminate broker harvesting risks. Disclosures require an audit log.
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
            const initials = alert.donorInitials || getInitials(alert.donorName);
            const revealed = revealedContacts[alert.id];

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
                {/* Header: Donor Initials + Distance + Blood Type */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    {isConfirmed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {isDeclined && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    {isPending && <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    
                    <span className="font-bold text-slate-100 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700">
                      Donor {initials}
                    </span>

                    <span className="text-[11px] text-slate-400 font-normal">
                      • {alert.distanceKm !== undefined ? `${alert.distanceKm} km` : 'In radius'}
                    </span>

                    <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-rose-950/60 text-rose-300 border border-rose-900/40">
                      {alert.donorBloodType || alert.bloodType}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    isConfirmed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    isDeclined ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}>
                    {isConfirmed ? 'YES (Confirmed)' : isDeclined ? 'Declined' : 'Alert Sent'}
                  </span>
                </div>

                {/* Sub-row: Channel & Privacy Masking / Disclosure Action */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60 gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Smartphone className="w-3 h-3 text-slate-400" />
                    <span>
                      {alert.responseChannel === 'sms' ? "Africa's Talking SMS" :
                       alert.responseChannel === 'sms_simulated' ? 'SMS Inbound' :
                       alert.responseChannel === 'inapp' ? 'In-App Tap' : 'SMS Outbound'}
                    </span>
                  </div>

                  {/* Privacy / Request Contact Area */}
                  {isConfirmed && (
                    revealed ? (
                      <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-1 rounded-lg">
                        <PhoneCall className="w-3 h-3 text-emerald-400" />
                        <span className="font-mono font-bold text-emerald-300 text-xs">{revealed.phone}</span>
                        <span className="text-[9px] text-emerald-400/80 bg-emerald-900/60 px-1 py-0.2 rounded">
                          Audited #{alert.id.slice(-4)}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRequestContact(alert)}
                        disabled={requestingId === alert.id}
                        className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-[11px] font-semibold transition flex items-center gap-1.5"
                        title="Log disclosure per Uganda DPPA 2019 to contact donor for timing"
                      >
                        <Lock className="w-3 h-3 text-amber-400" />
                        {requestingId === alert.id ? 'Logging Disclosure...' : 'Request Contact'}
                      </button>
                    )
                  )}

                  {!isConfirmed && (
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-slate-600" />
                      Phone Masked (DPPA)
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
