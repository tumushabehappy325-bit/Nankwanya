import React, { useState, useEffect } from 'react';
import { History, CheckCircle, Clock, XCircle, ChevronRight, Hospital, Calendar, Users } from 'lucide-react';
import { fetchBloodRequests, updateRequestStatus } from '../services/api';

export default function RequestHistory({ onSelectRequest }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const res = await fetchBloodRequests();
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = requests.filter(r => {
    if (filter === 'active') return r.status === 'active';
    if (filter === 'fulfilled') return r.status === 'fulfilled';
    return true;
  });

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await updateRequestStatus(id, newStatus);
      if (res.success) {
        setRequests(prev => prev.map(r => r.id === id ? res.request : r));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-rose-500" />
            Blood Mobilization History
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit log of all emergency blood mobilization campaigns across Mbarara facilities
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['all', 'active', 'fulfilled'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition ${
                filter === f
                  ? 'bg-rose-600 text-white shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f} ({requests.filter(r => f === 'all' ? true : r.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500">Loading history...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500">
          No blood mobilization requests found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map(req => {
            const isFulfilled = req.status === 'fulfilled';
            const isActive = req.status === 'active';

            return (
              <div
                key={req.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg transition flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center font-mono font-extrabold text-lg text-rose-400">
                    {req.bloodType}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">
                        {req.facilityName || 'MRRH'}
                      </h3>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        req.urgency === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        req.urgency === 'urgent' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {req.urgency}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()}
                      </span>
                      <span>•</span>
                      <span>Radius: <strong className="text-slate-300">{req.radiusKm} km</strong></span>
                      <span>•</span>
                      <span>Target: <strong className="text-slate-300">{req.requiredUnits || 3} units</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-400 font-mono">
                      {req.confirmedDonorsCount || 0} Confirmed
                    </div>
                    <div className="text-[11px] text-slate-400">
                      from {req.matchedDonorsCount || 0} Alerted Donors
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <button
                        onClick={() => handleStatusChange(req.id, 'fulfilled')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition"
                      >
                        Complete
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
                        Fulfilled
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
