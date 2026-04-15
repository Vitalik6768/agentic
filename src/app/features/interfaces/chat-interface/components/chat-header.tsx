'use client';

import { Bot, Sparkles } from 'lucide-react';

export function ChatHeader() {
  return (
    <div className="flex items-center gap-3 p-4 border-b">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Bot className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <p className="text-sm text-muted-foreground">
          Ask me anything about your website analytics and content
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span>Powered by AI</span>
      </div>
    </div>
  );
}