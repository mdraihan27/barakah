import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { chatAPI } from '../api/chat';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { isAuthenticated, tokens } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [eventTick, setEventTick] = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (!isAuthenticated || !tokens?.access_token) {
        setUnreadTotal(0);
        return;
      }
      try {
        const res = await chatAPI.getUnreadSummary();
        if (mounted) {
          setUnreadTotal(res.data?.total_unread || 0);
        }
      } catch {
        if (mounted) setUnreadTotal(0);
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

    const wsUrl = chatAPI.userWsUrl(tokens.access_token);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'chat.unread') {
          setUnreadTotal(data.payload?.total_unread || 0);
          setEventTick((v) => v + 1);
        }
      } catch {
        // ignore malformed events
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

  const value = useMemo(() => ({ unreadTotal, setUnreadTotal, eventTick }), [unreadTotal, eventTick]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
