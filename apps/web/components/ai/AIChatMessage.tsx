'use client';

// ═══════════════════════════════════════════════════════════════
// AI Chat Message - Component لعرض رسالة AI أو User
// RTL support, Markdown rendering, Copy button
// ═══════════════════════════════════════════════════════════════

import { useState, memo } from 'react';
import { User, Bot, Copy, Check, Clock, Sparkles } from 'lucide-react';

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: string;
  isStreaming?: boolean;
}

interface AIChatMessageProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
}

// Simple markdown-like rendering (for RTL)
const renderContent = (content: string): React.ReactNode => {
  // Handle code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      const codeMatch = part.match(/```(\w+)?\n?([\s\S]*?)```/);
      if (codeMatch) {
        const [, lang, code] = codeMatch;
        return (
          <pre
            key={index}
            className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 my-2 overflow-x-auto text-left text-sm font-mono"
            dir="ltr"
          >
            {code?.trim()}
          </pre>
        );
      }
    }

    // Handle inline code
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={index}>
        {inlineParts.map((inlinePart, inlineIndex) => {
          if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
            return (
              <code
                key={inlineIndex}
                className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                dir="ltr"
              >
                {inlinePart.slice(1, -1)}
              </code>
            );
          }

          // Handle bold
          const boldParts = inlinePart.split(/(\*\*[^*]+\*\*)/g);
          return boldParts.map((boldPart, boldIndex) => {
            if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
              return (
                <strong key={boldIndex} className="font-bold">
                  {boldPart.slice(2, -2)}
                </strong>
              );
            }

            // Handle line breaks
            return boldPart.split('\n').map((line, lineIndex, lines) => (
              <span key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 && <br />}
              </span>
            ));
          });
        })}
      </span>
    );
  });
};

const AIChatMessage = memo(function AIChatMessage({ message, onCopy }: AIChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      onCopy?.(message.content);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming && !message.content;

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
          isUser
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'
            : 'bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 text-white shadow-md'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-sm'
            : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-tl-sm'
        }`}
      >
        {/* Content */}
        <div
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            isUser ? 'text-white' : 'text-gray-800 dark:text-gray-200'
          }`}
        >
          {isStreaming ? (
            <span className="inline-flex items-center gap-2 text-purple-600">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="animate-pulse">جاري التفكير...</span>
            </span>
          ) : (
            renderContent(message.content)
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center gap-2 mt-2 pt-2 border-t ${
            isUser
              ? 'border-white/20 text-white/70'
              : 'border-gray-100 dark:border-gray-700 text-gray-400'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span className="text-xs">
            {message.timestamp.toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>

          {/* Copy button for assistant messages */}
          {!isUser && message.content && !isStreaming && (
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 mr-auto text-xs transition-all duration-200 ${
                copied
                  ? 'text-emerald-500'
                  : 'hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>نسخ</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default AIChatMessage;
