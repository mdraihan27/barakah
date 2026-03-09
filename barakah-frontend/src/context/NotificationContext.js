import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { notificationsAPI } from '../api/notifications';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated, tokens } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [eventTick, setEventTick] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (!isAuthenticated || !tokens?.access_token) {
        setUnreadCount(0);
        return;
      }
      try {
        const res = await notificationsAPI.getNotifications(0, 1);
        if (mounted) {
          setUnreadCount(res.data?.unread_count || 0);
        }
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, tokens?.access_token]);

  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const ws = new WebSocket(notificationsAPI.notificationsWsUrl(tokens.access_token));
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'notification.new') {
          setUnreadCount(data.payload?.unread_count || 0);
          setLastNotification(data.payload?.notification || null);
          setEventTick((v) => v + 1);
        }
        if (data?.type === 'notification.unread') {
          setUnreadCount(data.payload?.unread_count || 0);
          setEventTick((v) => v + 1);
        }
      } catch {
        // ignore malformed websocket frames
      }
    };

    const heartbeat = window.setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 25000);

    return () => {
      window.clearInterval(heartbeat);
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [isAuthenticated, tokens?.access_token]);

  const value = useMemo(
    () => ({ unreadCount, setUnreadCount, eventTick, lastNotification }),
    [unreadCount, eventTick, lastNotification]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
