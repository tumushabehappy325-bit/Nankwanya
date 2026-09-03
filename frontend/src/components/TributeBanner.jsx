import React, { useState } from 'react';
import { Heart, Award, Info, X, Shield, Users } from 'lucide-react';

export default function TributeBanner() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/80 border-b border-rose-900/40 px-4 py-2 text-xs md:text-sm text-slate-300">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-semibold text-rose-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Tribute to Hajj Mohamod Nankwanya
            </span>
            <span className="text-slate-400 hidden sm:inline">
              — Uganda's legendary "Blood Making Machine" (215 Voluntary Donations)
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2 flex items-center gap-1 transition-colors"
          >
            <Info className="w-3 h-3" />
            Read Heritage & Mission
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Hajj Mohamod Nankwanya
                  <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                    215 Donations
                  </span>
                </h3>
                <p className="text-xs text-rose-300 font-medium">
                  Uganda Red Cross Society Honoree & National Blood Champion
                </p>
              </div>
            </div>

            <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
              <p>
                <strong>Nankwanya</strong> is named in solemn tribute to <strong>Hajj Mohamod Nankwanya</strong>, affectionately celebrated across Uganda as the nation’s <em>"Blood Making Machine."</em>
              </p>

              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300">
                  Over decades of selfless humanitarian service, Hajj Nankwanya voluntarily stepped forward <strong>215 times</strong> to donate pints of life-saving blood, directly sustaining over 640 emergency surgical and pediatric patients across Ugandan regional referral hospitals.
                </p>
              </div>

              <p>
                In many Ugandan districts including Mbarara, Gulu, Mbale, and Fort Portal, maternal hemorrhages and pediatric malaria-induced severe anemia present urgent, time-sensitive demands for blood products. Yet, mobilizing voluntary donors traditionally relied on fragmented radio announcements or word-of-mouth calls.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/30">
                  <div className="text-rose-400 font-bold text-sm mb-1 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    Community Mobilization
                  </div>
                  <div className="text-xs text-slate-400">
                    Digitizing Hajj Nankwanya’s spirit by mobilizing verified nearby donors within minutes via native SMS.
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/30">
                  <div className="text-amber-400 font-bold text-sm mb-1 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Ultra-Targeted Geofencing
                  </div>
                  <div className="text-xs text-slate-400">
                    Directing hospital requests only to eligible donors within 2–10 km to eliminate transit delays.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm transition shadow-lg shadow-rose-900/30"
              >
                Close & Explore Platform
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
