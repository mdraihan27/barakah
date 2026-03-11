import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../LanguageContext';
import { authAPI } from '../../api/auth';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../components/ui/Card';

/* ── helper: resize map on mount so tiles render fully ── */
function InvalidateSize() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 200); }, [map]);
  return null;
}

/* ── helper: re-center when coords change ── */
function RecenterMap({ lat, lng, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView([lat, lng], zoom, { animate: true }); }, [map, lat, lng, zoom]);
  return null;
}

/* ── compute zoom level from radius ── */
function radiusToZoom(km) {
  if (km <= 1) return 15;
  if (km <= 3) return 13;
  if (km <= 5) return 12;
  if (km <= 10) return 11;
  if (km <= 20) return 10;
  if (km <= 50) return 9;
  return 8;
}

export default function InterestRadius() {
  const { user, refreshUser } = useAuth();
  const { isBangla } = useLanguage();

  const [radius, setRadius] = useState(user?.interest_radius_km || 10);
  const [inputVal, setInputVal] = useState(String(user?.interest_radius_km || 10));
  const [saving, setSaving] = useState(false);
  const [coords, setCoords] = useState({ lat: 23.8103, lng: 90.4125 }); // default Dhaka
  const [hasLocation, setHasLocation] = useState(false);
  const initialRadius = useRef(user?.interest_radius_km || 10);

  // get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setHasLocation(true);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setInputVal(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 1 && num <= 100) {
      setRadius(num);
    }
  }, []);

  const handleSliderChange = useCallback((e) => {
    const num = parseFloat(e.target.value);
    setRadius(num);
    setInputVal(String(num));
  }, []);

  const handleSave = async () => {
    if (radius < 1 || radius > 100) {
      toast.error(isBangla ? 'ব্যাসার্ধ ১–১০০ কিমি হতে হবে' : 'Radius must be 1–100 km');
      return;
    }
    setSaving(true);
    try {
      await authAPI.updateInterestRadius(radius);
      await refreshUser();
      initialRadius.current = radius;
      toast.success(isBangla ? 'আপডেট হয়েছে!' : 'Interest area updated!');
    } catch {
      toast.error(isBangla ? 'ত্রুটি হয়েছে' : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const zoom = radiusToZoom(radius);
  const hasChanged = radius !== initialRadius.current;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-[20px] font-semibold text-heading mb-1">
          {isBangla ? 'আগ্রহের এলাকা' : 'Interest Area'}
        </h1>
        <p className="text-[13px] text-muted mb-6">
          {isBangla
            ? 'আপনার ব্যাসার্ধ সেট করুন — এই দূরত্বের মধ্যে দোকান, পণ্য, এবং দামের আপডেট পাবেন।'
            : 'Set your radius — you\'ll receive updates for shops, products, and prices within this distance.'}
        </p>

        {/* map */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-[360px] relative z-0">
            <MapContainer
              center={[coords.lat, coords.lng]}
              zoom={zoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
              attributionControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <InvalidateSize />
              <RecenterMap lat={coords.lat} lng={coords.lng} zoom={zoom} />

              {/* radius circle */}
              <Circle
                center={[coords.lat, coords.lng]}
                radius={radius * 1000}
                pathOptions={{
                  color: '#059669',
                  fillColor: '#059669',
                  fillOpacity: 0.12,
                  weight: 2,
                }}
              />

              {/* center marker dot */}
              <Circle
                center={[coords.lat, coords.lng]}
                radius={80}
                pathOptions={{
                  color: '#059669',
                  fillColor: '#059669',
                  fillOpacity: 0.9,
                  weight: 0,
                }}
              />
            </MapContainer>

            {/* location badge */}
            {!hasLocation && (
              <div className="absolute top-3 left-3 z-[999] rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/20 px-3 py-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                {isBangla ? 'লোকেশন পাওয়া যায়নি — ডিফল্ট ব্যবহৃত হচ্ছে' : 'Location unavailable — using default'}
              </div>
            )}
          </div>
        </Card>

        {/* controls */}
        <Card>
          <CardBody>
            <div className="space-y-6">
              {/* slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[13px] font-medium text-heading">
                    {isBangla ? 'ব্যাসার্ধ' : 'Radius'}
                  </label>
                  <span className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {radius} <span className="text-[12px] font-normal text-muted">{isBangla ? 'কিমি' : 'km'}</span>
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={radius}
                  onChange={handleSliderChange}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-600
                    bg-stone-200 dark:bg-white/[0.08]
                    [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-emerald-600 [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-emerald-900/20
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white dark:[&::-webkit-slider-thumb]:border-[#060e08]"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted">1 {isBangla ? 'কিমি' : 'km'}</span>
                  <span className="text-[10px] text-muted">100 {isBangla ? 'কিমি' : 'km'}</span>
                </div>
              </div>

              {/* manual input */}
              <div className="flex items-center gap-3">
                <label className="text-[13px] text-body whitespace-nowrap">
                  {isBangla ? 'সঠিক মান:' : 'Exact value:'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={inputVal}
                  onChange={handleInputChange}
                  className="w-24 rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-3 py-2 text-[14px] text-heading dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <span className="text-[12px] text-muted">{isBangla ? 'কিলোমিটার' : 'kilometers'}</span>
              </div>

              {/* save */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-muted max-w-xs">
                  {isBangla
                    ? 'এই দূরত্বের মধ্যে দোকান খুঁজবে, দামের আপডেট দেবে, এবং উইশলিস্ট অ্যালার্ট পাঠাবে।'
                    : 'Nearby shops, price alerts, and wishlist notifications will use this radius.'}
                </p>
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanged}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50 transition hover:opacity-90"
                >
                  {saving
                    ? '...'
                    : isBangla ? 'সংরক্ষণ করুন' : 'Save'}
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
