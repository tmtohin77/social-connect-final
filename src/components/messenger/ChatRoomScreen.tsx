import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Phone, Video, Loader2, Image, Smile, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { playSound } from '../../lib/sounds'; // ✅ সাউন্ড ইমপোর্ট করা হলো

interface ChatRoomProps {
  receiver: any;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
  onStartCall: (isVideo: boolean) => void;
}

const ChatRoomScreen: React.FC<ChatRoomProps> = ({ receiver, onBack, onViewProfile, onStartCall }) => {
  const { user, onlineUsers } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // নিউ ফিচার স্টেট
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOnline = onlineUsers.has(receiver.id);

  useEffect(() => {
    fetchMessages();

    // ✅ রিয়েল-টাইম মেসেজ লিসেনার + সাউন্ড
    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user?.id}` 
      }, (payload) => {
        // যদি এই চ্যাটরুমের সেন্ডার মেসেজ পাঠায়
        if (payload.new.sender_id === receiver.id) {
            setMessages(prev => [...prev, payload.new]);
            playSound('message'); // 🔔 মেসেজ আসলে সাউন্ড হবে
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() && !selectedImage) return;
    
    setSending(true);
    let uploadedImageUrl = null;

    try {
        // ১. ছবি আপলোড (যদি থাকে)
        if (selectedImage) {
            const fileName = `chat_${Date.now()}_${Math.random()}`;
            await supabase.storage.from('chat_images').upload(fileName, selectedImage);
            const { data } = supabase.storage.from('chat_images').getPublicUrl(fileName);
            uploadedImageUrl = data.publicUrl;
        }

        const msgContent = newMessage;
        
        // Optimistic Update
        const msg = {
            sender_id: user?.id,
            receiver_id: receiver.id,
            content: msgContent,
            image_url: uploadedImageUrl || (selectedImage ? imagePreview : null),
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, msg]);
        scrollToBottom();
        
        // Reset Inputs
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setShowEmoji(false);

        // Database Insert
        await supabase.from('messages').insert({
            sender_id: user?.id,
            receiver_id: receiver.id,
            content: msgContent,
            image_url: uploadedImageUrl
        });

    } catch (error) {
        console.error('Error sending message:', error);
    } finally {
        setSending(false);
    }
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
            
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(receiver.id)}>
                <div className="relative">
                    <img src={receiver.avatar} className="w-10 h-10 rounded-full border dark:border-gray-600 object-cover" />
                    {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                    )}
                </div>
                <div>
                    <h3 className="font-bold text-sm dark:text-white hover:underline">{receiver.name}</h3>
                    <span className={`text-xs ${isOnline ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                        {isOnline ? 'Active now' : 'Offline'}
                    </span>
                </div>
            </div>
        </div>
        
        {/* Call Buttons */}
        <div className="flex gap-4 text-blue-600 dark:text-blue-400 pr-2">
            <button onClick={() => onStartCall(false)} className="hover:bg-blue-50 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"><Phone size={22} /></button>
            <button onClick={() => onStartCall(true)} className="hover:bg-blue-50 dark:hover:bg-gray-700 p-2 rounded-full transition-colors"><Video size={24} /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900" onClick={() => setShowEmoji(false)}>
        {messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden
                        ${isMe 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border dark:border-gray-700 rounded-bl-none'
                        }`}>
                        
                        {msg.image_url && (
                            <img src={msg.image_url} alt="Sent" className="w-full h-auto max-h-60 object-cover" />
                        )}
                        
                        {msg.content && (
                            <div className="px-4 py-2 text-sm break-words">{msg.content}</div>
                        )}
                    </div>
                </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 relative">
        
        {/* Image Preview */}
        {imagePreview && (
            <div className="absolute bottom-16 left-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg border dark:border-gray-600">
                <img src={imagePreview} className="h-20 w-auto rounded-lg" />
                <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12}/></button>
            </div>
        )}

        {/* Emoji Picker */}
        {showEmoji && (
            <div className="absolute bottom-20 left-0 sm:left-4 z-50">
                <EmojiPicker onEmojiClick={onEmojiClick} height={350} />
            </div>
        )}

        <form onSubmit={sendMessage} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-1.5 rounded-3xl transition-colors">
            <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-gray-500 hover:text-yellow-500 transition-colors">
                <Smile size={24} />
            </button>

            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-green-500 transition-colors">
                <Image size={24} />
            </button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />

            <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-transparent px-2 py-2 focus:outline-none text-sm dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button 
                type="submit" 
                disabled={(!newMessage.trim() && !selectedImage) || sending} 
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