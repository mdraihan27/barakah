import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { wishlistAPI } from '../../../api/wishlist';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';

export default function Wishlist() {
  const { isBangla } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const res = await wishlistAPI.getWishlist();
      setItems(res.data.items || res.data.wishlist || res.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWishlist(); }, []);

  const handleRemove = async (itemId) => {
    try {
      await wishlistAPI.removeItem(itemId);
      setItems((prev) => prev.filter((i) => (i._id || i.id) !== itemId));
      toast.success(isBangla ? 'সরানো হয়েছে' : 'Removed');
    } catch {
      toast.error('Failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="font-cerialebaran text-[24px] text-heading mb-6">
          {isBangla ? 'উইশলিস্ট' : 'Wishlist'}
        </h1>

        {loading ? (
          <LoadingSpinner size="lg" className="py-20" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<svg className="w-12 h-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            title={isBangla ? 'উইশলিস্ট খালি' : 'Wishlist is Empty'}
            description={isBangla ? 'পণ্য অনুসন্ধান করে উইশলিস্টে যুক্ত করুন।' : 'Browse products and add them to your wishlist.'}
            action={
              <Link to="/dashboard/explore"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white">
                {isBangla ? 'দোকান খুঁজুন' : 'Explore Shops'}
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const itemId = item._id || item.id;
              return (
                <Card key={itemId}>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <Link to={`/dashboard/product/${item.product_id}`}
                          className="text-[15px] font-semibold text-heading hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                          {item.product_name || item.name || 'Product'}
                        </Link>
                        <div className="mt-1 flex items-center gap-3 flex-wrap">
                          {item.current_price != null && (
                            <span className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                              ৳{item.current_price}
                            </span>
                          )}
                          {item.target_price != null && (
                            <span className="text-[12px] text-muted">
                              {isBangla ? 'টার্গেট: ৳' : 'Target: ৳'}{item.target_price}
                            </span>
                          )}
                          {item.target_price && item.current_price && item.current_price <= item.target_price && (
                            <Badge color="emerald">{isBangla ? 'টার্গেটে পৌঁছেছে!' : 'Target reached!'}</Badge>
                          )}
                        </div>
                        {item.shop_name && (
                          <p className="mt-1 text-[11px] text-muted">{item.shop_name}</p>
                        )}
                      </div>
                      <button onClick={() => handleRemove(itemId)}
                        className="ml-3 p-2 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
