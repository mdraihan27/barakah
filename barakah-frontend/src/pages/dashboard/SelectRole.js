import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../components/ui/Card';

export default function SelectRole() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const needsRoleSelection = sessionStorage.getItem('barakah-needs-role-selection') === '1';
    if (!needsRoleSelection) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const chooseRole = async (role) => {
    setLoading(true);
    setError('');
    try {
      await authAPI.updateMyRole(role);
      await refreshUser();
      sessionStorage.removeItem('barakah-needs-role-selection');
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Could not save your profile type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-cerialebaran text-[clamp(1.6rem,3vw,2.2rem)] text-heading">
          Choose Your Profile Type
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          Tell us how you want to use Barakah. You can continue as a consumer or set up as a seller.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5">
            <CardBody className="!p-0">
              <h2 className="text-[16px] font-semibold text-heading">Consumer</h2>
              <p className="mt-2 text-[13px] text-muted">
                Explore nearby shops, compare prices, and save products to your wishlist.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => chooseRole('user')}
                className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-medium hover:bg-emerald-700 disabled:opacity-60 transition"
              >
                Continue as Consumer
              </button>
            </CardBody>
          </Card>

          <Card className="p-5">
            <CardBody className="!p-0">
              <h2 className="text-[16px] font-semibold text-heading">Seller</h2>
              <p className="mt-2 text-[13px] text-muted">
                Create your shop, list products, and manage customer chats from your dashboard.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => chooseRole('shop_owner')}
                className="mt-5 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gold text-black text-[13px] font-medium hover:brightness-95 disabled:opacity-60 transition"
              >
                Continue as Seller
              </button>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
