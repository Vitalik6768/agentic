'use client';

import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
  isLoading?: boolean;
}

// Function to detect if content contains HTML tags
const containsHTML = (text: string): boolean => {
  const htmlRegex = /<[^>]*>/;
  return htmlRegex.test(text);
};

// Function to safely sanitize and render HTML
const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img', 'div', 'span',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
    ALLOW_DATA_ATTR: false,
  });
};

export function ChatMessage({ message, isUser, timestamp, isLoading }: ChatMessageProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isHTML = containsHTML(message);
  const sanitizedHTML = isHTML && isClient ? sanitizeHTML(message) : message;

  return (
    <div className={cn(
      'flex gap-3 p-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      <div className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn(
        'flex-1 space-y-1',
        isUser ? 'text-right' : 'text-left'
      )}>
        <div className={cn(
          'inline-block max-w-[80%] rounded-lg px-4 py-2 text-sm',
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        )}>
          {!isUser && isLoading ? (
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.2s]" />
              <span className="h-2 w-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.1s]" />
              <span className="h-2 w-2 rounded-full bg-current opacity-60 animate-bounce" />
            </div>
          ) : isHTML && isClient ? (
            <div 
              dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
              className="prose prose-sm max-w-none dark:prose-invert"
            />
          ) : (
            message
          )}
        </div>
        {timestamp && (
          <div className="text-xs text-muted-foreground">
            {timestamp.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}