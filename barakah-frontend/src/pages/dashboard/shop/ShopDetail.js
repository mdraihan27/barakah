import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { shopsAPI } from '../../../api/shops';
import { productsAPI } from '../../../api/products';
import { reviewsAPI } from '../../../api/reviews';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import StarRating from '../../../components/common/StarRating';

export default function ShopDetail() {
  const { id } = useParams();
  const { isBangla } = useLanguage();
  const navigate = useNavigate();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('products');

  useEffect(() => {
    (async () => {
      try {
        const [shopRes, prodRes, revRes] = await Promise.all([
          shopsAPI.getShop(id),
          productsAPI.getProductsByShop(id).catch(() => ({ data: { products: [] } })),
          reviewsAPI.getShopReviews(id).catch(() => ({ data: { reviews: [] } })),
        ]);
        setShop(shopRes.data);
        setProducts(prodRes.data.products || prodRes.data || []);
        setReviews(revRes.data.reviews || revRes.data || []);
      } catch {
        toast.error('Shop not found');
        navigate('/dashboard/shops');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  if (loading) return <DashboardLayout><LoadingSpinner size="lg" className="py-20" /></DashboardLayout>;
  if (!shop) return null;

  const tabs = [
    { key: 'products', label: isBangla ? 'পণ্য' : 'Products', count: products.length },
    { key: 'reviews', label: isBangla ? 'রিভিউ' : 'Reviews', count: reviews.length },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* shop header */}
        <Card className="mb-6">
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-[480px_minmax(0,1fr)_auto] gap-5 lg:gap-6 items-start">
              <div>
                {shop.image_url ? (
                  <img src={shop.image_url} alt={shop.name} className="h-48 lg:h-52 w-full rounded-xl object-cover border border-stone-200/70 dark:border-white/[0.08]" />
                ) : (
                  <div className="h-48 lg:h-52 w-full rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-stone-100/70 dark:bg-white/[0.04] flex items-center justify-center text-[12px] text-muted">
                    {isBangla ? 'ছবি নেই' : 'No image'}
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <h1 className="text-[20px] font-semibold text-heading break-words">{shop.name}</h1>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {shop.category && <Badge color="emerald">{shop.category}</Badge>}
                  {shop.rating_average ? (
                    <span className="flex items-center gap-1 text-[12px] text-muted">
                      <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      {shop.rating_average.toFixed(1)}
                    </span>
                  ) : null}
                </div>

                {shop.description && <p className="mt-3 text-[13px] text-body leading-relaxed">{shop.description}</p>}

                {shop.address && (() => {
                  const addr = typeof shop.address === 'string'
                    ? shop.address
                    : [shop.address.street, shop.address.city, shop.address.state, shop.address.country].filter(Boolean).join(', ');
                  return addr ? (
                    <p className="mt-2 text-[12px] text-muted flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 mt-[2px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span className="break-words">{addr}</span>
                    </p>
                  ) : null;
                })()}
              </div>

              <div className="flex gap-2 lg:flex-col w-full lg:w-auto lg:min-w-[140px]">
                <Link to={`/dashboard/shops/${id}/edit`}
                  className="flex-1 lg:flex-none text-center rounded-xl border border-stone-200/70 dark:border-white/[0.08] px-4 py-2 text-[12px] font-medium text-body hover:bg-stone-50 dark:hover:bg-white/[0.03] transition">
                  {isBangla ? 'সম্পাদনা' : 'Edit'}
                </Link>
                <Link to={`/dashboard/shops/${id}/products/add`}
                  className="flex-1 lg:flex-none text-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-[12px] font-semibold text-white">
                  {isBangla ? 'পণ্য যুক্ত' : 'Add Product'}
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-stone-100/60 dark:bg-white/[0.03] w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${
                tab === t.key
                  ? 'bg-white dark:bg-white/[0.08] text-heading shadow-sm'
                  : 'text-muted hover:text-body'
              }`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* products tab */}
        {tab === 'products' && (
          products.length === 0 ? (
            <EmptyState
              icon={<svg className="w-10 h-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
              title={isBangla ? 'কোনো পণ্য নেই' : 'No Products'}
              description={isBangla ? 'প্রথম পণ্য যুক্ত করুন' : 'Add your first product'}
              action={
                <Link to={`/dashboard/shops/${id}/products/add`}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white">
                  {isBangla ? 'পণ্য যুক্ত করুন' : 'Add Product'}
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Link key={p._id} to={`/dashboard/products/${p._id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardBody>
                      {Array.isArray(p.images) && p.images[0] && (
                        <img src={p.images[0]} alt={p.name} className="mb-3 h-36 w-full rounded-lg object-cover border border-stone-200/70 dark:border-white/[0.08]" />
                      )}
                      <h3 className="text-[14px] font-semibold text-heading truncate">{p.name}</h3>
                      {p.category && <Badge color="gray" className="mt-1">{p.category}</Badge>}
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">৳{p.current_price ?? p.price ?? '—'}</span>
                        {p.unit && <span className="text-[11px] text-muted">/{p.unit}</span>}
                      </div>
                      {p.in_stock === false && <Badge color="red" className="mt-2">{isBangla ? 'স্টক নেই' : 'Out of Stock'}</Badge>}
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          )
        )}

        {/* reviews tab */}
        {tab === 'reviews' && (
          reviews.length === 0 ? (
            <EmptyState
              icon={<svg className="w-10 h-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
              title={isBangla ? 'কোনো রিভিউ নেই' : 'No Reviews Yet'}
              description=""
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <Card key={r._id}>
                  <CardBody>
                    <div className="flex items-start justify-between">
                      <div>
                        <StarRating rating={r.rating} size="sm" />
                        <p className="mt-1.5 text-[13px] text-body leading-relaxed">{r.comment || r.text || ''}</p>
                        <p className="mt-1 text-[11px] text-muted">{r.user_name || 'Anonymous'} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
