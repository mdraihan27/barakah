import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../LanguageContext';
import { useTheme } from '../../ThemeContext';
import Avatar from '../ui/Avatar';
import PageShell from '../common/PageShell';
import { useChat } from '../../context/ChatContext';
import { useNotification } from '../../context/NotificationContext';

const ownerNav = [
  {
    labelKey: 'dashboard',
    to: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
      </svg>
    ),
  },
  {
    labelKey: 'myShops',
    to: '/dashboard/shops',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4v13a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    labelKey: 'messages',
    to: '/dashboard/chat',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    labelKey: 'notifications',
    to: '/dashboard/notifications',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    labelKey: 'profile',
    to: '/dashboard/profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    labelKey: 'interestArea',
    to: '/dashboard/interest-radius',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

const consumerNav = [
  {
    labelKey: 'dashboard',
    to: '/dashboard',
    icon: ownerNav[0].icon,
  },
  {
    labelKey: 'explore',
    to: '/dashboard/explore',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    labelKey: 'wishlist',
    to: '/dashboard/wishlist',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    labelKey: 'messages',
    to: '/dashboard/chat',
    icon: ownerNav[2].icon,
  },
  {
    labelKey: 'notifications',
    to: '/dashboard/notifications',
    icon: ownerNav[3].icon,
  },
  {
    labelKey: 'profile',
    to: '/dashboard/profile',
    icon: ownerNav[4].icon,
  },
  {
    labelKey: 'interestArea',
    to: '/dashboard/interest-radius',
    icon: ownerNav[5].icon,
  },
];

export default function DashboardLayout({ children }) {
  const { user, logout, isShopOwner } = useAuth();
  const { unreadTotal } = useChat();
  const { unreadCount: notificationUnreadCount } = useNotification();
  const { isDark, toggleTheme } = useTheme();
  const { isBangla, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = isShopOwner ? ownerNav : consumerNav;
  const logoUrl = `${process.env.PUBLIC_URL || ''}/logo.svg`;
  const labels = isBangla
    ? {
        dashboard: 'ড্যাশবোর্ড',
        myShops: 'আমার দোকান',
        messages: 'মেসেজ',
        notifications: 'নোটিফিকেশন',
        profile: 'প্রোফাইল',
        explore: 'এক্সপ্লোর',
        wishlist: 'উইশলিস্ট',
        interestArea: 'আগ্রহের এলাকা',
        unread: 'অপঠিত',
        logout: 'লগ আউট',
      }
    : {
        dashboard: 'Dashboard',
        myShops: 'My Shops',
        messages: 'Messages',
        notifications: 'Notifications',
        profile: 'Profile',
        explore: 'Explore',
        wishlist: 'Wishlist',
        interestArea: 'Interest Area',
        unread: 'unread',
        logout: 'Logout',
      };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* logo */}
      <div className="px-5 py-6">
        <Link to="/" className="logo-text inline-flex items-center" aria-label="Barakah">
          <span
            aria-hidden="true"
            className="inline-block h-8 w-[46px] bg-gradient-to-r from-emerald-700 to-amber-600 dark:from-emerald-200 dark:to-gold"
            style={{
              WebkitMaskImage: `url(${logoUrl})`,
              maskImage: `url(${logoUrl})`,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />
        </Link>
      </div>

      {/* nav links */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 dark:bg-emerald-500/[0.10] text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/20'
                  : 'text-body hover:bg-stone-100 dark:hover:bg-white/[0.04] border border-transparent'
              }`
            }
          >
            {item.icon}
            <span className="flex-1">{labels[item.labelKey] || item.labelKey}</span>
            {item.to === '/dashboard/chat' && unreadTotal > 0 && (
              <span
                title={`${unreadTotal} ${labels.unread}`}
                className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(255,255,255,0.8)] dark:shadow-[0_0_0_2px_rgba(6,14,8,0.9)]"
              />
            )}
            {item.to === '/dashboard/notifications' && notificationUnreadCount > 0 && (
              <span
                title={`${notificationUnreadCount} ${labels.unread}`}
                className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(255,255,255,0.8)] dark:shadow-[0_0_0_2px_rgba(6,14,8,0.9)]"
              />
            )}
          </NavLink>
        ))}
      </nav>

      {/* bottom section */}
      <div className="px-3 pb-5 space-y-2">
        {/* theme & language */}
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gold hover:bg-gold/10 transition-colors"
            aria-label={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleLanguage}
            className="text-[10px] font-semibold tracking-wide px-2 py-1 rounded-full border border-stone-300/60 dark:border-white/[0.1] text-body hover:border-emerald-600 dark:hover:border-emerald-400/40 transition-colors"
          >
            {isBangla ? 'EN' : 'বাং'}
          </button>
        </div>

        {/* user info */}
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-stone-50 dark:bg-white/[0.02] border border-stone-200/50 dark:border-white/[0.05]">
          <Avatar
            name={`${user?.first_name || ''} ${user?.last_name || ''}`}
            src={user?.avatar_url}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-heading truncate" style={{ fontSize: '12px', lineHeight: '16px' }}>
              {user?.first_name} {user?.last_name}
            </div>
            <div className="text-muted truncate" style={{ fontSize: '10px', lineHeight: '14px' }}>{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
            title={labels.logout}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <PageShell>
      <div className="dashboard-font min-h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 border-r border-stone-200/50 dark:border-white/[0.06] bg-white/95 dark:bg-[#060e08]/95 backdrop-blur-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-60 border-r border-stone-200/50 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.01] backdrop-blur-sm shrink-0">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* mobile top bar */}
          <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-stone-200/50 dark:border-white/[0.06] bg-white/50 dark:bg-white/[0.01] backdrop-blur-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-body hover:bg-stone-100 dark:hover:bg-white/[0.05] transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link to="/" className="logo-text">
              <span
                aria-hidden="true"
                className="inline-block h-7 w-[40px] bg-gradient-to-r from-emerald-700 to-amber-600 dark:from-emerald-200 dark:to-gold"
                style={{
                  WebkitMaskImage: `url(${logoUrl})`,
                  maskImage: `url(${logoUrl})`,
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                }}
              />
            </Link>
            <Avatar
              name={`${user?.first_name || ''} ${user?.last_name || ''}`}
              src={user?.avatar_url}
              size="sm"
            />
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
      </div>
    </PageShell>
  );
}
