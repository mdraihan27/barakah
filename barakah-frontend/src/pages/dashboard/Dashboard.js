import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../LanguageContext';
import { shopsAPI } from '../../api/shops';
import { notificationsAPI } from '../../api/notifications';
import { wishlistAPI } from '../../api/wishlist';
import { chatAPI } from '../../api/chat';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function Dashboard() {
  const { user, isShopOwner } = useAuth();
  const navigate = useNavigate();
  const { isBangla } = useLanguage();
  const [stats, setStats] = useState({ shops: 0, notifications: 0, unread: 0, wishlist: 0, conversations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const needsRoleSelection = sessionStorage.getItem('barakah-needs-role-selection') === '1';
    if (needsRoleSelection) {
      navigate('/dashboard/select-role', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const promises = [
          notificationsAPI.getNotifications(0, 1).catch(() => ({ data: { total: 0, unread_count: 0 } })),
          chatAPI.getConversations().catch(() => ({ data: { total: 0 } })),
        ];

        if (isShopOwner) {
          promises.push(shopsAPI.getMyShops().catch(() => ({ data: { total: 0 } })));
        } else {
          promises.push(wishlistAPI.getWishlist().catch(() => ({ data: { total: 0 } })));
        }

        const [notifRes, chatRes, thirdRes] = await Promise.all(promises);

        setStats({
          notifications: notifRes.data.total || 0,
          unread: notifRes.data.unread_count || 0,
          conversations: chatRes.data.total || 0,
          shops: isShopOwner ? (thirdRes.data.total || 0) : 0,
          wishlist: !isShopOwner ? (thirdRes.data.total || 0) : 0,
        });
      } catch { /* silently fail */ } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isShopOwner]);

  const greeting = isBangla
    ? `আসসালামু আলাইকুম, ${user?.first_name || ''}!`
    : `Assalamu Alaikum, ${user?.first_name || ''}!`;

  const ownerCards = [
    {
      label: isBangla ? 'আমার দোকান' : 'My Shops',
      value: stats.shops,
      to: '/dashboard/shops',
      color: 'emerald',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4v13a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" /></svg>,
    },
    {
      label: isBangla ? 'মেসেজ' : 'Messages',
      value: stats.conversations,
      to: '/dashboard/chat',
      color: 'blue',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    },
    {
      label: isBangla ? 'নোটিফিকেশন' : 'Notifications',
      value: stats.unread,
      suffix: isBangla ? ' অপঠিত' : ' unread',
      to: '/dashboard/notifications',
      color: 'gold',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    },
  ];

  const consumerCards = [
    {
      label: isBangla ? 'কাছের দোকান' : 'Explore Shops',
      value: '→',
      to: '/dashboard/explore',
      color: 'emerald',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    },
    {
      label: isBangla ? 'উইশলিস্ট' : 'Wishlist',
      value: stats.wishlist,
      to: '/dashboard/wishlist',
      color: 'red',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
    },
    {
      label: isBangla ? 'মেসেজ' : 'Messages',
      value: stats.conversations,
      to: '/dashboard/chat',
      color: 'blue',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    },
    {
      label: isBangla ? 'নোটিফিকেশন' : 'Notifications',
      value: stats.unread,
      suffix: isBangla ? ' অপঠিত' : ' unread',
      to: '/dashboard/notifications',
      color: 'gold',
      icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
    },
  ];

  const statCards = isShopOwner ? ownerCards : consumerCards;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* greeting */}
        <div className="mb-8">
          <h1 className="font-cerialebaran text-[clamp(1.6rem,3vw,2.2rem)] text-heading">{greeting}</h1>
          <p className="mt-1 text-[14px] text-muted">
            {isShopOwner
              ? (isBangla ? 'আপনার দোকান ও পণ্য পরিচালনা করুন।' : 'Manage your shops and products.')
              : (isBangla ? 'কাছের দোকান খুঁজুন, দাম তুলনা করুন।' : 'Explore nearby shops and compare prices.')}
          </p>
          {!user?.is_email_verified && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-200/70 dark:border-gold/20 bg-amber-50/70 dark:bg-gold/[0.06] px-4 py-2">
              <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-[12px] text-amber-700 dark:text-gold">
                {isBangla ? 'ইমেইল ভেরিফাই করুন' : 'Please verify your email'}
              </span>
              <Link to={`/verify-email?email=${encodeURIComponent(user?.email || '')}`} className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline ml-2">
                {isBangla ? 'ভেরিফাই' : 'Verify now'}
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <LoadingSpinner size="lg" className="py-20" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((card) => (
              <Link key={card.to} to={card.to}>
                <Card className="p-5 h-full">
                  <CardBody className="!p-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[12px] text-muted font-medium">{card.label}</p>
                        <p className="mt-2 text-[28px] font-semibold text-heading">
                          {card.value}{card.suffix || ''}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        card.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-500/[0.08] text-emerald-600 dark:text-emerald-400' :
                        card.color === 'gold' ? 'bg-amber-50 dark:bg-gold/10 text-gold' :
                        card.color === 'blue' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                        'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400'
                      }`}>
                        {card.icon}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* quick actions */}
        <div className="mt-8">
          <h2 className="text-[14px] font-semibold text-heading mb-4">
            {isBangla ? 'দ্রুত কাজ' : 'Quick Actions'}
          </h2>
          <div className="flex flex-wrap gap-3">
            {isShopOwner ? (
              <>
                <Link to="/dashboard/shops/create"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/[0.06] text-[13px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/[0.12] transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  {isBangla ? 'নতুন দোকান' : 'Add Shop'}
                </Link>
                <Link to="/dashboard/chat"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.02] text-[13px] font-medium text-body hover:border-emerald-300 dark:hover:border-emerald-500/20 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  {isBangla ? 'মেসেজ দেখুন' : 'View Messages'}
                </Link>
              </>
            ) : (
              <>
                <Link to="/dashboard/explore"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200/70 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-500/[0.06] text-[13px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/[0.12] transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  {isBangla ? 'দোকান খুঁজুন' : 'Explore Shops'}
                </Link>
                <Link to="/dashboard/wishlist"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-200/70 dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.02] text-[13px] font-medium text-body hover:border-emerald-300 dark:hover:border-emerald-500/20 transition">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  {isBangla ? 'উইশলিস্ট' : 'My Wishlist'}
                </Link>
              </>
            )}
          </div>
        </div>

        {/* role badge */}
        <div className="mt-8">
          <Badge color={isShopOwner ? 'emerald' : 'gold'}>
            {isShopOwner ? (isBangla ? 'দোকানদার' : 'Shop Owner') : (isBangla ? 'ক্রেতা' : 'Consumer')}
          </Badge>
        </div>
      </div>
    </DashboardLayout>
  );
}
