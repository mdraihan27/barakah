import { useState, useEffect, useRef, useCallback } from 'react';
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherName, setOtherName] = useState('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [msgRes, convRes] = await Promise.all([
          chatAPI.getMessages(id),
          chatAPI.getConversations().catch(() => ({ data: [] })),
        ]);
        setMessages(msgRes.data.messages || msgRes.data || []);

        // find other participant name
        const convs = convRes.data.conversations || convRes.data || [];
        const conv = convs.find(c => (c._id || c.id) === id);
        if (conv?.participants) {
          const other = conv.participants.find(p => (p._id || p.id) !== (user?._id || user?.id));
          if (other) setOtherName(`${other.first_name || ''} ${other.last_name || ''}`.trim());
        }
        if (!otherName && conv?.participant_name) setOtherName(conv.participant_name);
      } catch {
        toast.error('Could not load messages');
        navigate('/dashboard/chat');
      } finally { setLoading(false); }
    })();
  }, [id, user, navigate, otherName]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // poll for new messages every 5s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await chatAPI.getMessages(id);
        setMessages(res.data.messages || res.data || []);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await chatAPI.sendMessage(id, text.trim());
      const newMsg = res.data;
      setMessages((prev) => [...prev, newMsg]);
      setText('');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to send');
    } finally { setSending(false); }
  };

  const isMyMessage = (msg) => {
    return msg.sender_id === user?._id || msg.sender_id === user?.id || msg.sender === user?._id;
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
        {/* header */}
        <div className="flex items-center gap-3 pb-4 border-b border-stone-200/50 dark:border-white/[0.06] mb-4">
          <button onClick={() => navigate('/dashboard/chat')}
            className="p-1 text-muted hover:text-body transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <Avatar name={otherName || 'U'} size="sm" />
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
              return (
                <div key={msg._id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    mine
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-white/80 dark:bg-white/[0.06] border border-stone-200/60 dark:border-white/[0.08] text-body rounded-bl-md'
                  }`}>
                    <p className="text-[13px] whitespace-pre-wrap break-words">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'text-white/60' : 'text-muted'}`}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
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
