'use client';

// ═══════════════════════════════════════════════════════════════
// AI Copilot Page - واجهة كاملة للـ AI
// History of conversations, Saved prompts, Settings
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';
import {
  Bot,
  Send,
  User,
  Sparkles,
  Settings,
  Trash2,
  Clock,
  ChevronDown,
  Plus,
  Bookmark,
  History,
  X,
  Save,
  FileText,
  BarChart3,
  Users,
  Building2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import AIChatMessage, { ChatMessage } from '@/components/ai/AIChatMessage';
import AIQuickActions, { QuickAction } from '@/components/ai/AIQuickActions';

// API URL
const API_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102');

// Types
type ContextType = 'general' | 'leads' | 'properties' | 'deals' | 'analytics';
type QuickActionContext = 'general' | 'lead' | 'client' | 'property' | 'deal';

// Map context to quick action context
const mapToQuickActionContext = (ctx: ContextType): QuickActionContext => {
  const mapping: Record<ContextType, QuickActionContext> = {
    general: 'general',
    leads: 'lead',
    properties: 'property',
    deals: 'deal',
    analytics: 'general',
  };
  return mapping[ctx] || 'general';
};

interface SavedPrompt {
  id: string;
  title: string;
  prompt: string;
  context: ContextType;
  createdAt: Date;
}

interface Conversation {
  id: string;
  messages: ChatMessage[];
  context: ContextType;
  createdAt: Date;
  title: string;
}

interface AISettings {
  temperature: number;
  maxTokens: number;
  autoSave: boolean;
  showQuickActions: boolean;
}

// Context options
const CONTEXT_OPTIONS: { value: ContextType; label: string; icon: any }[] = [
  { value: 'general', label: 'عام', icon: Bot },
  { value: 'leads', label: 'العملاء المحتملين', icon: Users },
  { value: 'properties', label: 'العقارات', icon: Building2 },
  { value: 'deals', label: 'الصفقات', icon: FileText },
  { value: 'analytics', label: 'التحليلات', icon: BarChart3 },
];

// Default settings
const DEFAULT_SETTINGS: AISettings = {
  temperature: 0.7,
  maxTokens: 2048,
  autoSave: true,
  showQuickActions: true,
};

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(7);

export default function AICopilotPage() {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ContextType>('general');
  const [showContextSelect, setShowContextSelect] = useState(false);

  // Sidebar state
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'prompts' | 'settings'>('chat');
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);

  // Modal state
  const [showSavePromptModal, setShowSavePromptModal] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [currentPromptToSave, setCurrentPromptToSave] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load data from localStorage
  useEffect(() => {
    // Load chat history
    const savedHistory = localStorage.getItem('ai-copilot-history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (parsed.length > 0) {
          setMessages(
            parsed.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp),
            }))
          );
        }
      } catch (e) {
        console.error('Failed to load chat history:', e);
      }
    }

    // Load saved prompts
    const savedPromptsData = localStorage.getItem('ai-copilot-prompts');
    if (savedPromptsData) {
      try {
        const parsed = JSON.parse(savedPromptsData);
        setSavedPrompts(
          parsed.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt),
          }))
        );
      } catch (e) {
        console.error('Failed to load saved prompts:', e);
      }
    }

    // Load conversations
    const savedConversations = localStorage.getItem('ai-copilot-conversations');
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        setConversations(
          parsed.map((c: any) => ({
            ...c,
            createdAt: new Date(c.createdAt),
          }))
        );
      } catch (e) {
        console.error('Failed to load conversations:', e);
      }
    }

    // Load settings
    const savedSettings = localStorage.getItem('ai-copilot-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  // Save chat history
  useEffect(() => {
    if (settings.autoSave && messages.length > 0) {
      localStorage.setItem('ai-copilot-history', JSON.stringify(messages.slice(-100)));
    }
  }, [messages, settings.autoSave]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('ai-copilot-settings', JSON.stringify(settings));
  }, [settings]);

  // Save conversation
  const saveConversation = useCallback(() => {
    if (messages.length === 0) return;

    const newConversation: Conversation = {
      id: generateId(),
      messages,
      context,
      createdAt: new Date(),
      title: messages[0]?.content.slice(0, 50) || 'محادثة جديدة',
    };

    const updated = [newConversation, ...conversations.slice(0, 19)];
    setConversations(updated);
    localStorage.setItem('ai-copilot-conversations', JSON.stringify(updated));
  }, [messages, context, conversations]);

  // Load conversation
  const loadConversation = useCallback((conv: Conversation) => {
    setMessages(conv.messages);
    setContext(conv.context);
    setActiveTab('chat');
  }, []);

  // Delete conversation
  const deleteConversation = useCallback((id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    localStorage.setItem('ai-copilot-conversations', JSON.stringify(updated));
  }, [conversations]);

  // Save prompt
  const savePrompt = useCallback(() => {
    if (!newPromptTitle.trim() || !currentPromptToSave.trim()) return;

    const newPrompt: SavedPrompt = {
      id: generateId(),
      title: newPromptTitle,
      prompt: currentPromptToSave,
      context,
      createdAt: new Date(),
    };

    const updated = [newPrompt, ...savedPrompts];
    setSavedPrompts(updated);
    localStorage.setItem('ai-copilot-prompts', JSON.stringify(updated));

    setShowSavePromptModal(false);
    setNewPromptTitle('');
    setCurrentPromptToSave('');
  }, [newPromptTitle, currentPromptToSave, context, savedPrompts]);

  // Delete prompt
  const deletePrompt = useCallback((id: string) => {
    const updated = savedPrompts.filter((p) => p.id !== id);
    setSavedPrompts(updated);
    localStorage.setItem('ai-copilot-prompts', JSON.stringify(updated));
  }, [savedPrompts]);

  // Send message with SSE streaming
  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setError(null);
    setInput('');

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      context,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Create abort controller for streaming
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_URL}/api/v1/ai/copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: text }],
          context: { type: context },
          stream: true,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('فشل في الاتصال بالخادم');
      }

      // Create assistant message placeholder
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        context,
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Read stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id
                        ? { ...m, content: m.content + data.content }
                        : m
                    )
                  );
                }
                if (data.done) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessage.id
                        ? { ...m, isStreaming: false }
                        : m
                    )
                  );
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled
      } else {
        setError(err.message || 'حدث خطأ أثناء معالجة طلبك');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Handle quick action
  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  // Cancel streaming
  const cancelStream = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  };

  // Clear history
  const clearHistory = () => {
    // Save current conversation before clearing
    if (messages.length > 0) {
      saveConversation();
    }
    setMessages([]);
    localStorage.removeItem('ai-copilot-history');
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Open save prompt modal
  const openSavePromptModal = (prompt: string) => {
    setCurrentPromptToSave(prompt);
    setNewPromptTitle('');
    setShowSavePromptModal(true);
  };

  return (
    <PermissionGate permissions={[PERMISSIONS.AI_USE]}>
      <div className="h-[calc(100vh-120px)] flex animate-fade-in">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 hidden lg:flex flex-col">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800">
            {[
              { id: 'chat', icon: Bot, label: 'المحادثة' },
              { id: 'history', icon: History, label: 'السجل' },
              { id: 'prompts', icon: Bookmark, label: 'المحفوظات' },
              { id: 'settings', icon: Settings, label: 'الإعدادات' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">المحادثات السابقة</h3>
                  {messages.length > 0 && (
                    <button
                      onClick={saveConversation}
                      className="text-xs text-purple-600 hover:text-purple-700"
                    >
                      حفظ الحالية
                    </button>
                  )}
                </div>
                {conversations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">لا توجد محادثات سابقة</p>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
                      onClick={() => loadConversation(conv)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {conv.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {conv.messages.length} رسالة • {conv.createdAt.toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conv.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Prompts Tab */}
            {activeTab === 'prompts' && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">النصوص المحفوظة</h3>
                {savedPrompts.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    لا توجد نصوص محفوظة. يمكنك حفظ أي نص من المحادثة.
                  </p>
                ) : (
                  savedPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer group"
                      onClick={() => {
                        sendMessage(prompt.prompt);
                        setActiveTab('chat');
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {prompt.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{prompt.prompt}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePrompt(prompt.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">إعدادات AI</h3>

                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الإبداعية (Temperature): {settings.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) =>
                      setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    قيمة أعلى = إجابات أكثر إبداعاً
                  </p>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    أقصى طول للإجابة: {settings.maxTokens} كلمة
                  </label>
                  <input
                    type="range"
                    min="512"
                    max="4096"
                    step="256"
                    value={settings.maxTokens}
                    onChange={(e) =>
                      setSettings({ ...settings, maxTokens: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>

                {/* Auto Save */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">حفظ تلقائي</span>
                  <button
                    onClick={() => setSettings({ ...settings, autoSave: !settings.autoSave })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.autoSave ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Show Quick Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">إظهار الإجراءات السريعة</span>
                  <button
                    onClick={() =>
                      setSettings({ ...settings, showQuickActions: !settings.showQuickActions })
                    }
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.showQuickActions ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        settings.showQuickActions ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Reset Settings */}
                <button
                  onClick={() => setSettings(DEFAULT_SETTINGS)}
                  className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 inline ml-2" />
                  إعادة الإعدادات الافتراضية
                </button>
              </div>
            )}

            {/* Chat Tab (default) - Context Selector */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">سياق المحادثة</h3>
                <div className="space-y-2">
                  {CONTEXT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setContext(opt.value)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-right transition-colors ${
                          context === opt.value
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-sm">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Copilot</h1>
                  <p className="text-sm text-gray-500">مساعدك الذكي لإدارة المكتب العقاري</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile Context Selector */}
                <div className="relative lg:hidden">
                  <button
                    onClick={() => setShowContextSelect(!showContextSelect)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                  >
                    {(() => {
                      const ctx = CONTEXT_OPTIONS.find((c) => c.value === context);
                      const Icon = ctx?.icon || Bot;
                      return (
                        <>
                          <Icon className="w-4 h-4" />
                          <span className="text-sm">{ctx?.label}</span>
                          <ChevronDown className="w-4 h-4" />
                        </>
                      );
                    })()}
                  </button>
                  {showContextSelect && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[200px]">
                      {CONTEXT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setContext(opt.value);
                              setShowContextSelect(false);
                            }}
                            className={`w-full flex items-center gap-2 px-4 py-2 text-right hover:bg-gray-50 dark:hover:bg-gray-800 ${
                              context === opt.value
                                ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
                                : ''
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Clear History */}
                {messages.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="مسح المحادثة"
                  >
                    <Trash2 className="w-5 h-5 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  مرحباً! أنا AI Copilot
                </h2>
                <p className="text-gray-500 mb-6 max-w-md">
                  مساعدك الذكي لإدارة المكتب العقاري. يمكنني مساعدتك في تحليل البيانات، اقتراح
                  أفضل الممارسات، والإجابة على استفساراتك.
                </p>

                {/* Quick Actions */}
                {settings.showQuickActions && (
                  <div className="w-full max-w-2xl">
                    <AIQuickActions onActionClick={handleQuickAction} context={mapToQuickActionContext(context)} />
                  </div>
                )}
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <AIChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </div>

          {/* Quick Actions (when there are messages) */}
          {messages.length > 0 && settings.showQuickActions && (
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
              <AIQuickActions onActionClick={handleQuickAction} context={mapToQuickActionContext(context)} compact />
            </div>
          )}

          {/* Input */}
          <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="اكتب سؤالك هنا..."
                  rows={1}
                  className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 
                    bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500
                    placeholder:text-gray-400"
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                  disabled={isLoading}
                />
              </div>

              {/* Save Prompt Button */}
              {input.trim() && (
                <button
                  onClick={() => openSavePromptModal(input)}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  title="حفظ النص"
                >
                  <Bookmark className="w-5 h-5 text-gray-500" />
                </button>
              )}

              {isLoading ? (
                <button
                  onClick={cancelStream}
                  className="px-4 py-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors"
                >
                  إلغاء
                </button>
              ) : (
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="px-4 py-3 rounded-xl bg-gradient-to-l from-purple-500 to-blue-500 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              AI Copilot قد يُنتج معلومات غير دقيقة. تحقق من المعلومات المهمة.
            </p>
          </div>
        </div>

        {/* Save Prompt Modal */}
        {showSavePromptModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">حفظ النص</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    عنوان النص
                  </label>
                  <input
                    type="text"
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                    placeholder="مثال: متابعة العملاء الجدد"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    النص
                  </label>
                  <textarea
                    value={currentPromptToSave}
                    onChange={(e) => setCurrentPromptToSave(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowSavePromptModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={savePrompt}
                  disabled={!newPromptTitle.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-4 h-4 inline ml-2" />
                  حفظ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
