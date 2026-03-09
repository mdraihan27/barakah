import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../../LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { chatAPI } from '../../../api/chat';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Avatar from '../../../components/ui/Avatar';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

export default function ChatRoom() {
  const { id } = useParams();
  const { isBangla } = useLanguage();
  const { user, tokens } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('');
  const [otherAvatar, setOtherAvatar] = useState('');
  const [otherId, setOtherId] = useState('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const myId = user?._id || user?.id;

  const mergeMessage = useCallback((incoming) => {
    setMessages((prev) => {
      const messageId = incoming?._id || incoming?.id;
      if (!messageId) return prev;
      const idx = prev.findIndex((m) => (m._id || m.id) === messageId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...incoming };
        return next;
      }
      return [...prev, incoming];
    });
  }, []);

  const applySeenBy = useCallback((seenByUserId) => {
    if (!seenByUserId) return;
    setMessages((prev) => prev.map((message) => {
      if ((message.sender_id || message.sender) !== myId) return message;
      const seenBy = Array.isArray(message.seen_by) ? message.seen_by : [];
      if (seenBy.includes(seenByUserId)) return message;
      return { ...message, seen_by: [...seenBy, seenByUserId] };
    }));
  }, [myId]);

  useEffect(() => {
    (async () => {
      try {
        const [msgRes, convRes] = await Promise.all([
          chatAPI.getMessages(id),
          chatAPI.getConversation(id),
        ]);
        setMessages(msgRes.data.messages || []);

        const conv = convRes.data || {};
        if (conv?.participants) {
          const other = conv.participants.find(p => (p._id || p.id) !== (user?._id || user?.id));
          if (other) {
            setOtherName(`${other.first_name || ''} ${other.last_name || ''}`.trim());
            setOtherAvatar(other.avatar_url || '');
            setOtherId(other._id || other.id || '');
          }
        }

        await chatAPI.markConversationRead(id).catch(() => null);
      } catch {
        toast.error('Could not load messages');
        navigate('/dashboard/chat');
      } finally { setLoading(false); }
    })();
  }, [id, user, navigate]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!id || !tokens?.access_token) return undefined;

    const ws = new WebSocket(chatAPI.conversationWsUrl(id, tokens.access_token));
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'message.new' && data.payload) {
          mergeMessage(data.payload);
          const senderId = data.payload.sender_id;
          if (senderId && senderId !== myId) {
            await chatAPI.markConversationRead(id).catch(() => null);
          }
        }

        if (data?.type === 'message.seen') {
          applySeenBy(data.payload?.seen_by);
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
  }, [id, tokens?.access_token, myId, mergeMessage, applySeenBy]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const pendingText = text.trim();
      await chatAPI.sendMessage(id, pendingText);
      setText('');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to send');
    } finally { setSending(false); }
  };

  const isMyMessage = useCallback((msg) => {
    return msg.sender_id === user?._id || msg.sender_id === user?.id || msg.sender === user?._id;
  }, [user?._id, user?.id]);

  const lastSeenOutgoingMessageId = useMemo(() => {
    if (!otherId) return null;
    let found = null;
    for (const message of messages) {
      const mine = isMyMessage(message);
      if (!mine) continue;
      const seenBy = Array.isArray(message.seen_by) ? message.seen_by : [];
      if (seenBy.includes(otherId)) {
        found = message._id || message.id;
      }
    }
    return found;
  }, [messages, otherId, isMyMessage]);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
        {/* header */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-200/50 dark:border-white/[0.06] mb-4">
          <button onClick={() => navigate('/dashboard/chat')}
            className="p-1 text-muted hover:text-body transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <Avatar name={otherName || 'U'} src={otherAvatar} size="sm" />
          <h2 className="text-[16px] font-semibold text-heading truncate">{otherName || (isBangla ? 'চ্যাট' : 'Chat')}</h2>
        </div>

        {/* messages */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {loading ? (
            <LoadingSpinner size="lg" className="py-20" />
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[13px] text-muted">{isBangla ? 'কোনো মেসেজ নেই' : 'No messages yet'}</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const mine = isMyMessage(msg);
              const messageId = msg._id || msg.id || i;
              const showSeen = mine && lastSeenOutgoingMessageId && messageId === lastSeenOutgoingMessageId;
              return (
                <div key={messageId} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  {!mine && (
                    <Avatar name={otherName || 'U'} src={otherAvatar} size="xs" className="self-end mr-2 mb-1" />
                  )}
                  <div>
                    <div className={`min-w-[150px] sm:min-w-[180px] max-w-[92vw] sm:max-w-[88%] rounded-2xl px-4 py-2.5 ${
                      mine
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-white/80 dark:bg-white/[0.06] border border-stone-200/60 dark:border-white/[0.08] text-body rounded-bl-md'
                    }`}>
                      <p className="text-[13px] whitespace-pre-wrap break-words">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-muted'}`}>
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                    {showSeen && (
                      <p className="text-[11px] text-muted mt-1 px-1">Seen</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* input */}
        <form onSubmit={handleSend} className="mt-4 flex gap-3">
          <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} autoFocus
            className="flex-1 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-3 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            placeholder={isBangla ? 'মেসেজ লিখুন...' : 'Type a message...'} />
          <button type="submit" disabled={!text.trim() || sending}
            className="rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-3 text-white disabled:opacity-40 transition hover:shadow-lg hover:shadow-emerald-600/20">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
