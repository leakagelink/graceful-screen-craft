// @ts-nocheck -- ported from original app; stricter project tsconfig
import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase, type Message } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button, inputClass } from '@/components/ui';

interface Props {
  bookingId: string;
  onBack: () => void;
}

export default function ChatScreen({ bookingId, onBack }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`messages:${bookingId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setErrorMessage('');
    setInput('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        body,
      })
      .select()
      .single();

    setSending(false);
    if (!error && data) {
      setMessages((prev) => prev.some(m => m.id === data.id) ? prev : [...prev, data as Message]);
    } else {
      setInput(body);
      setErrorMessage(error?.message ?? 'Message could not be sent.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3.5 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">Chat</h1>
            <p className="text-xs text-slate-400">Driver &amp; Shipper conversation</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-md mx-auto w-full">
        {loading ? (
          <div className="text-center text-sm text-slate-400 py-8">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-8">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm animate-fade-in-up ${
                    isMe
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                  }`}
                >
                  <p className="leading-5">{m.body}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMe ? 'text-primary-200' : 'text-slate-400'
                    }`}
                  >
                    {new Date(m.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 p-3"
      >
        {errorMessage && <p role="alert" className="text-error-600 text-sm max-w-md mx-auto mb-2">{errorMessage}</p>}
        <div className="max-w-md mx-auto flex items-center gap-2">
          <input
            className={inputClass}
            placeholder="Type a message…"
            aria-label="Message"
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <Button
            aria-label="Send message"
            type="submit"
            disabled={!input.trim() || sending}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-primary-700 transition-colors"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
