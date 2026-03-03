import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { productsAPI } from '../../../api/products';
import { shopsAPI } from '../../../api/shops';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Select from '../../../components/ui/Select';

const PRODUCT_CATEGORIES = ['Rice', 'Lentils', 'Oil', 'Spices', 'Flour', 'Sugar', 'Salt', 'Tea', 'Milk', 'Eggs', 'Vegetables', 'Fruits', 'Fish', 'Meat', 'Snacks', 'Beverages', 'Cleaning', 'Personal Care', 'Baby Products', 'Other'];

export default function AddProduct() {
  const { shopId } = useParams();
  const { isBangla } = useLanguage();
  const navigate = useNavigate();

  const [shopName, setShopName] = useState('');
  const [form, setForm] = useState({
    name: '', category: '', description: '', price: '', in_stock: true,
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    shopsAPI.getShop(shopId).then(r => setShopName(r.data.name)).catch(() => {});
  }, [shopId]);

  const setValue = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(isBangla ? 'পণ্যের নাম দিন' : 'Product name required'); return; }
    if (!form.price || parseFloat(form.price) <= 0) { toast.error(isBangla ? 'মূল্য দিন' : 'Price required'); return; }

    setLoading(true);
    try {
      let imageUrls = [];
      if (images.length > 0) {
        const uploadRes = await productsAPI.uploadProductImages(images);
        imageUrls = uploadRes.data?.urls || [];
      }

      await productsAPI.createProduct({
        shop_id: shopId,
        name: form.name.trim(),
        category: form.category || undefined,
        description: form.description.trim() || undefined,
        images: imageUrls,
        current_price: parseFloat(form.price),
        stock_quantity: form.in_stock ? 1 : 0,
      });
      toast.success(isBangla ? 'পণ্য যুক্ত হয়েছে!' : 'Product added!');
      navigate(`/dashboard/shops/${shopId}`);
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Failed');
    } finally { setLoading(false); }
  };

  const fieldCls = "w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-cerialebaran text-[24px] text-heading mb-1">
          {isBangla ? 'পণ্য যুক্ত করুন' : 'Add Product'}
        </h1>
        {shopName && <p className="text-[13px] text-muted mb-6">{shopName}</p>}

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'পণ্যের নাম' : 'Product Name'} *</label>
                <input value={form.name} onChange={(e) => setValue('name', e.target.value)} className={fieldCls} placeholder={isBangla ? 'যেমন: মিনিকেট চাল' : 'e.g. Miniket Rice'} required />
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
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'মূল্য (৳)' : 'Price (৳)'} *</label>
                <input value={form.price} onChange={(e) => setValue('price', e.target.value)} type="number" step="0.01" min="0" className={fieldCls} placeholder="0.00" required />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'বিবরণ' : 'Description'}</label>
                <textarea value={form.description} onChange={(e) => setValue('description', e.target.value)} rows={3} className={fieldCls} placeholder={isBangla ? 'পণ্য সম্পর্কে' : 'About product'} />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'পণ্যের ছবি' : 'Product Images'}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => setImages(Array.from(e.target.files || []))}
                  className={fieldCls}
                />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="inStock" checked={form.in_stock} onChange={(e) => setValue('in_stock', e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 dark:border-white/20 text-emerald-600 focus:ring-emerald-500/30" />
                <label htmlFor="inStock" className="text-[13px] text-body">{isBangla ? 'স্টকে আছে' : 'In Stock'}</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition">
                  {loading ? '...' : (isBangla ? 'যুক্ত করুন' : 'Add Product')}
                </button>
                <button type="button" onClick={() => navigate(`/dashboard/shops/${shopId}`)}
                  className="rounded-xl border border-stone-200/70 dark:border-white/[0.08] px-6 py-2.5 text-[13px] font-medium text-body hover:bg-stone-50 dark:hover:bg-white/[0.03] transition">
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
