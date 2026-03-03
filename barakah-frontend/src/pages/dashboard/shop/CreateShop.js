import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { shopsAPI } from '../../../api/shops';
import { useLocation } from '../../../hooks/useLocation';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import LocationPicker from '../../../components/common/LocationPicker';
import Select from '../../../components/ui/Select';

const CATEGORIES = ['Grocery', 'Supermarket', 'Pharmacy', 'Bakery', 'Butcher', 'Fish', 'Vegetables', 'Fruits', 'Dairy', 'General Store', 'Other'];

export default function CreateShop() {
  const { isBangla } = useLanguage();
  const navigate = useNavigate();
  const { lat, lng, loading: geoLoading, refresh: geoRefresh } = useLocation();

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '',
    address: '',
    latitude: '',
    longitude: '',
  });
  const [loading, setLoading] = useState(false);
  const [shopImage, setShopImage] = useState(null);

  const setValue = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const useMyLocation = () => {
    if (lat && lng) {
      setForm((f) => ({ ...f, latitude: lat.toString(), longitude: lng.toString() }));
      toast.success(isBangla ? 'লোকেশন নেওয়া হয়েছে' : 'Location captured');
    } else {
      geoRefresh();
    }
  };

  const handleMapChange = ({ lat: newLat, lng: newLng }) => {
    setForm((f) => ({ ...f, latitude: newLat.toString(), longitude: newLng.toString() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error(isBangla ? 'দোকানের নাম দিন' : 'Shop name is required'); return; }
    if (!form.category) { toast.error(isBangla ? 'ক্যাটাগরি নির্বাচন করুন' : 'Please select a category'); return; }
    if (!form.latitude || !form.longitude) { toast.error(isBangla ? 'লোকেশন নির্বাচন করুন' : 'Please pick a location on the map'); return; }

    setLoading(true);
    try {
      let imageUrl = '';
      if (shopImage) {
        const uploadRes = await shopsAPI.uploadShopImage(shopImage);
        imageUrl = uploadRes.data?.url || '';
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        image_url: imageUrl || undefined,
        location: {
          type: 'Point',
          coordinates: [parseFloat(form.longitude), parseFloat(form.latitude)],
        },
        address: form.address.trim()
          ? { street: form.address.trim() }
          : undefined,
      };
      await shopsAPI.createShop(payload);
      toast.success(isBangla ? 'দোকান তৈরি হয়েছে!' : 'Shop created!');
      navigate('/dashboard/shops');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : (isBangla ? 'ব্যর্থ হয়েছে' : 'Failed to create shop'));
    } finally {
      setLoading(false);
    }
  };

  const fieldCls = "w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-cerialebaran text-[24px] text-heading mb-6">
          {isBangla ? 'নতুন দোকান' : 'Create Shop'}
        </h1>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'দোকানের নাম' : 'Shop Name'} *</label>
                <input value={form.name} onChange={(e) => setValue('name', e.target.value)} className={fieldCls} placeholder={isBangla ? 'যেমন: আল-ফাতিহা গ্রোসারি' : 'e.g. Al-Fatiha Grocery'} required />
              </div>

              {/* Category */}
              <Select
                label={isBangla ? 'ক্যাটাগরি' : 'Category'}
                value={form.category}
                onChange={(e) => setValue('category', e.target.value)}
              >
                <option value="">{isBangla ? 'নির্বাচন করুন' : 'Select category'}</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>

              {/* Description */}
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'বিবরণ' : 'Description'}</label>
                <textarea value={form.description} onChange={(e) => setValue('description', e.target.value)} rows={3} className={fieldCls} placeholder={isBangla ? 'দোকান সম্পর্কে কিছু লিখুন' : 'Brief description of your shop'} />
              </div>

              {/* Address */}
              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'ঠিকানা' : 'Address'}</label>
                <input value={form.address} onChange={(e) => setValue('address', e.target.value)} className={fieldCls} placeholder={isBangla ? 'দোকানের ঠিকানা' : 'Shop address'} />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'দোকানের ছবি' : 'Shop Image'}</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setShopImage(e.target.files?.[0] || null)}
                  className={fieldCls}
                />
              </div>

              {/* Location */}
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

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-emerald-600/20 disabled:opacity-60 transition">
                  {loading ? '...' : (isBangla ? 'তৈরি করুন' : 'Create Shop')}
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
