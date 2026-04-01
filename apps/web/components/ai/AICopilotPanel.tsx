'use client';

// ═══════════════════════════════════════════════════════════════
// AI Copilot Floating Panel - لوحة المساعد الذكي العائمة
// Floating button + Side panel with streaming SSE
// ═══════════════════════════════════════════════════════════════

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  memo,
} from 'react';
import {
  Bot,
  Send,
  X,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import AIChatMessage, { ChatMessage } from './AIChatMessage';
import AIQuickActions, { QuickAction } from './AIQuickActions';

// API URL
const API_URL = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102');

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(7);

// Context types
type PageContext = 'lead' | 'client' | 'property' | 'deal' | 'general';

interface AICopilotPanelProps {
  initialContext?: PageContext;
  entityId?: string;
}

const AICopilotPanel = memo(function AICopilotPanel({
  initialContext = 'general',
  entityId,
}: AICopilotPanelProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentContext, setCurrentContext] = useState<PageContext>(initialContext);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ai-copilot-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-copilot-history', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  // Detect current page context from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/leads')) {
        setCurrentContext('lead');
      } else if (path.includes('/clients')) {
        setCurrentContext('client');
      } else if (path.includes('/properties')) {
        setCurrentContext('property');
      } else if (path.includes('/deals')) {
        setCurrentContext('deal');
      } else {
        setCurrentContext('general');
      }
    }
  }, []);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        !isExpanded &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        // Don't close on mobile, just on desktop
        if (window.innerWidth >= 1024) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isExpanded]);

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
      context: currentContext,
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
          context: { type: currentContext, entityId },
          stream: true,
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
        context: currentContext,
        isStreaming: true,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Read SSE stream
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
                // Ignore parsing errors for incomplete chunks
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

  // Handle quick action click
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

  // Navigate to full page
  const goToFullPage = () => {
    window.location.href = '/dashboard/ai-copilot';
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 lg:bottom-6 end-6 z-40 w-14 h-14 rounded-full 
          bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 
          text-white shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-300 hover:scale-110
          ${isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
        aria-label="فتح المساعد الذكي"
      >
        <Bot className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
      </button>

      {/* Panel Overlay (Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Side Panel */}
      <div
        ref={panelRef}
        className={`fixed z-50 bg-white dark:bg-gray-900 shadow-2xl
          transition-all duration-300 ease-out
          ${isExpanded
            ? 'inset-4 lg:inset-8 rounded-2xl'
            : isOpen
              ? 'bottom-0 left-0 right-0 h-[85vh] rounded-t-3xl lg:top-auto lg:bottom-6 lg:end-6 lg:start-auto lg:w-[400px] lg:h-[600px] lg:rounded-2xl'
              : 'opacity-0 pointer-events-none translate-y-full lg:translate-y-0 lg:-translate-x-full'
          }
          flex flex-col overflow-hidden`}
        style={{
          transform: isOpen ? 'translateY(0) translateX(0)' : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-l from-purple-500 via-blue-500 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold">AI Copilot</h2>
              <p className="text-xs text-white/70">مساعدك الذكي</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Expand/Collapse */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label={isExpanded ? 'تصغير' : 'تكبير'}
            >
              {isExpanded ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>

            {/* Open in full page */}
            <button
              onClick={goToFullPage}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="فتح في صفحة كاملة"
            >
              <ExternalLink className="w-5 h-5" />
            </button>

            {/* Clear history */}
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="مسح المحادثة"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            {/* Close */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                مرحباً! كيف أقدر أساعدك؟
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                اسألني أي شيء عن العملاء أو العقارات أو الصفقات
              </p>

              {/* Quick Actions */}
              <div className="w-full max-w-sm">
                <AIQuickActions
                  onActionClick={handleQuickAction}
                  context={currentContext}
                />
              </div>
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
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Quick Actions (when there are messages) */}
        {messages.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <AIQuickActions
              onActionClick={handleQuickAction}
              context={currentContext}
              compact
            />
          </div>
        )}

        {/* Input */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اكتب سؤالك هنا..."
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-200 dark:border-gray-700 
                  bg-gray-50 dark:bg-gray-800 px-4 py-3 text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500
                  placeholder:text-gray-400"
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={isLoading}
              />
            </div>
            {isLoading ? (
              <button
                onClick={cancelStream}
                className="px-4 py-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                إلغاء
              </button>
            ) : (
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="px-4 py-3 rounded-xl bg-gradient-to-l from-purple-500 to-blue-500 
                  text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export default AICopilotPanel;
