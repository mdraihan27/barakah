import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../LanguageContext';
import { shopsAPI } from '../../../api/shops';
import { useLocation } from '../../../hooks/useLocation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import NearbyShopsMap from '../../../components/common/NearbyShopsMap';

export default function Explore() {
  const { isBangla } = useLanguage();
  const { lat, lng, loading: geoLoading, error: geoError } = useLocation();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [view, setView] = useState('list'); // 'list' | 'map'

  useEffect(() => {
    if (!lat || !lng) return;
    (async () => {
      setLoading(true);
      try {
        const res = await shopsAPI.getNearbyShops(lat, lng, radius);
        setShops(res.data.shops || res.data || []);
      } catch { setShops([]); }
      finally { setLoading(false); }
    })();
  }, [lat, lng, radius]);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-cerialebaran text-[24px] text-heading">
              {isBangla ? 'কাছের দোকান' : 'Nearby Shops'}
            </h1>
            <p className="text-[13px] text-muted mt-0.5">
              {geoLoading ? (isBangla ? 'লোকেশন খুঁজছে...' : 'Getting location...') :
               geoError ? (isBangla ? 'লোকেশন পাওয়া যায়নি, ডিফল্ট ব্যবহার হচ্ছে' : 'Location unavailable, using default') :
               (isBangla ? `আপনার ${radius} কিমি ব্যাসার্ধে` : `Within ${radius}km radius`)}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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

        {loading || geoLoading ? (
          <LoadingSpinner size="lg" className="py-20" />
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
      </div>
    </DashboardLayout>
  );
}
