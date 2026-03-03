import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../LanguageContext';
import { shopsAPI } from '../../../api/shops';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';

export default function MyShops() {
  const { isBangla } = useLanguage();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await shopsAPI.getMyShops();
        setShops(res.data.shops || res.data || []);
      } catch { setShops([]); } finally { setLoading(false); }
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cerialebaran text-[24px] text-heading">
            {isBangla ? 'আমার দোকানসমূহ' : 'My Shops'}
          </h1>
          <Link to="/dashboard/shops/create"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            {isBangla ? 'নতুন দোকান' : 'Add Shop'}
          </Link>
        </div>

        {loading ? (
          <LoadingSpinner size="lg" className="py-20" />
        ) : shops.length === 0 ? (
          <EmptyState
            icon={<svg className="w-12 h-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4v13a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" /></svg>}
            title={isBangla ? 'কোনো দোকান নেই' : 'No Shops Yet'}
            description={isBangla ? 'নতুন দোকান যুক্ত করুন।' : 'Create your first shop to start listing products.'}
            action={
              <Link to="/dashboard/shops/create"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white">
                {isBangla ? 'দোকান তৈরি করুন' : 'Create Shop'}
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shops.map((shop) => (
              <Link key={shop._id} to={`/dashboard/shops/${shop._id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardBody>
                    {shop.image_url && (
                      <img src={shop.image_url} alt={shop.name} className="mb-3 h-36 w-full rounded-lg object-cover border border-stone-200/70 dark:border-white/[0.08]" />
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[16px] font-semibold text-heading truncate">{shop.name}</h3>
                        {shop.category && (
                          <Badge color="emerald" className="mt-1">{shop.category}</Badge>
                        )}
                        {shop.description && (
                          <p className="mt-2 text-[12px] text-muted line-clamp-2">{shop.description}</p>
                        )}
                        {shop.address && (() => {
                          const addr = typeof shop.address === 'string'
                            ? shop.address
                            : [shop.address.street, shop.address.city, shop.address.state, shop.address.country].filter(Boolean).join(', ');
                          return addr ? (
                            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              <span className="truncate">{addr}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div className="ml-3 flex items-center gap-1 text-[12px] text-muted">
                        {shop.rating_average ? (
                          <>
                            <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            <span>{shop.rating_average.toFixed(1)}</span>
                          </>
                        ) : null}
                      </div>
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
