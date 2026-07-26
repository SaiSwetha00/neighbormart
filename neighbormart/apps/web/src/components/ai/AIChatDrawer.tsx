import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS: Record<string, string[]> = {
  OWNER: ["Today's summary", "What's low on stock?", "Staff status", "How's revenue?"],
  MANAGER: ["What needs attention?", "Low stock list", "Pending orders"],
  STAFF: ["Find a product", "How to process return?", "Check stock"],
};

export function AIChatDrawer() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const role = user?.role?.toUpperCase() || 'STAFF';

  useEffect(() => {
    if (open) {
      setUnread(0);
      api.get('/ai/conversation').then(res => {
        const msgs = res.data?.data?.messages || [];
        setMessages(msgs);
      }).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { message: text });
      const reply = res.data?.data?.reply || 'Sorry, I could not respond.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'AI service unavailable. Please check your ANTHROPIC_API_KEY.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    await api.delete('/ai/conversation').catch(() => {});
    setMessages([]);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 transition-transform hover:scale-110 focus:outline-none"
        aria-label="Open AI Assistant"
      >
        <Bot className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative flex h-[600px] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-white">
              <Sparkles className="h-5 w-5" />
              <div className="flex-1">
                <p className="font-semibold text-sm">NeighborMart AI</p>
                <p className="text-[10px] opacity-80 uppercase tracking-wide">{role} mode</p>
              </div>
              <button onClick={clearChat} className="rounded p-1 hover:bg-white/20" title="Clear chat"><Trash2 className="h-4 w-4" /></button>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/20"><X className="h-4 w-4" /></button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-sm text-slate-400 mt-8">
                  <Bot className="h-10 w-10 mx-auto mb-2 text-indigo-300" />
                  <p>Hi! I'm your AI assistant.</p>
                  <p className="text-xs mt-1">Ask me anything about the store.</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-2">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Quick prompts */}
            {messages.length === 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1">
                {(QUICK_PROMPTS[role] || QUICK_PROMPTS['STAFF']).map(p => (
                  <button key={p} onClick={() => sendMessage(p)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-3 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage(input))}
                placeholder="Ask anything..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <Button size="sm" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
