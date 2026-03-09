import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { useChat } from '../../../context/ChatContext';
import { chatAPI } from '../../../api/chat';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Avatar from '../../../components/ui/Avatar';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';

export default function Conversations() {
  const { isBangla } = useLanguage();
  const { user } = useAuth();
  const { eventTick } = useChat();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await chatAPI.getConversations();
      setConversations(res.data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (eventTick > 0) {
      loadConversations(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventTick]);

  const getOtherParticipant = (conv) => {
    if (!conv.participants) return { name: 'User', id: '' };
    const other = conv.participants.find(p => p._id !== user?._id && p.id !== user?._id);
    if (other) {
      return {
        name: `${other.first_name || ''} ${other.last_name || ''}`.trim() || 'User',
        id: other._id || other.id,
        avatarUrl: other.avatar_url,
      };
    }
    return { name: conv.participant_name || 'User', id: '' };
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <h1 className="font-cerialebaran text-[24px] text-heading mb-6">
          {isBangla ? 'মেসেজ' : 'Messages'}
        </h1>

        {loading ? (
          <LoadingSpinner size="lg" className="py-20" />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<svg className="w-12 h-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
            title={isBangla ? 'কোনো মেসেজ নেই' : 'No Conversations'}
            description={isBangla ? 'দোকান থেকে মেসেজ পাঠান।' : 'Start a conversation from a shop page.'}
          />
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const convId = conv._id || conv.id;
              const other = getOtherParticipant(conv);
              const unreadCount = Number(conv.unread_count || 0);
              const hasUnseen = unreadCount > 0;
              return (
                <Link key={convId} to={`/dashboard/chat/${convId}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardBody>
                      <div className="flex items-center gap-3">
                        <Avatar name={other.name} src={other.avatarUrl} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[14px] font-semibold text-heading truncate">{other.name}</h3>
                            {conv.last_message_at && (
                              <span className="text-[11px] text-muted flex-shrink-0 ml-2">
                                {new Date(conv.last_message_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          {conv.last_message ? (
                            <div className="mt-0.5 flex items-center gap-2">
                              {hasUnseen && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                              <p className={`text-[12px] truncate ${hasUnseen ? 'text-heading font-medium' : 'text-muted'}`}>
                                {conv.last_message}
                              </p>
                            </div>
                          ) : <p className="text-[12px] text-muted truncate mt-0.5">No messages yet</p>}
                        </div>
                        {hasUnseen && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
