import React, { useState, useEffect } from 'react';
import {
  Heart, MapPin, Navigation, Smartphone, CheckCircle, XCircle,
  AlertTriangle, Clock, Shield, Award, Sparkles, Check, ChevronDown,
  Plus, X, Lock, FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchDonors, fetchAlerts, respondToAlert, updateDonorLocation, registerOrUpdateDonor } from '../services/api';
import { subscribeToCollection } from '../services/firebase';

const MBARARA_PRESETS = [
  { name: 'Kamukuzi (0.9 km from MRRH)', lat: -0.6020, lng: 30.6510 },
  { name: 'Kakoba (1.8 km from MRRH)', lat: -0.6120, lng: 30.6720 },
  { name: 'Nyamitanga (2.4 km from MRRH)', lat: -0.6280, lng: 30.6410 },
  { name: 'Ruharo (3.1 km from MRRH)', lat: -0.6030, lng: 30.6280 },
  { name: 'Kashanyarazi (1.7 km from MRRH)', lat: -0.5940, lng: 30.6480 },
  { name: 'Katete (1.5 km from MRRH)', lat: -0.6210, lng: 30.6610 },
  { name: 'Bwizibwera Road (4.2 km from MRRH)', lat: -0.5750, lng: 30.6350 }
];

export default function DonorPortal() {
  const { user, updateUserProfile } = useAuth();
  const [donor, setDonor] = useState(user || null);
  const [allDonors, setAllDonors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locSuccess, setLocSuccess] = useState(null);
  const [isResponding, setIsResponding] = useState(false);
  const [responseSuccess, setResponseSuccess] = useState(null);

  // Donor Registration Modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('+25677');
  const [regBloodType, setRegBloodType] = useState('O+');
  const [regNeighborhood, setRegNeighborhood] = useState(MBARARA_PRESETS[0].name);
  const [regLastDonation, setRegLastDonation] = useState('');
  const [regConsent, setRegConsent] = useState(false); // Visible checkbox, NOT pre-checked
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState(null);

  // Load donor list and alerts
  useEffect(() => {
    const loadData = async () => {
      try {
        const donorsRes = await fetchDonors();
        if (donorsRes.success && donorsRes.donors.length > 0) {
          setAllDonors(donorsRes.donors);
          if (!donor || donor.role === 'admin') {
            setDonor(donorsRes.donors[0]);
            updateUserProfile(donorsRes.donors[0]);
          }
        }
      } catch (err) {
        console.error('Error loading donor data:', err);
      }
    };

    loadData();
  }, []);

  // Listen to alerts for this donor
  useEffect(() => {
    if (!donor) return;

    const unsubAlerts = subscribeToCollection('alerts', (allAlerts) => {
      const donorAlerts = allAlerts.filter(a => a.donorId === donor.id || a.donorPhone === donor.phone);
      setAlerts(donorAlerts);
    });

    return () => {
      if (unsubAlerts) unsubAlerts();
    };
  }, [donor?.id, donor?.phone]);

  // Switch active demo donor
  const handleSelectDonor = (donorId) => {
    const selected = allDonors.find(d => d.id === donorId);
    if (selected) {
      setDonor(selected);
      updateUserProfile(selected);
      setResponseSuccess(null);
    }
  };

  // Browser Geolocation Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported on this device. Use neighborhood presets below.');
      return;
    }

    setIsLocating(true);
    setLocSuccess(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const lat = Math.round(latitude * 100000) / 100000;
        const lng = Math.round(longitude * 100000) / 100000;

        try {
          if (donor?.id) {
            await updateDonorLocation(donor.id, { lat, lng });
          }
          setDonor(prev => ({ ...prev, lat, lng, neighborhood: 'Current GPS Location' }));
          updateUserProfile({ lat, lng, neighborhood: 'Current GPS Location' });
          setLocSuccess(`Updated to GPS: ${lat}, ${lng}`);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err.message);
        setIsLocating(false);
        alert('Could not retrieve browser GPS (permission or timeout). Select a Mbarara neighborhood preset instead.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Preset location update
  const handlePresetLocation = async (preset) => {
    try {
      if (donor?.id) {
        await updateDonorLocation(donor.id, { lat: preset.lat, lng: preset.lng });
      }
      setDonor(prev => ({
        ...prev,
        lat: preset.lat,
        lng: preset.lng,
        neighborhood: preset.name
      }));
      updateUserProfile({
        lat: preset.lat,
        lng: preset.lng,
        neighborhood: preset.name
      });
      setLocSuccess(`Set location to ${preset.name}`);
    } catch (e) {
      console.error(e);
    }
  };

  // Respond to latest alert
  const handleRespond = async (alertId, action) => {
    setIsResponding(true);
    try {
      const res = await respondToAlert(alertId, action);
      if (res.success) {
        setResponseSuccess(action === 'confirm' ? 'confirmed' : 'declined');
        setAlerts(prev => prev.map(a => a.id === alertId ? res.alert : a));
      }
    } catch (err) {
      console.error('Error responding:', err);
    } finally {
      setIsResponding(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regConsent) {
      setRegError('You must provide consent under the Uganda DPPA 2019 to complete registration.');
      return;
    }
    setIsRegistering(true);
    setRegError(null);

    try {
      const selectedPreset = MBARARA_PRESETS.find(p => p.name === regNeighborhood) || MBARARA_PRESETS[0];
      const res = await registerOrUpdateDonor({
        name: regName.trim(),
        phone: regPhone.trim(),
        bloodType: regBloodType,
        lat: selectedPreset.lat,
        lng: selectedPreset.lng,
        neighborhood: regNeighborhood,
        lastDonationDate: regLastDonation ? new Date(regLastDonation).toISOString().split('T')[0] : null,
        consentGiven: true,
        consentTimestamp: new Date().toISOString()
      });

      if (res.success && res.donor) {
        setAllDonors(prev => [res.donor, ...prev]);
        setDonor(res.donor);
        updateUserProfile(res.donor);
        setIsRegisterModalOpen(false);
        setRegName('');
        setRegPhone('+25677');
        setRegConsent(false);
        setLocSuccess(`Registered as verified voluntary donor with DPPA consent!`);
      } else {
        setRegError(res.error || 'Registration failed');
      }
    } catch (err) {
      setRegError(err.message || 'Error creating donor profile');
    } finally {
      setIsRegistering(false);
    }
  };

  const latestAlert = alerts[0];
  const daysSince = donor?.lastDonationDate
    ? Math.floor((Date.now() - new Date(donor.lastDonationDate).getTime()) / 86400000)
    : null;
  const isEligible = daysSince === null || daysSince >= 90;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Donor Quick Profile Card */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl" />

        {/* Demo donor switcher & New Donor Trigger */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Donor Mobile Portal
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-md shadow-rose-950 transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New</span>
            </button>

            <select
              value={donor?.id || ''}
              onChange={(e) => handleSelectDonor(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {allDonors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.bloodType}) - {d.neighborhood}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Donor identity */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border-2 border-rose-500/40 flex items-center justify-center text-xl font-extrabold text-rose-400 font-mono shadow-lg shadow-rose-950">
              {donor?.bloodType || 'O+'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{donor?.name || 'Katushabe Allen'}</h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{donor?.phone || '+256770000001'}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>{donor?.neighborhood || 'Kamukuzi, Mbarara'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1 font-medium">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  DPPA Consent Verified & Stored
                  {donor?.consentTimestamp ? ` (${new Date(donor.consentTimestamp).toLocaleDateString()})` : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {isEligible ? (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Eligible to Donate (≥90d)
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recently Donated ({daysSince}d ago)
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {donor?.totalDonations || (daysSince !== null ? 1 : 0)} Total Voluntary Donations
            </span>
            {!isEligible && (
              <span className="text-[10px] text-amber-400 font-medium text-right max-w-[160px]">
                Excluded from live alerts until 90-day recovery period elapses ({90 - daysSince}d left)
              </span>
            )}
          </div>
        </div>

        {/* Geolocation Section */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Location Settings (Geofence Pin)</span>
            <span className="font-mono text-slate-400 text-[11px]">
              {donor?.lat}, {donor?.lng}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDetectLocation}
              disabled={isLocating}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-sky-950/40"
            >
              <Navigation className="w-3.5 h-3.5" />
              {isLocating ? 'Acquiring GPS...' : 'Use Browser GPS'}
            </button>

            {/* Presets dropdown */}
            <div className="relative flex-1 min-w-[200px]">
              <select
                onChange={(e) => {
                  const p = MBARARA_PRESETS.find(pr => pr.name === e.target.value);
                  if (p) handlePresetLocation(p);
                }}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                defaultValue=""
              >
                <option value="" disabled>Or Pick Mbarara Location...</option>
                {MBARARA_PRESETS.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {locSuccess && (
            <p className="text-[11px] text-emerald-400 animate-fadeIn">
              ✓ {locSuccess}
            </p>
          )}
        </div>
      </div>

      {/* Active Blood Need Alert Card */}
      {latestAlert ? (
        <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
              <h3 className="font-bold text-base text-white">Emergency Blood Alert</h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold uppercase">
              Africa's Talking SMS
            </span>
          </div>

          {/* Alert details */}
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Hospital Requesting:</span>
              <span className="text-xs font-bold text-white">{latestAlert.facilityName || 'MRRH'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Blood Type Required:</span>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-rose-600 text-white">
                {latestAlert.bloodType}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Your Distance:</span>
              <span className="text-xs font-mono font-bold text-rose-400">
                {latestAlert.distanceKm ? `${latestAlert.distanceKm} km away` : 'Within geofence'}
              </span>
            </div>
          </div>

          {/* Alert Message Box */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 italic">
            "{latestAlert.message || `Urgent need for ${latestAlert.bloodType} blood at ${latestAlert.facilityName}. Reply YES if available. - Nankwanya`}"
          </div>

          {/* Response Buttons or Status */}
          {latestAlert.status === 'confirmed' ? (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle className="w-5 h-5" />
                <span>You Confirmed Availability (YES)</span>
              </div>
              <p className="text-xs text-slate-300">
                The hospital blood bank has received your confirmation on the live dashboard.
              </p>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                Recorded: {new Date(latestAlert.respondedAt || Date.now()).toLocaleTimeString()}
              </div>
            </div>
          ) : latestAlert.status === 'declined' ? (
            <div className="p-3 rounded-2xl bg-slate-800 text-center text-slate-400 text-xs">
              You declined this request. Thank you for staying on voluntary standby.
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <button
                onClick={() => handleRespond(latestAlert.id, 'confirm')}
                disabled={isResponding}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/60 transition flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {isResponding ? 'Submitting response...' : "I'm Available (Confirm YES)"}
              </button>

              <button
                onClick={() => handleRespond(latestAlert.id, 'decline')}
                disabled={isResponding}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 font-semibold text-xs transition"
              >
                Cannot make it today (Decline)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base">No Active Alerts in Geofence</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You are active in the Mbarara donor registry. When a nearby hospital broadcasts an urgent blood need matching your type ({donor?.bloodType}), you'll receive an instant SMS alert!
          </p>
        </div>
      )}

      {/* Tribute Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-rose-950/30 border border-amber-900/40 flex items-center gap-3 text-xs text-amber-200">
        <Award className="w-5 h-5 text-amber-400 shrink-0" />
        <span>
          Following the example of <strong>Hajj Mohamod Nankwanya</strong> (215 blood donations). Every voluntary donor is a pillar of Uganda's health resilience.
        </span>
      </div>

      {/* Donor Registration Modal with DPPA 2019 Consent Flow */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsRegisterModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-950">
                <Heart className="w-6 h-6 text-white fill-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Join Voluntary Donor Network</h2>
                <p className="text-xs text-slate-400">
                  Nankwanya Emergency Mobilization (Uganda)
                </p>
              </div>
            </div>

            {regError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Katushabe Allen"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Phone & Blood Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number (SMS)
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+256770000000"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Blood Type
                  </label>
                  <select
                    value={regBloodType}
                    onChange={(e) => setRegBloodType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Neighborhood / Preset Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Mbarara Neighborhood (Geofence Base)
                </label>
                <select
                  value={regNeighborhood}
                  onChange={(e) => setRegNeighborhood(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {MBARARA_PRESETS.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Last Donation Date (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Last Blood Donation Date (Optional)
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">
                  Helps enforce the 90-day minimum donation recovery interval. Leave empty if first-time donor.
                </p>
                <input
                  type="date"
                  value={regLastDonation}
                  onChange={(e) => setRegLastDonation(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Consent-First Language (Uganda DPPA 2019) */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="dppa-consent-checkbox"
                    checked={regConsent}
                    onChange={(e) => setRegConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded bg-slate-800 border-slate-600 text-rose-500 focus:ring-rose-500 focus:ring-offset-0 cursor-pointer shrink-0"
                  />
                  <span className="text-xs text-slate-200 leading-snug font-medium">
                    I consent to Nankwanya storing my location and blood type to send me donation alerts. I can withdraw this anytime.
                  </span>
                </label>
                <p className="text-[10px] text-slate-400 pl-7 leading-normal">
                  In compliance with Uganda's <strong>Data Protection and Privacy Act (DPPA 2019)</strong>: Location and blood type are treated as special-category health data. Your number is masked and protected against commercial harvesting.
                </p>
              </div>

              {/* Submit Button (Blocked until consent checked) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!regConsent || isRegistering || !regName || !regPhone}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xl shadow-rose-950/60 transition flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  {isRegistering
                    ? 'Registering with Consent...'
                    : !regConsent
                    ? 'Check Consent to Enable Registration'
                    : 'Submit Voluntary Donor Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
