import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../LanguageContext';
import { searchAPI } from '../../../api/search';
import { useLocation } from '../../../hooks/useLocation';
import { useDebounce } from '../../../hooks/useDebounce';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';

export default function Search() {
  const { isBangla } = useLanguage();
  const { lat, lng } = useLocation();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await searchAPI.searchProducts(q, lat, lng);
      setResults(res.data.results || res.data.products || res.data || []);
      setSearched(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [lat, lng]);

  useEffect(() => { doSearch(debouncedQuery); }, [debouncedQuery, doSearch]);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-cerialebaran text-[24px] text-heading mb-6">
          {isBangla ? 'পণ্য অনুসন্ধান' : 'Search Products'}
        </h1>

        {/* search bar */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
            className="w-full rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] pl-11 pr-4 py-3.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            placeholder={isBangla ? 'পণ্যের নাম লিখুন... (যেমন: চাল, তেল, ডাল)' : 'Type product name... (e.g. rice, oil, lentils)'} />
          {loading && <div className="absolute right-4 top-1/2 -translate-y-1/2"><LoadingSpinner size="sm" /></div>}
        </div>

        {/* results */}
        {!searched && !loading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-stone-200 dark:text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="0.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="mt-3 text-[13px] text-muted">{isBangla ? 'খোঁজ শুরু করতে লিখুন' : 'Start typing to search'}</p>
          </div>
        )}

        {searched && results.length === 0 && !loading && (
          <EmptyState
            icon={<svg className="w-10 h-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            title={isBangla ? 'কিছু পাওয়া যায়নি' : 'No Results'}
            description={isBangla ? 'অন্য কিছু খোঁজ করুন' : 'Try different keywords'}
          />
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => (
              <Link key={item._id || item.product_id || item.product?._id} to={`/dashboard/product/${item._id || item.product_id || item.product?._id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardBody>
                    {(Array.isArray(item.images) || Array.isArray(item.product?.images)) && (item.images?.[0] || item.product?.images?.[0]) && (
                      <img src={item.images?.[0] || item.product?.images?.[0]} alt={item.name || item.product_name || item.product?.name} className="mb-3 h-32 w-full rounded-lg object-cover border border-stone-200/70 dark:border-white/[0.08]" />
                    )}
                    <h3 className="text-[14px] font-semibold text-heading truncate">{item.name || item.product_name || item.product?.name}</h3>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {(item.category || item.product?.category) && <Badge color="gray">{item.category || item.product?.category}</Badge>}
                      {(item.shop_name || item.shop?.name) && (
                        <span className="text-[11px] text-muted">{item.shop_name || item.shop?.name}</span>
                      )}
                    </div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-[18px] font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{item.current_price ?? item.product?.current_price ?? item.price ?? '—'}
                      </span>
                      {item.unit && <span className="text-[11px] text-muted">/{item.unit}</span>}
                    </div>
                    {item.distance_km != null && (
                      <p className="mt-1 text-[11px] text-muted">{item.distance_km.toFixed(1)} km</p>
                    )}
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
