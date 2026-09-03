import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Hospital, UserCheck, Clock, MapPin, AlertCircle } from 'lucide-react';

// Fix Leaflet's default icon missing issue in webpack/vite
delete L.Icon.Default.prototype._getIconUrl;

const createCustomIcon = (color, symbol, isPulsing = false) => {
  return L.divIcon({
    className: 'custom-leaflet-pin',
    html: `
      <div class="relative flex items-center justify-center">
        ${isPulsing ? `<div class="absolute w-8 h-8 rounded-full bg-${color}-500/40 radar-pulse -inset-1"></div>` : ''}
        <div class="w-7 h-7 rounded-full bg-${color}-600 border-2 border-white shadow-xl flex items-center justify-center text-white text-xs font-bold ring-2 ring-${color}-400/50">
          ${symbol}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  });
};

const hospitalIcon = L.divIcon({
  className: 'hospital-leaflet-pin',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-10 h-10 rounded-full bg-rose-600/30 radar-pulse -inset-1.5"></div>
      <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 border-2 border-white shadow-2xl flex items-center justify-center text-white text-sm font-extrabold ring-4 ring-rose-900/60">
        🏥
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18]
});

const donorIcons = {
  confirmed: createCustomIcon('emerald', '✓', true),
  delivered: createCustomIcon('sky', '●', false),
  sent: createCustomIcon('sky', '●', false),
  declined: createCustomIcon('rose', '✕', false),
  unalerted: createCustomIcon('slate', '•', false)
};

// Helper component to smoothly center map when facility or active request changes
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 13, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapView({
  facility,
  radiusKm = 5,
  donors = [],
  alerts = [],
  activeRequest = null,
  height = "520px"
}) {
  const defaultCenter = facility ? [facility.lat, facility.lng] : [-0.6085, 30.6565];
  const radiusMeters = (radiusKm || 5) * 1000;

  // Build a map of donor status for quick marker icon lookup
  const alertStatusMap = new Map();
  alerts.forEach(a => {
    alertStatusMap.set(a.donorId || a.donorPhone, a);
  });

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapRecenter center={defaultCenter} zoom={13} />

        {/* CartoDB Dark Matter tiles for ultra-modern aesthetic */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Facility Marker */}
        {facility && (
          <Marker position={[facility.lat, facility.lng]} icon={hospitalIcon}>
            <Popup>
              <div className="p-1 space-y-1 text-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-rose-700 text-sm">
                  <Hospital className="w-4 h-4 text-rose-600" />
                  {facility.name}
                </div>
                <div className="text-xs text-slate-600">
                  {facility.district || 'Mbarara City'} • {facility.contactPhone}
                </div>
                {activeRequest && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                    <span className="font-semibold text-rose-600">Active Request: </span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 font-bold text-rose-800">
                      {activeRequest.bloodType}
                    </span>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Target radius: {activeRequest.radiusKm} km
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Geofence Radius Circle */}
        {facility && (
          <Circle
            center={[facility.lat, facility.lng]}
            radius={radiusMeters}
            pathOptions={{
              color: '#e11d48',
              fillColor: '#f43f5e',
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '6, 8'
            }}
          />
        )}

        {/* Donor Markers */}
        {donors.map(donor => {
          const alert = alertStatusMap.get(donor.id) || alertStatusMap.get(donor.phone);
          const status = alert ? alert.status : 'unalerted';
          const icon = donorIcons[status] || donorIcons.unalerted;

          return (
            <Marker
              key={donor.id}
              position={[donor.lat, donor.lng]}
              icon={icon}
            >
              <Popup>
                <div className="p-1.5 space-y-1.5 min-w-[190px] text-slate-800">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-bold text-slate-900 text-sm">{donor.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700">
                      {donor.bloodType}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{donor.neighborhood || 'Mbarara Town'}</span>
                    </div>
                    {donor.distanceKm !== undefined && (
                      <div className="text-slate-500 font-medium">
                        Distance: <strong>{donor.distanceKm} km</strong> from facility
                      </div>
                    )}
                    <div className="text-slate-500 font-mono text-[11px]">
                      {donor.phone}
                    </div>
                  </div>

                  {alert && (
                    <div className="pt-1.5 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Alert Status:</span>
                        <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                          status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          status === 'declined' ? 'bg-rose-100 text-rose-700' :
                          'bg-sky-100 text-sky-700'
                        }`}>
                          {status === 'confirmed' ? '✓ Confirmed (YES)' :
                           status === 'declined' ? '✕ Declined (NO)' :
                           '● SMS Alerted'}
                        </span>
                      </div>
                      {alert.respondedAt && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          Responded: {new Date(alert.respondedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Modern Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl text-xs space-y-2 max-w-[240px]">
        <div className="font-semibold text-slate-200 flex items-center justify-between">
          <span>Geofence Radius</span>
          <span className="text-rose-400 font-mono font-bold">{radiusKm} km</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/40" />
            <span className="text-emerald-300 font-medium">Confirmed (YES)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-sky-300 font-medium">SMS Alerted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-rose-300 font-medium">Declined</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span className="text-slate-400">Standby</span>
          </div>
        </div>
      </div>
    </div>
  );
}
