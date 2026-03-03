import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { productsAPI } from '../../../api/products';
import { wishlistAPI } from '../../../api/wishlist';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

export default function ProductDetail() {
  const { id } = useParams();
  const { isBangla } = useLanguage();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [pRes, phRes] = await Promise.all([
          productsAPI.getProduct(id),
          productsAPI.getPriceHistory(id).catch(() => ({ data: [] })),
        ]);
        setProduct(pRes.data);
        setPriceHistory(phRes.data.price_history || phRes.data || []);
      } catch {
        toast.error('Product not found');
        navigate(-1);
      } finally { setLoading(false); }
    })();
  }, [id, navigate]);

  const addToWishlist = async () => {
    setAdding(true);
    try {
      await wishlistAPI.addItem({
        product_id: id,
        target_price: targetPrice ? parseFloat(targetPrice) : undefined,
      });
      toast.success(isBangla ? 'উইশলিস্টে যুক্ত হয়েছে!' : 'Added to wishlist!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setAdding(false); }
  };

  if (loading) return <DashboardLayout><LoadingSpinner size="lg" className="py-20" /></DashboardLayout>;
  if (!product) return null;

  const price = product.current_price ?? product.price ?? 0;

  // simple min/max/avg from history
  const prices = priceHistory.map(h => h.price).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const avgPrice = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* back link */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[12px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline mb-4">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          {isBangla ? 'পেছনে' : 'Back'}
        </button>

        {/* product info */}
        <Card className="mb-6">
          <CardBody>
            {Array.isArray(product.images) && product.images[0] && (
              <img src={product.images[0]} alt={product.name} className="mb-4 h-56 w-full rounded-xl object-cover border border-stone-200/70 dark:border-white/[0.08]" />
            )}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-semibold text-heading">{product.name}</h1>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {product.category && <Badge color="emerald">{product.category}</Badge>}
                  {product.stock_quantity === 0 ? (
                    <Badge color="red">{isBangla ? 'স্টক নেই' : 'Out of Stock'}</Badge>
                  ) : (
                    <Badge color="emerald">{isBangla ? 'স্টকে আছে' : 'In Stock'}</Badge>
                  )}
                </div>
                {product.description && <p className="mt-3 text-[13px] text-body">{product.description}</p>}
                {product.shop_name && (
                  <p className="mt-2 text-[12px] text-muted">
                    {isBangla ? 'দোকান:' : 'Shop:'}{' '}
                    <Link to={`/dashboard/shop/${product.shop_id}`} className="text-emerald-700 dark:text-emerald-300 hover:underline">
                      {product.shop_name}
                    </Link>
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[28px] font-bold text-emerald-600 dark:text-emerald-400">৳{price}</p>
                {product.unit && <p className="text-[12px] text-muted">/{product.unit}</p>}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* wishlist */}
        <Card className="mb-6">
          <CardBody>
            <h3 className="text-[14px] font-semibold text-heading mb-3">
              {isBangla ? 'উইশলিস্টে যুক্ত করুন' : 'Add to Wishlist'}
            </h3>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[12px] text-muted mb-1.5">
                  {isBangla ? 'টার্গেট মূল্য (ঐচ্ছিক)' : 'Target price (optional)'}
                </label>
                <input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)}
                  type="number" step="0.01" min="0" placeholder={`current: ৳${price}`}
                  className="w-full max-w-[200px] rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
              </div>
              <button onClick={addToWishlist} disabled={adding}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {adding ? '...' : (isBangla ? 'যুক্ত করুন' : 'Add')}
              </button>
            </div>
          </CardBody>
        </Card>

        {/* price intelligence */}
        {prices.length > 0 && (
          <Card className="mb-6">
            <CardBody>
              <h3 className="text-[14px] font-semibold text-heading mb-4">
                {isBangla ? 'মূল্য বিশ্লেষণ' : 'Price Intelligence'}
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="text-center p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/[0.06]">
                  <p className="text-[11px] text-muted uppercase tracking-wider">{isBangla ? 'সর্বনিম্ন' : 'Lowest'}</p>
                  <p className="text-[18px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">৳{minPrice}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-amber-50/60 dark:bg-gold/[0.06]">
                  <p className="text-[11px] text-muted uppercase tracking-wider">{isBangla ? 'গড়' : 'Average'}</p>
                  <p className="text-[18px] font-bold text-gold mt-1">৳{avgPrice?.toFixed(0)}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-red-50/60 dark:bg-red-500/[0.06]">
                  <p className="text-[11px] text-muted uppercase tracking-wider">{isBangla ? 'সর্বোচ্চ' : 'Highest'}</p>
                  <p className="text-[18px] font-bold text-red-500 mt-1">৳{maxPrice}</p>
                </div>
              </div>

              {/* price timeline */}
              <h4 className="text-[12px] font-medium text-muted mb-2">{isBangla ? 'ইতিহাস' : 'History'}</h4>
              <div className="space-y-1.5 max-h-[240px] overflow-y-auto custom-scrollbar">
                {priceHistory.slice(0, 30).map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-white/[0.04] last:border-0">
                    <span className="text-[13px] font-medium text-heading">৳{h.price}</span>
                    <span className="text-[11px] text-muted">
                      {h.recorded_at ? new Date(h.recorded_at).toLocaleDateString() : h.date || ''}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
