'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowRight, Phone, User, Send, MoreVertical, X, Check, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  contentType: string;
  mediaUrl?: string;
  status: string;
  sentAt: string;
}

interface Conversation {
  id: string;
  channel: string;
  status: string;
  externalId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  lead?: {
    id: string;
    stage: string;
    client?: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  unreadCount: number;
  messages: Message[];
}

export default function ConversationDetailPage() {
  const t = useTranslations('inbox');
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversation();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const loadConversation = async () => {
    try {
      const response = await apiClient.getConversation(conversationId, 100);
      setConversation(response.data);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getDisplayName = () => {
    if (conversation?.client) {
      return `${conversation.client.firstName} ${conversation.client.lastName}`;
    }
    if (conversation?.lead?.client) {
      return `${conversation.lead.client.firstName} ${conversation.lead.client.lastName}`;
    }
    return conversation?.externalId || t('unknown');
  };

  const getDisplayPhone = () => {
    if (conversation?.client?.phone) return conversation.client.phone;
    if (conversation?.lead?.client?.phone) return conversation.lead.client.phone;
    return conversation?.externalId;
  };

  const sendMessage = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await apiClient.sendConversationMessage(conversationId, message.trim());
      setMessage('');
      await loadConversation();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = async () => {
    try {
      await apiClient.closeConversation(conversationId);
      router.push('/inbox');
    } catch (error) {
      console.error('Failed to close conversation:', error);
    }
  };

  const handleReopen = async () => {
    try {
      await apiClient.reopenConversation(conversationId);
      loadConversation();
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to reopen conversation:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: Record<string, Message[]> = {};
    messages.forEach((msg) => {
      const dateKey = formatDate(msg.sentAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(msg);
    });
    return groups;
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">{t('conversationNotFound')}</p>
          <Link href="/inbox" className="text-primary mt-2 inline-block">
            {t('backToInbox')}
          </Link>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(conversation.messages || []);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/inbox" className="p-1 hover:bg-gray-100 rounded">
          <ArrowRight className="w-5 h-5 text-gray-600" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="font-medium text-gray-900 truncate">{getDisplayName()}</h1>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="w-3 h-3" />
            <span>{getDisplayPhone()}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full ${
                conversation.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {conversation.status === 'active' ? 'نشط' : 'مغلق'}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>

          {showMenu && (
            <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-40 z-10">
              {conversation.client?.id && (
                <Link
                  href={`/dashboard/clients/${conversation.client.id}`}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm"
                  onClick={() => setShowMenu(false)}
                >
                  <User className="w-4 h-4" />
                  عرض العميل
                </Link>
              )}
              {conversation.status === 'active' && (
                <button
                  onClick={handleClose}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm w-full text-right text-red-600"
                >
                  <X className="w-4 h-4" />
                  إغلاق المحادثة
                </button>
              )}
              {conversation.status === 'closed' && (
                <button
                  onClick={handleReopen}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm w-full text-right text-green-600"
                >
                  <Check className="w-4 h-4" />
                  إعادة فتح
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(messageGroups).map(([date, msgs]) => (
          <div key={date}>
            {/* Date Divider */}
            <div className="flex items-center justify-center mb-4">
              <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                {date}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-3">
              {msgs.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      msg.direction === 'inbound'
                        ? 'bg-white text-gray-900 rounded-tr-none'
                        : 'bg-primary text-white rounded-tl-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        msg.direction === 'inbound' ? 'justify-start' : 'justify-end'
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          msg.direction === 'inbound' ? 'text-gray-400' : 'text-white/70'
                        }`}
                      >
                        {formatTime(msg.sentAt)}
                      </span>
                      {msg.direction === 'outbound' && (
                        <Check
                          className={`w-3 h-3 ${
                            msg.status === 'read' ? 'text-white' : 'text-white/50'
                          }`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {conversation.status === 'active' && (
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={t('typeMessage')}
              className="flex-1 h-10 px-4 bg-gray-100 rounded-full text-sm focus:ring-2 focus:ring-primary/20"
              disabled={isSending}
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim() || isSending}
              className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Closed Banner */}
      {conversation.status === 'closed' && (
        <div className="bg-gray-100 border-t border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-600">
            هذه المحادثة مغلقة
            <button
              onClick={handleReopen}
              className="text-primary font-medium mr-2 hover:underline"
            >
              إعادة فتح
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
