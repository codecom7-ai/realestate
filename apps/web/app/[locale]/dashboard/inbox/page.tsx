'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { MessageSquare, Search, Phone, User, ChevronLeft } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';

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
  lastMessageAt: string;
  lastMessage?: {
    content: string;
    sentAt: string;
  };
  createdAt: string;
}

interface ConversationCounts {
  active: number;
  closed: number;
  archived: number;
  totalUnread: number;
}

export default function InboxPage() {
  const t = useTranslations('inbox');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [counts, setCounts] = useState<ConversationCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [statusFilter, search, page]);

  const loadData = async () => {
    try {
      const [conversationsRes, countsRes] = await Promise.all([
        apiClient.getConversations({
          status: statusFilter === 'all' ? undefined : (statusFilter as any),
          ...(search && search.length >= 2 ? { search } : {}),
          page,
          limit: 20,
        }),
        apiClient.getConversationCounts(),
      ]);

      setConversations(conversationsRes.data?.data || []);
      setCounts(countsRes.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayName = (conv: Conversation) => {
    if (conv.client) {
      return `${conv.client.firstName} ${conv.client.lastName}`;
    }
    if (conv.lead?.client) {
      return `${conv.lead.client.firstName} ${conv.lead.client.lastName}`;
    }
    return conv.externalId || t('unknown');
  };

  const getDisplayPhone = (conv: Conversation) => {
    if (conv.client?.phone) return conv.client.phone;
    if (conv.lead?.client?.phone) return conv.lead.client.phone;
    return conv.externalId;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'الآن';
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-EG');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };
    const labels: Record<string, string> = {
      active: 'نشط',
      closed: 'مغلق',
      archived: 'مؤرشف',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return (
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Filters & Search */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-3">
        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('allStatuses')} ({counts?.active || 0})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              statusFilter === 'active'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('statusOpen')} ({counts?.active || 0})
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              statusFilter === 'closed'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('statusResolved')} ({counts?.closed || 0})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-10 pr-10 pl-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-12 h-12" />}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/dashboard/inbox/${conv.id}`}
                className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Avatar */}
                {getChannelIcon(conv.channel)}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {getDisplayName(conv)}
                    </span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{getDisplayPhone(conv)}</span>
                    {getStatusBadge(conv.status)}
                  </div>

                  {conv.lastMessage && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conv.lastMessage.content}
                    </p>
                  )}
                </div>

                {/* Unread Badge */}
                {conv.unreadCount > 0 && (
                  <span className="bg-primary text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    {conv.unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
