import React from 'react';
import { Heart, Activity, Radio, MapPin, Shield, Award, Users, ArrowRight, Smartphone, Hospital, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage({ stats, onNavigate }) {
  const { loginAsAdmin, loginAsDonor, setActiveTab } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 overflow-hidden border-b border-slate-800">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-rose-900/20 via-transparent to-transparent pointer-events-none blur-3xl" />
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          {/* Tribute badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-rose-900/60 shadow-lg mb-8">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-rose-300">
              Named in Tribute to Hajj Mohamod Nankwanya (215 Voluntary Blood Donations)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Seconds Save Lives. <br />
                <span className="bg-gradient-to-r from-rose-500 via-red-500 to-amber-400 bg-clip-text text-transparent">
                  Geofenced Blood Mobilization
                </span> for Uganda.
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                When critical surgeries or maternal emergencies arise at regional referral hospitals, <strong>Nankwanya</strong> pinpoints verified donors within 2–10 km and mobilizes them instantly via native <strong>Africa's Talking SMS</strong> and live response tracking.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => { loginAsAdmin(); setActiveTab('admin'); }}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-xl shadow-rose-950/60 transition flex items-center gap-2 group"
                >
                  <Hospital className="w-4 h-4" />
                  Launch Hospital Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => { loginAsDonor(); setActiveTab('donor'); }}
                  className="px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white font-bold text-sm transition flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Donor Mobile Portal
                </button>
              </div>

              {/* Verified Features list */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-slate-800/80 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Real Africa's Talking SMS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Haversine Geofencing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>Live Live-Sync Dashboard</span>
                </div>
              </div>
            </div>

            {/* Tribute & Stats Card */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950">
                    <Heart className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Uganda Blood Champion</h2>
                    <p className="text-xs text-rose-300">The Nankwanya Legacy</p>
                  </div>
                </div>

                <blockquote className="text-xs sm:text-sm text-slate-300 italic border-l-2 border-rose-500 pl-3 mb-6 leading-relaxed">
                  "Giving blood does not cost a penny, but it gives someone another chance at tomorrow."
                </blockquote>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <div className="text-2xl font-extrabold text-white font-mono">
                      {stats?.totalDonors || 40}+
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Donors in Mbarara
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                      &lt; 3 mins
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Avg. Response Window
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <div className="text-2xl font-extrabold text-rose-400 font-mono">
                      {stats?.totalFacilities || 3}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Connected Hospitals
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                    <div className="text-2xl font-extrabold text-amber-400 font-mono">
                      215
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Honorary Benchmark
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works 3-step slice */}
      <section className="py-16 px-4 max-w-6xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            The 3-Step Emergency Mobilization Loop
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Engineered specifically for low-latency emergency blood bank response in Ugandan municipal districts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 font-mono font-bold text-sm mb-4">
                01
              </div>
              <h3 className="font-bold text-base text-white mb-2">Hospital Creates Need</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hospital staff specifies blood type (e.g. B+) and adjusts the geofence radius slider (2–10 km).
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-rose-400">
              ⚡ Haversine Spherical Filter
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 font-mono font-bold text-sm mb-4">
                02
              </div>
              <h3 className="font-bold text-base text-white mb-2">Africa's Talking SMS</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                SMS alert is dispatched to matched donors: <em>"Urgent need for B+ at MRRH. Reply YES if available."</em>
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-sky-400">
              📲 Uganda Native SMS Gateway
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm mb-4">
                03
              </div>
              <h3 className="font-bold text-base text-white mb-2">Live Response Tracking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Donors reply YES via SMS or tap in the mobile portal. The hospital live map turns pins green instantly.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400">
              🟢 Real-time Firestore Sync
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-800/80 px-4 text-center text-xs text-slate-500">
        <p>
          Nankwanya Platform • Dedicated to Hajj Mohamod Nankwanya & Voluntary Blood Donors of Uganda.
        </p>
      </footer>
    </div>
  );
}
