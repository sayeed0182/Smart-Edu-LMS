// AttendanceGuard.js
// Verifies student's geo-location before allowing attendance submission.
// Campus coordinates: Lat 13.1681, Lng 77.5353 (Presidency University Bengaluru)
// Allowed radius: 500 metres (campus area)

import React, { useState, useCallback } from 'react';
import { MapPin, ShieldCheck, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────
const CAMPUS_LAT  = 13.1681;
const CAMPUS_LNG  = 77.5353;
const MAX_RADIUS_M = 500;

// ─── Haversine distance (metres) ──────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // earth radius in metres
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Status banner helper ─────────────────────────────────────────────────────
const StatusBanner = ({ icon: Icon, color, title, subtitle }) => (
  <div className={`flex items-start gap-4 p-5 rounded-2xl border ${color}`}>
    <Icon size={22} className="shrink-0 mt-0.5" />
    <div>
      <p className="font-bold text-sm">{title}</p>
      {subtitle && <p className="text-xs mt-1 opacity-80 leading-relaxed">{subtitle}</p>}
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
/**
 * AttendanceGuard
 *
 * Props:
 *   onVerified  – callback fired when location check passes
 *   onDenied    – optional callback fired when location check fails
 *   children    – rendered ONLY after successful verification
 */
const AttendanceGuard = ({ onVerified, onDenied, children }) => {
  const [status, setStatus] = useState('idle');   // idle | checking | verified | denied | error
  const [distance, setDistance] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const checkLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error');
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('checking');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = haversineDistance(latitude, longitude, CAMPUS_LAT, CAMPUS_LNG);
        setDistance(Math.round(dist));

        if (dist <= MAX_RADIUS_M) {
          setStatus('verified');
          onVerified?.();
        } else {
          setStatus('denied');
          onDenied?.();
        }
      },
      (err) => {
        setStatus('error');
        const messages = {
          1: 'Location permission was denied. Please enable it in your browser settings.',
          2: 'Could not determine your location. Try again.',
          3: 'Location request timed out. Please try again.',
        };
        setErrorMsg(messages[err.code] || 'An unknown error occurred.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onVerified, onDenied]);

  // Once verified, render the gated content
  if (status === 'verified' && children) {
    return (
      <div className="space-y-4">
        <StatusBanner
          icon={CheckCircle2}
          color="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          title="Location Verified ✓"
          subtitle={`You are ${distance}m from campus. Attendance unlocked.`}
        />
        {children}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 shadow-xl space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
          <MapPin size={26} />
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">Location Verification</h3>
          <p className="text-slate-500 text-sm">You must be on campus to mark attendance</p>
        </div>
      </div>

      {/* Status messages */}
      {status === 'idle' && (
        <StatusBanner
          icon={ShieldCheck}
          color="bg-slate-800 border-slate-700 text-slate-400"
          title="Geo-fence Guard Active"
          subtitle={`Attendance can only be marked within ${MAX_RADIUS_M}m of campus. Click "Verify Location" to proceed.`}
        />
      )}

      {status === 'checking' && (
        <StatusBanner
          icon={Loader2}
          color="bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
          title="Checking your location…"
          subtitle="Please allow location access when prompted by your browser."
        />
      )}

      {status === 'denied' && (
        <StatusBanner
          icon={XCircle}
          color="bg-red-500/10 border-red-500/20 text-red-400"
          title={`Outside campus perimeter — ${distance}m away`}
          subtitle={`You must be within ${MAX_RADIUS_M}m of campus (${CAMPUS_LAT}, ${CAMPUS_LNG}) to mark attendance.`}
        />
      )}

      {status === 'error' && (
        <StatusBanner
          icon={AlertCircle}
          color="bg-amber-500/10 border-amber-500/20 text-amber-400"
          title="Location Error"
          subtitle={errorMsg}
        />
      )}

      {/* Campus info card */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 text-xs space-y-2">
        <p className="text-slate-500 uppercase font-black tracking-widest mb-3">Campus Reference</p>
        <div className="flex justify-between">
          <span className="text-slate-500">Latitude</span>
          <span className="font-bold text-slate-300">{CAMPUS_LAT}°N</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Longitude</span>
          <span className="font-bold text-slate-300">{CAMPUS_LNG}°E</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Allowed Radius</span>
          <span className="font-bold text-indigo-400">{MAX_RADIUS_M} metres</span>
        </div>
        {distance !== null && (
          <div className="flex justify-between pt-2 border-t border-slate-700">
            <span className="text-slate-500">Your Distance</span>
            <span className={`font-black ${distance <= MAX_RADIUS_M ? 'text-emerald-400' : 'text-red-400'}`}>
              {distance}m
            </span>
          </div>
        )}
      </div>

      {/* Action button */}
      <button
        onClick={checkLocation}
        disabled={status === 'checking'}
        className={`w-full py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3
          ${status === 'checking'
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : status === 'denied' || status === 'error'
            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
          }`}
      >
        {status === 'checking' ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Locating…
          </>
        ) : status === 'denied' || status === 'error' ? (
          <>
            <MapPin size={18} />
            Retry Verification
          </>
        ) : (
          <>
            <MapPin size={18} />
            Verify Location
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest font-bold">
        Location data is used only for attendance verification and is never stored.
      </p>
    </div>
  );
};

export default AttendanceGuard;
