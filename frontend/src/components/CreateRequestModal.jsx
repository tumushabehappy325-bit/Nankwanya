import React, { useState, useEffect } from 'react';
import { X, Send, Radio, AlertTriangle, Flame, ShieldAlert, CheckCircle2, MessageSquare } from 'lucide-react';
import { createBloodRequest } from '../services/api';

const BLOOD_TYPES = ['ANY', 'O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

export default function CreateRequestModal({
  isOpen,
  onClose,
  facilities = [],
  donors = [],
  onCreated
}) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || 'fac_mrrh');
  const [bloodType, setBloodType] = useState('B+');
  const [urgency, setUrgency] = useState('urgent');
  const [radiusKm, setRadiusKm] = useState(5);
  const [requiredUnits, setRequiredUnits] = useState(3);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync default facility when facilities load
  useEffect(() => {
    if (facilities.length > 0 && !facilityId) {
      setFacilityId(facilities[0].id);
    }
  }, [facilities, facilityId]);

  if (!isOpen) return null;

  const selectedFacility = facilities.find(f => f.id === facilityId) || facilities[0];

  // Client-side estimator for live slider feedback (mirrors backend 3-condition filter)
  const estimateMatchedDonors = () => {
    if (!selectedFacility || !donors.length) return 0;
    const toRad = (d) => (d * Math.PI) / 180;
    const RBC = {
      'O-': ['O-'],
      'O+': ['O-', 'O+'],
      'A-': ['O-', 'A-'],
      'A+': ['O-', 'O+', 'A-', 'A+'],
      'B-': ['O-', 'B-'],
      'B+': ['O-', 'O+', 'B-', 'B+'],
      'AB-': ['O-', 'A-', 'B-', 'AB-'],
      'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
    };

    return donors.filter(d => {
      // Condition 1: Within radius
      const dLat = toRad(d.lat - selectedFacility.lat);
      const dLon = toRad(d.lng - selectedFacility.lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(selectedFacility.lat)) * Math.cos(toRad(d.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist > radiusKm) return false;

      // Condition 2: Blood type compatibility
      const cleanReq = bloodType?.toUpperCase();
      const cleanDonor = d.bloodType?.toUpperCase();
      const compatible = cleanReq === 'ANY' || (RBC[cleanReq] ? RBC[cleanReq].includes(cleanDonor) : cleanDonor === cleanReq);
      if (!compatible) return false;

      // Condition 3: Minimum 90-day donation interval
      if (d.lastDonationDate) {
        const days = Math.floor((Date.now() - new Date(d.lastDonationDate).getTime()) / (1000 * 60 * 60 * 24));
        if (days < 90) return false;
      }

      return true;
    }).length;
  };

  const estimatedCount = estimateMatchedDonors();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createBloodRequest({
        facilityId: selectedFacility.id,
        bloodType,
        urgency,
        radiusKm: Number(radiusKm),
        requiredUnits: Number(requiredUnits),
        sendWhatsApp
      });

      if (res.success) {
        if (onCreated) onCreated(res.request, res.alerts);
        onClose();
      } else {
        setError(res.error || 'Failed to dispatch request');
      }
    } catch (err) {
      setError(err.message || 'Network error creating blood request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-950">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Raise Emergency Blood Need</h2>
            <p className="text-xs text-slate-400">
              Broadcast Africa's Talking SMS alerts to verified donors in geofence
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Facility Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Healthcare Facility
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {facilities.map(fac => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.district || 'Mbarara'})
                </option>
              ))}
            </select>
          </div>

          {/* Blood Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Required Blood Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {BLOOD_TYPES.map(bt => (
                <button
                  type="button"
                  key={bt}
                  onClick={() => setBloodType(bt)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                    bloodType === bt
                      ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-950 ring-2 ring-rose-400/40'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {bt}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Triage Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { key: 'normal', label: 'Standard Need', icon: CheckCircle2, color: 'emerald' },
                { key: 'urgent', label: 'Urgent (Surgeries)', icon: AlertTriangle, color: 'amber' },
                { key: 'critical', label: 'Critical Emergency', icon: ShieldAlert, color: 'rose' }
              ].map(lvl => {
                const Icon = lvl.icon;
                const isSelected = urgency === lvl.key;
                return (
                  <button
                    type="button"
                    key={lvl.key}
                    onClick={() => setUrgency(lvl.key)}
                    className={`p-3 rounded-xl text-left border transition flex flex-col justify-between ${
                      isSelected
                        ? lvl.color === 'rose'
                          ? 'bg-rose-950/60 border-rose-500 text-rose-200 ring-2 ring-rose-500/30'
                          : lvl.color === 'amber'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200 ring-2 ring-amber-500/30'
                          : 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-2" />
                    <span className="text-xs font-bold block">{lvl.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Geofence Radius Slider */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 uppercase tracking-wider">
                Geofence Radius (Haversine Target)
              </span>
              <span className="text-base font-extrabold text-rose-400 font-mono">
                {radiusKm} km
              </span>
            </div>
            <input
              type="range"
              min="2"
              max="10"
              step="1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>2 km (Walking/Boda)</span>
              <span>5 km (Standard Town)</span>
              <span>10 km (Sub-county)</span>
            </div>
          </div>

          {/* Units Required & WhatsApp toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Required Units (Pints)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={requiredUnits}
                onChange={(e) => setRequiredUnits(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Additional Channels
              </label>
              <label className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-300 cursor-pointer hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600 text-rose-500 focus:ring-rose-500"
                />
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  WhatsApp Stub (Ready)
                </span>
              </label>
            </div>
          </div>

          {/* Pre-Broadcast Live Summary Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 to-slate-800 border border-rose-900/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs text-slate-400">
                Target Audience Match (Within {radiusKm}km • RBC Match • &ge;90d Interval)
              </div>
              <div className="text-sm font-semibold text-slate-200">
                Ready to SMS <strong className="text-rose-400 font-mono">{estimatedCount}</strong> eligible donors
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              Africa's Talking Uganda
            </span>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || estimatedCount === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-rose-950/60 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Calculating Geofence & Dispatching SMS...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Broadcast Alert to {estimatedCount} Donors in {radiusKm}km Radius
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
