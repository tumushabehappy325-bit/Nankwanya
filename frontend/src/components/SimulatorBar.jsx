import React, { useState } from 'react';
import { Play, Sparkles, CheckCheck, XCircle, Users, ArrowRightLeft, Smartphone, RefreshCw } from 'lucide-react';
import { simulateSmsResponse } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SimulatorBar({ activeRequest, alerts = [], onSimulated }) {
  const { activeTab, setActiveTab, loginAsAdmin, loginAsDonor, isDonor, isAdmin } = useAuth();
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const pendingAlerts = alerts.filter(a => a.status === 'sent' || a.status === 'delivered');

  const handleSimulateOne = async (action = 'confirm') => {
    if (pendingAlerts.length === 0 && alerts.length === 0) {
      alert('Please create an active blood request first to generate donor alerts to simulate responses for.');
      return;
    }

    const targetAlert = pendingAlerts[0] || alerts[0];
    setIsSimulating(true);

    try {
      const res = await simulateSmsResponse({
        alertId: targetAlert.id,
        action
      });

      if (res.success) {
        setLastAction(`Simulated ${targetAlert.donorName} SMS ${action.toUpperCase()}`);
        if (onSimulated) onSimulated(res.alert);
      }
    } catch (err) {
      console.error('Simulator error:', err);
    } finally {
      setIsSimulating(false);
      setTimeout(() => setLastAction(null), 4000);
    }
  };

  const handleBatchConfirm = async () => {
    if (pendingAlerts.length === 0) {
      alert('No pending alerts left to confirm. Create a new blood request first!');
      return;
    }

    setIsSimulating(true);
    const toConfirm = pendingAlerts.slice(0, 3);

    for (const alertItem of toConfirm) {
      try {
        const res = await simulateSmsResponse({
          alertId: alertItem.id,
          action: 'confirm'
        });
        if (res.success && onSimulated) {
          onSimulated(res.alert);
        }
      } catch (e) {
        // continue
      }
    }

    setLastAction(`Batch confirmed ${toConfirm.length} donors!`);
    setIsSimulating(false);
    setTimeout(() => setLastAction(null), 4000);
  };

  return (
    <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 z-40 bg-slate-900/95 backdrop-blur-xl border border-rose-600/40 rounded-2xl p-2.5 sm:px-4 shadow-2xl shadow-black/80 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
      <div className="flex items-center gap-2 pr-2 border-r border-slate-800">
        <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
        <span className="font-bold text-rose-300 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Judge Demo Bar
        </span>
      </div>

      {/* Role Switcher */}
      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        <button
          onClick={() => { loginAsAdmin(); setActiveTab('admin'); }}
          className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
            activeTab === 'admin'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🏥 Hospital Admin
        </button>

        <button
          onClick={() => { loginAsDonor(); setActiveTab('donor'); }}
          className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
            activeTab === 'donor'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🩸 Donor Phone View
        </button>
      </div>

      {/* Simulator buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleSimulateOne('confirm')}
          disabled={isSimulating}
          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
          title="Simulate a donor replying YES via SMS"
        >
          <Smartphone className="w-3.5 h-3.5" />
          Simulate SMS "YES"
        </button>

        <button
          onClick={handleBatchConfirm}
          disabled={isSimulating || pendingAlerts.length === 0}
          className="hidden sm:flex px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold transition items-center gap-1.5 shadow-md shadow-amber-950/40"
          title="Simulate 3 donors confirming in rapid succession"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Batch 3 Donors
        </button>
      </div>

      {lastAction && (
        <span className="text-[11px] text-emerald-400 font-medium animate-fadeIn bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded-lg">
          {lastAction}
        </span>
      )}
    </div>
  );
}
