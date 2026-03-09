import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { shopsAPI } from '../../../api/shops';
import { productsAPI } from '../../../api/products';
import { reviewsAPI } from '../../../api/reviews';
import { chatAPI } from '../../../api/chat';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import StarRating from '../../../components/common/StarRating';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';
import Modal from '../../../components/common/Modal';
import { getApiErrorMessage } from '../../../utils/apiError';

export default function PublicShopDetail() {
  const { id } = useParams();
  const { isBangla } = useLanguage();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('products');

  // review form
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

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
      } finally { setLoading(false); }
    })();
  }, [id]);

  const handleReview = async () => {
    setReviewLoading(true);
    try {
      await reviewsAPI.createReview(id, { rating: reviewRating, text: reviewComment.trim() || undefined });
      toast.success(isBangla ? 'রিভিউ দেওয়া হয়েছে!' : 'Review submitted!');
      setShowReview(false);
      setReviewComment('');
      // refresh reviews
      const res = await reviewsAPI.getShopReviews(id).catch(() => ({ data: { reviews: [] } }));
      setReviews(res.data.reviews || res.data || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed'));
    } finally { setReviewLoading(false); }
  };

  const handleStartChat = async () => {
    try {
      const res = await chatAPI.createConversation(shop.owner_id);
      const convId = res.data._id || res.data.id;
      if (convId) {
        window.location.href = `/dashboard/chat/${convId}`;
      }
    } catch {
      toast.error('Could not start conversation');
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner size="lg" className="py-20" /></DashboardLayout>;
  if (!shop) return <DashboardLayout><EmptyState title="Shop not found" /></DashboardLayout>;

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
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                {shop.image_url && (
                  <img src={shop.image_url} alt={shop.name} className="mb-3 h-44 w-full max-w-xl rounded-xl object-cover border border-stone-200/70 dark:border-white/[0.08]" />
                )}
                <h1 className="text-[20px] font-semibold text-heading">{shop.name}</h1>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {shop.category && <Badge color="emerald">{shop.category}</Badge>}
                  {shop.rating_average ? (
                    <span className="flex items-center gap-1 text-[12px] text-muted">
                      <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      {shop.rating_average.toFixed(1)} ({reviews.length})
                    </span>
                  ) : null}
                  {shop.distance_km != null && (
                    <span className="text-[11px] text-muted">{shop.distance_km.toFixed(1)} km {isBangla ? 'দূরে' : 'away'}</span>
                  )}
                </div>
                {shop.description && <p className="mt-2 text-[13px] text-body">{shop.description}</p>}
                {shop.address && (
                  <p className="mt-1 text-[12px] text-muted flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {[shop.address.street, shop.address.city, shop.address.state, shop.address.country].filter(Boolean).join(', ') || null}
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={handleStartChat}
                  className="rounded-xl border border-stone-200/70 dark:border-white/[0.08] px-4 py-2 text-[12px] font-medium text-body hover:bg-stone-50 dark:hover:bg-white/[0.03] transition flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {isBangla ? 'মেসেজ' : 'Message'}
                </button>
                <button onClick={() => setShowReview(true)}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 text-[12px] font-semibold text-white flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                  {isBangla ? 'রিভিউ দিন' : 'Review'}
                </button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-stone-100/60 dark:bg-white/[0.03] w-fit">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition ${
                tab === t.key ? 'bg-white dark:bg-white/[0.08] text-heading shadow-sm' : 'text-muted hover:text-body'
              }`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {/* products */}
        {tab === 'products' && (
          products.length === 0 ? (
            <EmptyState title={isBangla ? 'কোনো পণ্য নেই' : 'No Products'} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <Link key={p._id} to={`/dashboard/product/${p._id}`}>
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

        {/* reviews */}
        {tab === 'reviews' && (
          reviews.length === 0 ? (
            <EmptyState title={isBangla ? 'কোনো রিভিউ নেই' : 'No Reviews Yet'} />
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <Card key={r._id}>
                  <CardBody>
                    <StarRating value={r.rating} readOnly size="sm" />
                    {r.comment && <p className="mt-1.5 text-[13px] text-body">{r.comment}</p>}
                    <p className="mt-1 text-[11px] text-muted">{r.user_name || 'User'} · {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
                  </CardBody>
                </Card>
              ))}
            </div>
          )
        )}

        {/* review modal */}
        <Modal isOpen={showReview} onClose={() => setShowReview(false)} title={isBangla ? 'রিভিউ দিন' : 'Write a Review'}>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-medium text-body mb-2">{isBangla ? 'রেটিং' : 'Rating'}</label>
              <StarRating value={reviewRating} onChange={setReviewRating} size="lg" />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'মন্তব্য' : 'Comment'}</label>
              <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3}
                className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder={isBangla ? 'আপনার অভিজ্ঞতা শেয়ার করুন...' : 'Share your experience...'} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowReview(false)}
                className="rounded-xl border border-stone-200/70 dark:border-white/[0.08] px-5 py-2.5 text-[13px] font-medium text-body">
                {isBangla ? 'বাতিল' : 'Cancel'}
              </button>
              <button onClick={handleReview} disabled={reviewLoading}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                {reviewLoading ? '...' : (isBangla ? 'জমা দিন' : 'Submit')}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
