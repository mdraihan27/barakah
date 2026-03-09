import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { notificationsAPI } from '../../../api/notifications';
import { useNotification } from '../../../context/NotificationContext';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';

export default function Notifications() {
  const { isBangla } = useLanguage();
  const navigate = useNavigate();
  const { unreadCount, setUnreadCount, eventTick, lastNotification } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await notificationsAPI.getNotifications(0, 100);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      setNotifications([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (eventTick > 0) {
      loadNotifications(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTick]);

  useEffect(() => {
    if (!lastNotification) return;
    setNotifications((prev) => {
      const incomingId = lastNotification._id || lastNotification.id;
      if (!incomingId) return prev;
      if (prev.some((n) => (n._id || n.id) === incomingId)) return prev;
      return [lastNotification, ...prev];
    });
  }, [lastNotification]);

  const handleMarkRead = async (notifId) => {
    try {
      await notificationsAPI.markAsRead(notifId);
      let nextUnread = unreadCount;
      setNotifications((prev) => prev.map((n) => {
        const isTarget = (n._id || n.id) === notifId;
        if (isTarget && !n.is_read) {
          nextUnread = Math.max(0, nextUnread - 1);
          return { ...n, is_read: true };
        }
        return n;
      }));
      setUnreadCount(nextUnread);
    } catch { toast.error('Failed'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success(isBangla ? 'সব পড়া হিসেবে চিহ্নিত' : 'All marked as read');
    } catch { toast.error('Failed'); }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'price_drop':
        return <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>;
      case 'review':
        return <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>;
      case 'message':
        return <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
      default:
        return <svg className="w-5 h-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    }
  };

  const getLinkedProductId = (notif) => {
    const payload = notif?.payload || {};
    return (
      payload.matched_product_id ||
      payload.product_id ||
      payload.competitor_product_id ||
      payload.your_product_id ||
      null
    );
  };

  const handleOpenNotification = async (notif) => {
    const nId = notif._id || notif.id;
    const linkedProductId = getLinkedProductId(notif);
    if (!linkedProductId) return;

    if (!notif.is_read) {
      await handleMarkRead(nId);
    }
    navigate(`/dashboard/product/${linkedProductId}`);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-cerialebaran text-[24px] text-heading">
              {isBangla ? 'নোটিফিকেশন' : 'Notifications'}
            </h1>
            {unreadCount > 0 && (
              <p className="text-[12px] text-muted mt-0.5">
                {unreadCount} {isBangla ? 'টি অপঠিত' : 'unread'}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline">
              {isBangla ? 'সব পড়া হিসেবে চিহ্নিত করুন' : 'Mark all as read'}
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner size="lg" className="py-20" />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<svg className="w-12 h-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
            title={isBangla ? 'কোনো নোটিফিকেশন নেই' : 'No Notifications'}
            description=""
          />
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const nId = notif._id || notif.id;
              const linkedProductId = getLinkedProductId(notif);
              const isClickable = Boolean(linkedProductId);
              return (
                <Card
                  key={nId}
                  className={[
                    !notif.is_read ? 'ring-1 ring-emerald-200/50 dark:ring-emerald-500/20' : '',
                    isClickable ? 'cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-500/25 transition' : '',
                  ].join(' ').trim()}
                  onClick={() => handleOpenNotification(notif)}
                >
                  <CardBody>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">{getIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] ${notif.is_read ? 'text-body' : 'text-heading font-medium'}`}>
                          {notif.message || notif.title || notif.text}
                        </p>
                        {notif.created_at && (
                          <p className="mt-1 text-[11px] text-muted">
                            {new Date(notif.created_at).toLocaleDateString()} · {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {isClickable && (
                          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                            {isBangla ? 'পণ্যটি দেখতে ক্লিক করুন' : 'Click to open product'}
                          </p>
                        )}
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(nId);
                          }}
                          title="Mark as read"
                          className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 transition mt-1.5" />
                      )}
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
