import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { shopsAPI } from '../../../api/shops';
import { useLocation } from '../../../hooks/useLocation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import LocationPicker from '../../../components/common/LocationPicker';
import Select from '../../../components/ui/Select';

const CATEGORIES = ['Grocery', 'Supermarket', 'Pharmacy', 'Bakery', 'Butcher', 'Fish', 'Vegetables', 'Fruits', 'Dairy', 'General Store', 'Other'];

export default function EditShop() {
  const { id } = useParams();
  const { isBangla } = useLanguage();
  const navigate = useNavigate();
  const { lat, lng, loading: geoLoading, refresh: geoRefresh } = useLocation();

  const [form, setForm] = useState({ name: '', description: '', category: '', address: '', latitude: '', longitude: '' });
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [shopImage, setShopImage] = useState(null);
  const [shopImagePreview, setShopImagePreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await shopsAPI.getShop(id);
        const s = res.data;
        setForm({
          name: s.name || '',
          description: s.description || '',
          category: s.category || '',
          address: s.address?.street || '',
          latitude: s.location?.coordinates?.[1]?.toString() || '',
          longitude: s.location?.coordinates?.[0]?.toString() || '',
        });
        setExistingImageUrl(s.image_url || '');
      } catch {
        toast.error('Shop not found');
        navigate('/dashboard/shops');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const setValue = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const useMyLocation = () => {
    if (lat && lng) {
      setForm((f) => ({ ...f, latitude: lat.toString(), longitude: lng.toString() }));
      toast.success(isBangla ? 'লোকেশন নেওয়া হয়েছে' : 'Location captured');
    } else { geoRefresh(); }
  };

  const handleMapChange = ({ lat: newLat, lng: newLng }) => {
    setForm((f) => ({ ...f, latitude: newLat.toString(), longitude: newLng.toString() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(isBangla ? 'নাম দিন' : 'Name is required'); return; }
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      if (form.description.trim()) payload.append('description', form.description.trim());
      if (form.category) payload.append('category', form.category);
      if (form.address.trim()) payload.append('address_street', form.address.trim());
      if (form.latitude && form.longitude) {
        payload.append('latitude', form.latitude);
        payload.append('longitude', form.longitude);
      }
      if (shopImage) payload.append('image', shopImage);

      await shopsAPI.updateShop(id, payload);
      toast.success(isBangla ? 'আপডেট হয়েছে!' : 'Shop updated!');
      navigate('/dashboard/shops');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Failed');
    } finally { setSaving(false); }
  };

  const fieldCls = "w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

  if (loading) return <DashboardLayout><LoadingSpinner size="lg" className="py-20" /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-cerialebaran text-[24px] text-heading mb-6">
          {isBangla ? 'দোকান সম্পাদনা' : 'Edit Shop'}
        </h1>
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
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
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'বিবরণ' : 'Description'}</label>
                <textarea value={form.description} onChange={(e) => setValue('description', e.target.value)} rows={3} className={fieldCls} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'ঠিকানা' : 'Address'}</label>
                <input value={form.address} onChange={(e) => setValue('address', e.target.value)} className={fieldCls} />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'দোকানের ছবি' : 'Shop Image'}</label>
                {shopImagePreview ? (
                  <img src={shopImagePreview} alt="New Preview" className="mb-2 h-28 w-full rounded-xl object-cover border border-2 border-emerald-500/50" />
                ) : existingImageUrl ? (
                  <img src={existingImageUrl} alt={form.name || 'shop'} className="mb-2 h-28 w-full rounded-xl object-cover border border-stone-200/70 dark:border-white/[0.08]" />
                ) : null}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setShopImage(file);
                    if (file) {
                      setShopImagePreview(URL.createObjectURL(file));
                    } else {
                      setShopImagePreview('');
                    }
                  }}
                  className={fieldCls}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'লোকেশন' : 'Location'}</label>
                <LocationPicker
                  lat={form.latitude}
                  lng={form.longitude}
                  onChange={handleMapChange}
                  onUseMyLocation={useMyLocation}
                  geoLoading={geoLoading}
                  isBangla={isBangla}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition">
                  {saving ? '...' : (isBangla ? 'সংরক্ষণ' : 'Save Changes')}
                </button>
                <button type="button" onClick={() => navigate('/dashboard/shops')}
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
