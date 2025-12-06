import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Phone, Video } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatRoomProps {
  receiver: any;
  onBack: () => void;
}

const ChatRoomScreen: React.FC<ChatRoomProps> = ({ receiver, onBack }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();

    // Real-time Subscription (নতুন মেসেজ আসলে অটোমেটিক দেখাবে)
    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user?.id}` // কেউ আমাকে মেসেজ পাঠালে
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

    const msg = {
        sender_id: user?.id,
        receiver_id: receiver.id,
        content: newMessage,
        created_at: new Date().toISOString() // Optimistic update এর জন্য
    };

    // Optimistic UI Update (সাথে সাথে দেখাবে)
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    scrollToBottom();

    // Database Insert
    await supabase.from('messages').insert({
        sender_id: user?.id,
        receiver_id: receiver.id,
        content: msg.content
    });
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 fixed inset-0 z-50">
      {/* Header */}
      <div className="bg-white p-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={22} /></button>
            <div className="relative">
                <img src={receiver.avatar} className="w-10 h-10 rounded-full border" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div>
                <h3 className="font-bold text-sm">{receiver.name}</h3>
                <span className="text-xs text-green-600">Active now</span>
            </div>
        </div>
        <div className="flex gap-3 text-blue-600 pr-2">
            <Phone size={22} />
            <Video size={22} />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}>
                        {msg.content}
                    </div>
                </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t">
        <form onSubmit={sendMessage} className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-full">
            <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-4 py-2 focus:outline-none text-sm"
            />
            <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:scale-100 transition-all active:scale-95">
                <Send size={18} />
            </button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoomScreen;