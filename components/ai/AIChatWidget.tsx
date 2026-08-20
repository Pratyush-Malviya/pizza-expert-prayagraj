'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot } from 'lucide-react';
import { useStoreStore } from '@/lib/store/useStoreStore';

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export default function AIChatWidget() {
  const { activeStoreId } = useStoreStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', parts: [{ text: "Hi! I'm your virtual pizza assistant. How can I help you today?" }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input.trim() }] };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/order-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newMessages, storeId: activeStoreId })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages([...newMessages, { role: 'model', parts: [{ text: data.reply }] }]);
      } else {
        setMessages([...newMessages, { role: 'model', parts: [{ text: 'Sorry, I am having trouble connecting right now.' }] }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'model', parts: [{ text: 'An error occurred. Please try again later.' }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-[#B91C1C] text-white shadow-lg hover:bg-rose-700 transition-all z-50 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageCircle size={24} />
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 w-[350px] bg-white rounded-2xl shadow-2xl border border-[#E7E0D8] z-50 flex flex-col transition-all duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
        style={{ height: '500px', maxHeight: 'calc(100vh - 48px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#B91C1C] text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <h3 className="font-bold">Pizza Assistant</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FBF9F5]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#1C1917] text-white rounded-tr-none'
                    : 'bg-white border border-[#E7E0D8] text-[#1C1917] rounded-tl-none shadow-sm'
                }`}
              >
                {msg.parts[0].text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E7E0D8] p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-sm text-[#78716C]">
                <Loader2 size={14} className="animate-spin" /> Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-[#E7E0D8] rounded-b-2xl">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about our menu..."
              className="flex-1 px-4 py-2 bg-[#F5F2EC] rounded-xl text-sm text-[#1C1917] placeholder:text-[#A8A29E] caret-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#B91C1C]/20 focus:bg-white transition-all"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-[#1C1917] text-white disabled:opacity-50 hover:bg-[#44403C] transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
