import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../../LanguageContext';
import { useAuth } from '../../../context/AuthContext';
import { chatAPI } from '../../../api/chat';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../../components/ui/Card';
import Avatar from '../../../components/ui/Avatar';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import EmptyState from '../../../components/common/EmptyState';

export default function Conversations() {
  const { isBangla } = useLanguage();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await chatAPI.getConversations();
        setConversations(res.data.conversations || res.data || []);
      } catch { setConversations([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const getOtherParticipant = (conv) => {
    if (!conv.participants) return { name: 'User', id: '' };
    const other = conv.participants.find(p => p._id !== user?._id && p.id !== user?._id);
    if (other) return { name: `${other.first_name || ''} ${other.last_name || ''}`.trim() || 'User', id: other._id || other.id };
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
              const lastMsg = conv.last_message;
              return (
                <Link key={convId} to={`/dashboard/chat/${convId}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardBody>
                      <div className="flex items-center gap-3">
                        <Avatar name={other.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[14px] font-semibold text-heading truncate">{other.name}</h3>
                            {lastMsg?.created_at && (
                              <span className="text-[11px] text-muted flex-shrink-0 ml-2">
                                {new Date(lastMsg.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {lastMsg?.text && (
                            <p className="text-[12px] text-muted truncate mt-0.5">{lastMsg.text}</p>
                          )}
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
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
