import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { productsAPI } from '../../../api/products';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Select from '../../../components/ui/Select';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const PRODUCT_CATEGORIES = ['Rice', 'Lentils', 'Oil', 'Spices', 'Flour', 'Sugar', 'Salt', 'Tea', 'Milk', 'Eggs', 'Vegetables', 'Fruits', 'Fish', 'Meat', 'Snacks', 'Beverages', 'Cleaning', 'Personal Care', 'Baby Products', 'Other'];

export default function EditProduct() {
  const { productId } = useParams();
  const { isBangla } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', category: '', description: '', in_stock: true });
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [currentPrice, setCurrentPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [shopId, setShopId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPrice, setUpdatingPrice] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, phRes] = await Promise.all([
          productsAPI.getProduct(productId),
          productsAPI.getPriceHistory(productId).catch(() => ({ data: [] })),
        ]);
        const p = pRes.data;
        setForm({ name: p.name || '', category: p.category || '', description: p.description || '', in_stock: (p.stock_quantity ?? 1) > 0 });
        setExistingImages(p.images || []);
        setCurrentPrice(p.current_price ?? p.price ?? '');
        setShopId(p.shop_id || '');
        setPriceHistory(phRes.data.price_history || phRes.data || []);
      } catch {
        toast.error('Product not found');
        navigate(-1);
      } finally { setLoading(false); }
    })();
  }, [productId, navigate]);

  const setValue = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      if (form.category) payload.append('category', form.category);
      if (form.description.trim()) payload.append('description', form.description.trim());
      payload.append('stock_quantity', form.in_stock ? '1' : '0');
      if (newImages.length > 0) {
        newImages.forEach((file) => payload.append('images', file));
      }

      await productsAPI.updateProduct(productId, payload);
      toast.success(isBangla ? 'আপডেট হয়েছে!' : 'Product updated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  const handlePriceUpdate = async () => {
    if (!newPrice || parseFloat(newPrice) <= 0) { toast.error('Enter valid price'); return; }
    setUpdatingPrice(true);
    try {
      await productsAPI.updatePrice(productId, parseFloat(newPrice));
      setCurrentPrice(parseFloat(newPrice));
      setNewPrice('');
      toast.success(isBangla ? 'মূল্য আপডেট হয়েছে!' : 'Price updated!');
      // refresh price history
      const phRes = await productsAPI.getPriceHistory(productId).catch(() => ({ data: [] }));
      setPriceHistory(phRes.data.price_history || phRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally { setUpdatingPrice(false); }
  };

  const fieldCls = "w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

  if (loading) return <DashboardLayout><LoadingSpinner size="lg" className="py-20" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-cerialebaran text-[24px] text-heading mb-6">
          {isBangla ? 'পণ্য সম্পাদনা' : 'Edit Product'}
        </h1>

        {/* product form */}
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'নাম' : 'Name'} *</label>
                <input value={form.name} onChange={(e) => setValue('name', e.target.value)} className={fieldCls} required />
              </div>
              <Select
                label={isBangla ? 'ক্যাটাগরি' : 'Category'}
                value={form.category}
                onChange={(e) => setValue('category', e.target.value)}
              >
                <option value="">—</option>
                {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'বিবরণ' : 'Description'}</label>
                <textarea value={form.description} onChange={(e) => setValue('description', e.target.value)} rows={3} className={fieldCls} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'পণ্যের ছবি' : 'Product Images'}</label>
                {existingImages.length > 0 && (
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {existingImages.slice(0, 3).map((url) => (
                      <img key={url} src={url} alt={form.name || 'product'} className="h-20 w-full rounded-lg object-cover border border-stone-200/70 dark:border-white/[0.08]" />
                    ))}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => setNewImages(Array.from(e.target.files || []))}
                  className={fieldCls}
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="inStockEdit" checked={form.in_stock} onChange={(e) => setValue('in_stock', e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 dark:border-white/20 text-emerald-600 focus:ring-emerald-500/30" />
                <label htmlFor="inStockEdit" className="text-[13px] text-body">{isBangla ? 'স্টকে আছে' : 'In Stock'}</label>
              </div>
              <button type="submit" disabled={saving}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60">
                {saving ? '...' : (isBangla ? 'সংরক্ষণ' : 'Save')}
              </button>
            </form>
          </CardBody>
        </Card>

        {/* price management */}
        <Card className="mb-6">
          <CardBody>
            <h3 className="text-[14px] font-semibold text-heading mb-4">
              {isBangla ? 'মূল্য পরিবর্তন' : 'Price Management'}
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[13px] text-muted">{isBangla ? 'বর্তমান মূল্য:' : 'Current:'}</span>
              <span className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400">৳{currentPrice}</span>
            </div>
            <div className="flex gap-3">
              <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" step="0.01" min="0" className={fieldCls + ' max-w-[200px]'} placeholder={isBangla ? 'নতুন মূল্য' : 'New price'} />
              <button onClick={handlePriceUpdate} disabled={updatingPrice}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                {updatingPrice ? '...' : (isBangla ? 'আপডেট' : 'Update Price')}
              </button>
            </div>
          </CardBody>
        </Card>

        {/* price history */}
        {priceHistory.length > 0 && (
          <Card>
            <CardBody>
              <h3 className="text-[14px] font-semibold text-heading mb-4">
                {isBangla ? 'মূল্যের ইতিহাস' : 'Price History'}
              </h3>
              <div className="space-y-2">
                {priceHistory.slice(0, 20).map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 dark:border-white/[0.04] last:border-0">
                    <span className="text-[14px] font-medium text-heading">৳{h.price}</span>
                    <span className="text-[11px] text-muted">
                      {h.recorded_at ? new Date(h.recorded_at).toLocaleDateString() : h.date || ''}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {shopId && (
          <div className="mt-4">
            <button onClick={() => navigate(`/dashboard/shops/${shopId}`)}
              className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              {isBangla ? 'দোকানে ফিরে যান' : 'Back to Shop'}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
