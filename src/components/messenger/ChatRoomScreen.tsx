import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Phone, Video, Loader2 } from 'lucide-react';

interface ChatRoomProps {
  receiver: any;
  onBack: () => void;
}

const ChatRoomScreen: React.FC<ChatRoomProps> = ({ receiver, onBack }) => {
  const { user, onlineUsers } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOnline = onlineUsers.has(receiver.id);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user?.id}` 
      }, (payload) => {
        if (payload.new.sender_id === receiver.id) {
            setMessages(prev => [...prev, payload.new]);
            scrollToBottom();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [receiver.id]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${user?.id})`)
      .order('created_at', { ascending: true });
    
    if (data) {
        setMessages(data);
        scrollToBottom();
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);

    const msgContent = newMessage;
    setNewMessage(''); // Clear input fast

    const msg = {
        sender_id: user?.id,
        receiver_id: receiver.id,
        content: msgContent,
        created_at: new Date().toISOString()
    };

    // Optimistic UI Update
    setMessages(prev => [...prev, msg]);
    scrollToBottom();

    await supabase.from('messages').insert({
        sender_id: user?.id,
        receiver_id: receiver.id,
        content: msgContent
    });
    setSending(false);
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 fixed inset-0 z-50 transition-colors">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-3 shadow-sm flex items-center justify-between border-b dark:border-gray-700">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-white transition-colors">
                <ArrowLeft size={22} />
            </button>
            <div className="relative">
                <img src={receiver.avatar} className="w-10 h-10 rounded-full border dark:border-gray-600 object-cover" />
                {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                )}
            </div>
            <div>
                <h3 className="font-bold text-sm dark:text-white">{receiver.name}</h3>
                <span className={`text-xs ${isOnline ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                    {isOnline ? 'Active now' : 'Offline'}
                </span>
            </div>
        </div>
        <div className="flex gap-4 text-blue-600 dark:text-blue-400 pr-2">
            <button className="hover:bg-blue-50 dark:hover:bg-gray-700 p-2 rounded-full"><Phone size={22} /></button>
            <button className="hover:bg-blue-50 dark:hover:bg-gray-700 p-2 rounded-full"><Video size={24} /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
        {messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm break-words
                        ${isMe 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border dark:border-gray-700 rounded-bl-none'
                        }`}>
                        {msg.content}
                    </div>
                </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <form onSubmit={sendMessage} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-full transition-colors">
            <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-sm dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim() && !sending} 
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:scale-100 transition-all active:scale-95 flex items-center justify-center w-10 h-10"
            >
                {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoomScreen;