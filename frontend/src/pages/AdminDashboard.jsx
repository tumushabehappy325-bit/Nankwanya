import React, { useState, useEffect } from 'react';
import {
  Hospital, Plus, Flame, Activity, Terminal, CheckCircle2,
  RefreshCw, MapPin, Phone, ShieldCheck, AlertCircle, Share2
} from 'lucide-react';
import MapView from '../components/MapView';
import LiveResponseCounter from '../components/LiveResponseCounter';
import LiveFeed from '../components/LiveFeed';
import CreateRequestModal from '../components/CreateRequestModal';
import SmsLogDrawer from '../components/SmsLogDrawer';
import { fetchFacilities, fetchDonors, fetchBloodRequests, fetchAlerts, updateRequestStatus } from '../services/api';
import { subscribeToCollection } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeRequest, setActiveRequest] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initial load
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setIsLoading(true);
        const [facRes, donRes, reqRes] = await Promise.all([
          fetchFacilities(),
          fetchDonors(),
          fetchBloodRequests()
        ]);

        if (facRes.success && facRes.facilities.length > 0) {
          setFacilities(facRes.facilities);
          const current = facRes.facilities.find(f => f.id === user?.facilityId) || facRes.facilities[0];
          setSelectedFacility(current);
        }

        if (donRes.success) {
          setDonors(donRes.donors);
        }

        if (reqRes.success && reqRes.requests.length > 0) {
          setRequests(reqRes.requests);
          const active = reqRes.requests.find(r => r.status === 'active') || reqRes.requests[0];
          setActiveRequest(active);
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitial();
  }, [user]);

  // Real-time synchronization for alerts and requests (via Firestore listeners or fast polling)
  useEffect(() => {
    const unsubAlerts = subscribeToCollection('alerts', (updatedAlerts) => {
      setAlerts(updatedAlerts);
    });

    const unsubRequests = subscribeToCollection('bloodRequests', (updatedRequests) => {
      setRequests(updatedRequests);
      if (activeRequest) {
        const matching = updatedRequests.find(r => r.id === activeRequest.id);
        if (matching) setActiveRequest(matching);
      } else if (updatedRequests.length > 0) {
        setActiveRequest(updatedRequests[0]);
      }
    });

    return () => {
      if (unsubAlerts) unsubAlerts();
      if (unsubRequests) unsubRequests();
    };
  }, [activeRequest?.id]);

  // Filter alerts for currently viewed request
  const currentRequestAlerts = activeRequest
    ? alerts.filter(a => a.bloodRequestId === activeRequest.id)
    : alerts;

  const handleRequestCreated = (newReq, newAlerts) => {
    setActiveRequest(newReq);
    setRequests(prev => [newReq, ...prev]);
    if (newAlerts && newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev]);
    }
  };

  const handleMarkFulfilled = async () => {
    if (!activeRequest) return;
    try {
      const res = await updateRequestStatus(activeRequest.id, 'fulfilled');
      if (res.success) {
        setActiveRequest(res.request);
        setRequests(prev => prev.map(r => r.id === res.request.id ? res.request : r));
      }
    } catch (e) {
      console.error('Error fulfilling request:', e);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Operations Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-950">
            <Hospital className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {selectedFacility?.name || 'Mbarara Regional Referral Hospital (MRRH)'}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-mono">
                Active Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Coordinator: <strong>{user?.name || 'Sister Mary Kyomukama'}</strong></span>
              <span>•</span>
              <span className="font-mono">{selectedFacility?.contactPhone || '+256485420027'}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Facility switcher */}
          {facilities.length > 1 && (
            <select
              value={selectedFacility?.id || ''}
              onChange={(e) => {
                const fac = facilities.find(f => f.id === e.target.value);
                if (fac) setSelectedFacility(fac);
              }}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}

          {/* Africa's Talking logs trigger */}
          <button
            onClick={() => setIsLogDrawerOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition flex items-center gap-1.5 shadow"
          >
            <Terminal className="w-4 h-4 text-sky-400" />
            SMS Gateway Logs ({alerts.length})
          </button>

          {/* New blood request button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-950 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Raise Blood Need
          </button>
        </div>
      </div>

      {/* Active Request Overview Ribbon */}
      {activeRequest ? (
        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-900/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center font-extrabold text-base text-rose-400 font-mono">
              {activeRequest.bloodType}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  Active Emergency Need: {activeRequest.bloodType} Blood
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  activeRequest.urgency === 'critical' ? 'bg-rose-500 text-white' :
                  activeRequest.urgency === 'urgent' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {activeRequest.urgency}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Geofence Radius: <strong className="text-rose-400 font-mono">{activeRequest.radiusKm} km</strong> • Target: {activeRequest.requiredUnits} units • Initiated {new Date(activeRequest.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeRequest.status === 'active' ? (
              <button
                onClick={handleMarkFulfilled}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Need Fulfilled
              </button>
            ) : (
              <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
                Status: {activeRequest.status.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between text-xs text-slate-400">
          <span>No active blood request broadcast currently in progress.</span>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-rose-400 font-bold hover:underline"
          >
            Create first request &rarr;
          </button>
        </div>
      )}

      {/* Live Response Counters */}
      <LiveResponseCounter
        activeRequest={activeRequest}
        alerts={currentRequestAlerts}
      />

      {/* Main Grid: Map & Live Confirmation Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Map View (7 columns) */}
        <div className="lg:col-span-7 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              Geofence Radius & Live Donor Visualization
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Haversine Scan ({donors.length} registered donors)
            </span>
          </div>

          <MapView
            facility={selectedFacility}
            radiusKm={activeRequest?.radiusKm || 5}
            donors={donors}
            alerts={currentRequestAlerts}
            activeRequest={activeRequest}
            height="520px"
          />
        </div>

        {/* Live Stream Feed (5 columns) */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Real-time Inbound Responses
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">
              Live Polling / Firestore
            </span>
          </div>

          <LiveFeed alerts={currentRequestAlerts} />
        </div>
      </div>

      {/* Modals & Drawers */}
      <CreateRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        facilities={facilities}
        donors={donors}
        onCreated={handleRequestCreated}
      />

      <SmsLogDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
        alerts={alerts}
      />
    </div>
  );
}
