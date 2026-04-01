'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Copy,
  RefreshCw,
  User,
  Bot,
  Loader2,
  MessageSquare,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { create } from 'zustand';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════
// Zustand Store for AI Copilot State
// ═══════════════════════════════════════════════════════════════

interface AICopilotStore {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  clearMessages: () => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const useAICopilotStore = create<AICopilotStore>((set) => ({
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  messages: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages];
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      messages[messages.length - 1] = { ...messages[messages.length - 1], content };
    }
    return { messages };
  }),
  clearMessages: () => set({ messages: [] }),
  isExpanded: true,
  setIsExpanded: (expanded) => set({ isExpanded: expanded }),
}));

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export function AICopilotPanel() {
  const toast = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const {
    isOpen,
    setIsOpen,
    messages,
    addMessage,
    updateLastMessage,
    clearMessages,
    isExpanded,
    setIsExpanded,
  } = useAICopilotStore();

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // ═══════════════════════════════════════════════════════════════
  // SSE Streaming Handler
  // ═══════════════════════════════════════════════════════════════

  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setLoading(true);

    // Add empty assistant message for streaming
    const assistantMessageId = (Date.now() + 1).toString();
    addMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

      const response = await fetch(`${apiUrl}/api/v1/ai/copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error('فشل في الاتصال بالخادم');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  updateLastMessage(accumulatedContent);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // If no content was streamed, show a fallback message
      if (!accumulatedContent) {
        updateLastMessage('عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'فشل في إرسال الرسالة');
      updateLastMessage('عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, addMessage, updateLastMessage, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('تم نسخ النص');
  };

  // ═══════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════

  return (
    <div dir="rtl">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-gradient-to-bl from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600'
        }`}
        aria-label={isOpen ? 'إغلاق المساعد' : 'فتح المساعد'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <Sparkles className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div 
          className={`fixed z-40 bg-white shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${
            isExpanded 
              ? 'bottom-24 left-6 w-[95vw] sm:w-[400px] h-[60vh] sm:h-[500px]' 
              : 'bottom-24 left-6 w-[95vw] sm:w-[400px] h-14'
          }`}
          style={{ maxWidth: 'calc(100vw - 48px)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-l from-purple-500 to-blue-500 p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">مساعد AI</h3>
                <p className="text-xs text-white/70">مساعدك الذكي</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearMessages}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="محادثة جديدة"
              >
                <RefreshCw className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title={isExpanded ? 'تصغير' : 'تكبير'}
              >
                {isExpanded ? (
                  <Minimize2 className="w-4 h-4 text-white" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          {isExpanded && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      كيف يمكنني مساعدتك؟
                    </h4>
                    <p className="text-sm text-gray-500 max-w-[250px]">
                      سؤالي عن أي شيء يتعلق بإدارة المكتب العقاري
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === 'user'
                              ? 'bg-primary text-white'
                              : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>

                        {/* Message Content */}
                        <div className={`max-w-[80%] ${message.role === 'user' ? 'text-left' : 'text-right'}`}>
                          <div
                            className={`rounded-2xl px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-primary text-white rounded-tr-sm'
                                : 'bg-white text-gray-900 rounded-tl-sm shadow-sm border border-gray-100'
                            }`}
                          >
                            {message.content ? (
                              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                <span className="text-sm text-gray-400">جارٍ الكتابة...</span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {message.role === 'assistant' && message.content && (
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                onClick={() => handleCopy(message.content)}
                                className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                                title="نسخ"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <span className="text-xs text-gray-400">
                                {message.timestamp.toLocaleTimeString('ar-EG', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="اكتب سؤالك هنا..."
                      className="input w-full resize-none min-h-[44px] max-h-32 py-3 pr-4"
                      rows={1}
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="btn btn-primary h-11 px-4 rounded-xl"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Enter للإرسال • Shift+Enter لسطر جديد
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Hook for external control
// ═══════════════════════════════════════════════════════════════

export function useAICopilot() {
  const { isOpen, setIsOpen, messages, clearMessages } = useAICopilotStore();
  
  return {
    openCopilot: () => setIsOpen(true),
    closeCopilot: () => setIsOpen(false),
    toggleCopilot: () => setIsOpen(!isOpen),
    isOpen,
    messages,
    clearMessages,
  };
}

export default AICopilotPanel;
