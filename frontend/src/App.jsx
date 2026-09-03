import React, { useState, useEffect } from 'react';
import { Heart, Hospital, Smartphone, History, Shield, Info, Activity, Radio, Award } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import TributeBanner from './components/TributeBanner';
import SimulatorBar from './components/SimulatorBar';
import LandingPage from './pages/LandingPage';
import AdminDashboard from './pages/AdminDashboard';
import DonorPortal from './pages/DonorPortal';
import RequestHistory from './pages/RequestHistory';
import { fetchStats, fetchBloodRequests, fetchAlerts } from './services/api';
import { subscribeToCollection } from './services/firebase';

function MainLayout() {
  const { user, activeTab, setActiveTab, loginAsAdmin, loginAsDonor, isAdmin, isDonor } = useAuth();
  const [stats, setStats] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // Load stats and active request
  useEffect(() => {
    const loadGlobalState = async () => {
      try {
        const [statsRes, reqRes] = await Promise.all([
          fetchStats(),
          fetchBloodRequests()
        ]);

        if (statsRes.success) setStats(statsRes.stats);
        if (reqRes.success && reqRes.requests.length > 0) {
          const active = reqRes.requests.find(r => r.status === 'active') || reqRes.requests[0];
          setActiveRequest(active);
        }
      } catch (e) {
        console.error('Error fetching global state:', e);
      }
    };

    loadGlobalState();
  }, []);

  // Listen for real-time alerts for the simulator bar
  useEffect(() => {
    const unsub = subscribeToCollection('alerts', (updatedAlerts) => {
      setAlerts(updatedAlerts);
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white pb-20">
      {/* 1. Top Tribute Banner */}
      <TributeBanner />

      {/* 2. Global Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Tribute Name */}
          <button
            onClick={() => setActiveTab('landing')}
            className="flex items-center gap-2.5 group text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-lg shadow-rose-950 group-hover:scale-105 transition-transform">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-lg text-white tracking-tight">
                Nankwanya
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-rose-900/60 text-rose-300 border border-rose-700/50">
                  Uganda
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Geofenced Blood Mobilization
              </p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'landing'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mission & Story</span>
            </button>

            <button
              onClick={() => { loginAsAdmin(); setActiveTab('admin'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hospital className="w-3.5 h-3.5" />
              <span>Hospital Live Ops</span>
            </button>

            <button
              onClick={() => { loginAsDonor(); setActiveTab('donor'); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'donor'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Donor Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
          </nav>

          {/* Current Persona Badge */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">Acting As:</span>
            <span className="font-bold text-slate-200 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
              {isAdmin ? '🏥 Hospital Coordinator' : '🩸 Voluntary Donor'}
            </span>
          </div>
        </div>
      </header>

      {/* 3. Main Content Router */}
      <main className="flex-1">
        {activeTab === 'landing' && <LandingPage stats={stats} />}
        {activeTab === 'admin' && <AdminDashboard />}
        {activeTab === 'donor' && <DonorPortal />}
        {activeTab === 'history' && <RequestHistory />}
      </main>

      {/* 4. Floating Demo Simulator Toolbar for Judges */}
      <SimulatorBar
        activeRequest={activeRequest}
        alerts={alerts}
        onSimulated={(updatedAlert) => {
          setAlerts(prev => prev.map(a => a.id === updatedAlert.id ? updatedAlert : a));
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
