import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../LanguageContext';
import { shopsAPI } from '../../../api/shops';
import { useLocation } from '../../../hooks/useLocation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import NearbyShopsMap from '../../../components/common/NearbyShopsMap';
import Modal from '../../../components/common/Modal';
import LocationPicker from '../../../components/common/LocationPicker';

const STORAGE_KEY = 'barakah-explore-location';

export default function Explore() {
  const { user } = useAuth();
  const { isBangla } = useLanguage();
  const { lat, lng, loading: geoLoading, error: geoError } = useLocation();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const userRadius = user?.interest_radius_km || 10;
  const [radius, setRadius] = useState(userRadius);
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [selectedLocation, setSelectedLocation] = useState({ lat: null, lng: null });
  const [locationHydrated, setLocationHydrated] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [draftLocation, setDraftLocation] = useState({ lat: '', lng: '' });
  const [manualGeoLoading, setManualGeoLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const savedLat = Number(parsed?.lat);
        const savedLng = Number(parsed?.lng);
        if (Number.isFinite(savedLat) && Number.isFinite(savedLng)) {
          setSelectedLocation({ lat: savedLat, lng: savedLng });
        }
      }
    } catch {
      // ignore bad persisted location
    } finally {
      setLocationHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!locationHydrated) return;
    if (selectedLocation.lat && selectedLocation.lng) return;
    if (lat && lng) {
      setSelectedLocation({ lat, lng });
    }
  }, [lat, lng, locationHydrated, selectedLocation.lat, selectedLocation.lng]);

  const activeLat = selectedLocation.lat;
  const activeLng = selectedLocation.lng;
  const hasUserLocation = Number.isFinite(activeLat) && Number.isFinite(activeLng);

  useEffect(() => {
    if (!hasUserLocation) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await shopsAPI.getNearbyShops(activeLat, activeLng, radius);
        setShops(res.data.shops || res.data || []);
      } catch { setShops([]); }
      finally { setLoading(false); }
    })();
  }, [activeLat, activeLng, radius, hasUserLocation]);

  const openLocationModal = () => {
    setDraftLocation({
      lat: activeLat ?? '',
      lng: activeLng ?? '',
    });
    setShowLocationModal(true);
  };

  const handleSaveLocation = () => {
    const parsedLat = Number(draftLocation.lat);
    const parsedLng = Number(draftLocation.lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
      return;
    }
    const payload = { lat: parsedLat, lng: parsedLng };
    setSelectedLocation(payload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setShowLocationModal(false);
  };

  const handleUseMyLocationInModal = () => {
    if (!navigator.geolocation) return;
    setManualGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraftLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setManualGeoLoading(false);
      },
      () => {
        setManualGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-cerialebaran text-[24px] text-heading">
              {isBangla ? 'কাছের দোকান' : 'Nearby Shops'}
            </h1>
            <p className="text-[13px] text-muted mt-0.5">
              {geoLoading && !hasUserLocation
                ? (isBangla ? 'লোকেশন খুঁজছে...' : 'Getting location...')
                : geoError && !hasUserLocation
                  ? (isBangla ? 'লোকেশন সেট করুন, তারপর দোকান দেখুন' : 'Set your location to explore nearby shops')
                  : (isBangla ? `আপনার ${radius} কিমি ব্যাসার্ধে` : `Within ${radius}km radius`)}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={openLocationModal}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white/60 dark:bg-white/[0.02] border border-stone-200/70 dark:border-white/[0.08] text-body hover:border-emerald-300 dark:hover:border-emerald-500/20 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {hasUserLocation
                ? (isBangla ? 'লোকেশন আপডেট' : 'Update Location')
                : (isBangla ? 'লোকেশন যোগ করুন' : 'Add Location')}
            </button>

            {/* radius selector */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">{isBangla ? 'ব্যাসার্ধ:' : 'Radius:'}</span>
              {[5, 10, 25, 50].map((r) => (
                <button key={r} onClick={() => setRadius(r)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition ${
                    radius === r
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-white/60 dark:bg-white/[0.02] border border-stone-200/70 dark:border-white/[0.08] text-muted hover:text-body'
                  }`}>
                  {r} {isBangla ? 'কিমি' : 'km'}
                </button>
              ))}
            </div>

            {/* list / map toggle */}
            <div className="flex rounded-lg border border-stone-200/70 dark:border-white/[0.08] overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 text-[12px] font-medium flex items-center gap-1.5 transition ${
                  view === 'list'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white/60 dark:bg-white/[0.02] text-muted hover:text-body'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {isBangla ? 'তালিকা' : 'List'}
              </button>
              <button
                onClick={() => setView('map')}
                className={`px-3 py-1.5 text-[12px] font-medium flex items-center gap-1.5 transition border-l border-stone-200/70 dark:border-white/[0.08] ${
                  view === 'map'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-white/60 dark:bg-white/[0.02] text-muted hover:text-body'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                {isBangla ? 'মানচিত্র' : 'Map'}
              </button>
            </div>
          </div>
        </div>

        {/* search link */}
        <Link to="/dashboard/search"
          className="flex items-center gap-3 mb-6 w-full rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.02] px-4 py-3 text-[13px] text-muted hover:border-emerald-300 dark:hover:border-emerald-500/20 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {isBangla ? 'পণ্য অনুসন্ধান করুন...' : 'Search products across shops...'}
        </Link>

        {loading || (geoLoading && !hasUserLocation) ? (
          <LoadingSpinner size="lg" className="py-20" />
        ) : !hasUserLocation ? (
          <EmptyState
            icon={<svg className="w-12 h-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>}
            title={isBangla ? 'লোকেশন সেট করুন' : 'Set Your Location'}
            description={isBangla ? 'প্রথমবার ব্যবহারের জন্য লোকেশন দিন বা ম্যাপে ট্যাপ করে ম্যানুয়ালি সেট করুন।' : 'Add your location for the first time, or set it manually by tapping on the map.'}
            action={
              <button
                onClick={openLocationModal}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white"
              >
                {isBangla ? 'লোকেশন সেট করুন' : 'Set Location'}
              </button>
            }
          />
        ) : shops.length === 0 ? (
          <EmptyState
            icon={<svg className="w-12 h-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            title={isBangla ? 'কাছে কোনো দোকান নেই' : 'No Shops Nearby'}
            description={isBangla ? 'ব্যাসার্ধ বাড়িয়ে আবার চেষ্টা করুন।' : 'Try increasing the radius.'}
          />
        ) : view === 'map' ? (
          <NearbyShopsMap
            userLat={lat}
            userLng={lng}
            shops={shops}
            isBangla={isBangla}
            className="mb-6"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop) => (
              <Link key={shop._id} to={`/dashboard/shop/${shop._id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardBody>
                    {shop.image_url && (
                      <img src={shop.image_url} alt={shop.name} className="mb-3 h-32 w-full rounded-lg object-cover border border-stone-200/70 dark:border-white/[0.08]" />
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-semibold text-heading truncate">{shop.name}</h3>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {shop.category && <Badge color="emerald">{shop.category}</Badge>}
                          {shop.distance_km != null && (
                            <span className="text-[11px] text-muted">{shop.distance_km.toFixed(1)} km</span>
                          )}
                        </div>
                        {shop.address && (
                          <p className="mt-2 text-[12px] text-muted flex items-center gap-1 truncate">
                            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                            {[shop.address.street, shop.address.city, shop.address.state, shop.address.country].filter(Boolean).join(', ') || null}
                          </p>
                        )}
                      </div>
                      {shop.rating_average ? (
                        <div className="flex items-center gap-1 text-[12px] text-muted ml-2">
                          <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          {shop.rating_average.toFixed(1)}
                        </div>
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Modal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          title={isBangla ? 'লোকেশন সেট / আপডেট' : 'Set / Update Location'}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-[13px] text-muted">
              {isBangla
                ? 'ম্যাপে ক্লিক করে বা মার্কার টেনে লোকেশন ম্যানুয়ালি দিন। চাইলে "আমার লোকেশন" ব্যবহার করতে পারেন।'
                : 'Set location manually by clicking on the map or dragging the marker. You can also use "my location".'}
            </p>

            <LocationPicker
              lat={draftLocation.lat}
              lng={draftLocation.lng}
              onChange={setDraftLocation}
              onUseMyLocation={handleUseMyLocationInModal}
              geoLoading={manualGeoLoading}
              isBangla={isBangla}
            />

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="rounded-xl border border-stone-200/70 dark:border-white/[0.08] px-4 py-2 text-[13px] font-medium text-body"
              >
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={!Number.isFinite(Number(draftLocation.lat)) || !Number.isFinite(Number(draftLocation.lng))}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {isBangla ? 'সংরক্ষণ করুন' : 'Save Location'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
