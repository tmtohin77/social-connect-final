import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Phone, Video, Loader2, Image as ImageIcon, Smile, X, Mic, StopCircle } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';

// Simple sound player
const playSound = (type: 'message') => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

interface ChatRoomProps {
  receiver: any; // User or Group object
  onBack: () => void;
  onViewProfile?: (userId: string) => void;
  onStartCall?: (isVideo: boolean) => void;
}

const ChatRoomScreen: React.FC<ChatRoomProps> = ({ receiver, onBack, onViewProfile, onStartCall }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // চেক করো এটা গ্রুপ চ্যাট কিনা
  const isGroup = receiver.type === 'group';

  // Advanced Features
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();

    // Real-time Subscription (Updated for Group)
    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: isGroup ? `group_id=eq.${receiver.id}` : `receiver_id=eq.${user?.id}`
      }, (payload) => {
        if (isGroup) {
            // গ্রুপ চ্যাটের জন্য: যদি এই গ্রুপের মেসেজ হয়
            if (payload.new.group_id === receiver.id) {
                setMessages(prev => [...prev, payload.new]);
                scrollToBottom();
            }
        } else {
            // পার্সোনাল চ্যাটের জন্য: যদি এই সেন্ডার পাঠায়
            if (payload.new.sender_id === receiver.id) {
                setMessages(prev => [...prev, payload.new]);
                playSound('message'); 
                scrollToBottom();
            }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [receiver.id]);

  const fetchMessages = async () => {
    let query = supabase.from('messages').select('*').order('created_at', { ascending: true });

    if (isGroup) {
        query = query.eq('group_id', receiver.id);
    } else {
        query = query.or(`and(sender_id.eq.${user?.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${user?.id})`);
    }
    
    const { data } = await query;
    if (data) {
        setMessages(data);
        scrollToBottom();
    }
  };

  // --- Voice Recording Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = sendVoiceMessage;
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert('Microphone permission denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const sendVoiceMessage = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const fileName = `voice_${Date.now()}.webm`;
    
    try {
      // 1. Upload Audio
      await supabase.storage.from('post_images').upload(fileName, audioBlob);
      const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
      const audioUrl = data.publicUrl;

      // 2. Prepare Data (Group Logic Added)
      const msgData: any = {
        sender_id: user?.id,
        content: 'Sent a voice message',
        type: 'audio',
        image_url: audioUrl,
        created_at: new Date().toISOString()
      };

      if (isGroup) {
        msgData.group_id = receiver.id;
        msgData.receiver_id = null;
      } else {
        msgData.receiver_id = receiver.id;
        msgData.group_id = null;
      }

      // 3. Optimistic UI
      setMessages(prev => [...prev, msgData]);
      scrollToBottom();

      // 4. Save to DB
      await supabase.from('messages').insert(msgData);

    } catch (error) {
      console.error('Error sending voice note:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const sendMessage = async (e?: React.FormEvent, type: string = 'text', customContent?: string) => {
    e?.preventDefault();
    const content = customContent || newMessage;
    if (!content.trim() && !selectedImage) return;
    
    setSending(true);
    let uploadedImageUrl = null;

    try {
        if (selectedImage) {
            const fileName = `chat_${Date.now()}_${Math.random()}`;
            await supabase.storage.from('post_images').upload(fileName, selectedImage); 
            const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
            uploadedImageUrl = data.publicUrl;
            type = 'image';
        }

        const msgData: any = {
            sender_id: user?.id,
            content: type === 'image' ? 'Sent a photo' : content,
            type: type,
            image_url: uploadedImageUrl || (selectedImage ? imagePreview : null),
            created_at: new Date().toISOString()
        };

        // Handle Group vs Single
        if (isGroup) {
            msgData.group_id = receiver.id;
            msgData.receiver_id = null;
        } else {
            msgData.receiver_id = receiver.id;
            msgData.group_id = null;
        }

        setMessages(prev => [...prev, msgData]);
        scrollToBottom();
        if (type === 'text') playSound('message');

        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setShowEmoji(false);

        await supabase.from('messages').insert(msgData);

    } catch (error) {
        console.error(error);
    } finally {
        setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const renderMessageContent = (msg: any, isMe: boolean) => {
    if (msg.type?.startsWith('call_')) {
      return (
        <div className="flex flex-col items-center justify-center my-4 w-full">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-xs text-gray-500 dark:text-gray-400 border dark:border-gray-700">
            {msg.type === 'call_video' ? <Video size={14} /> : <Phone size={14} />}
            <span>{msg.content}</span>
            <span className="opacity-60">• {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      );
    }

    if (msg.type === 'audio') {
      return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div className={`px-3 py-2 rounded-2xl shadow-sm flex items-center gap-2 
            ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border dark:border-gray-700 rounded-bl-none'}`}>
            <audio controls src={msg.image_url} className="h-8 w-48" />
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden 
          ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border dark:border-gray-700 rounded-bl-none'}`}>
          
          {msg.image_url && (
            <img src={msg.image_url} alt="Sent" className="w-full h-auto max-h-60 object-cover" />
          )}
          
          {msg.content && msg.type !== 'image' && (
            <div className="px-4 py-2 text-sm break-words whitespace-pre-wrap">{msg.content}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 fixed inset-0 z-50 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 p-3 shadow-sm flex items-center justify-between border-b dark:border-gray-800">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white transition-colors"><ArrowLeft size={22} /></button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isGroup && onViewProfile && onViewProfile(receiver.id)}>
                <div className="relative">
                    <img src={receiver.avatar} className={`w-10 h-10 border dark:border-gray-600 object-cover ${isGroup ? 'rounded-xl' : 'rounded-full'}`} />
                    {!isGroup && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>}
                </div>
                <div>
                    <h3 className="font-bold text-sm dark:text-white">{receiver.name}</h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {isGroup ? 'Group Chat' : 'Active now'}
                    </span>
                </div>
            </div>
        </div>
        
        {/* Call Buttons (Only for personal chat) */}
        {!isGroup && (
            <div className="flex gap-4 text-blue-600 dark:text-blue-400 pr-2">
                <button onClick={() => onStartCall && onStartCall(false)} className="hover:bg-blue-50 dark:hover:bg-gray-800 p-2 rounded-full"><Phone size={22} /></button>
                <button onClick={() => onStartCall && onStartCall(true)} className="hover:bg-blue-50 dark:hover:bg-gray-800 p-2 rounded-full"><Video size={24} /></button>
            </div>
        )}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950" onClick={() => setShowEmoji(false)}>
        {messages.map((msg, idx) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <React.Fragment key={idx}>
                {renderMessageContent(msg, isMe)}
              </React.Fragment>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-gray-900 border-t dark:border-gray-800 relative">
        {imagePreview && (
            <div className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg border dark:border-gray-600 z-10">
                <img src={imagePreview} className="h-24 w-auto rounded-lg object-cover" />
                <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X size={14}/></button>
            </div>
        )}
        
        {showEmoji && (
            <div className="absolute bottom-20 left-0 sm:left-4 z-50 shadow-2xl rounded-2xl overflow-hidden">
                <EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} height={350} />
            </div>
        )}

        <form onSubmit={(e) => sendMessage(e, 'text')} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-3xl transition-colors border dark:border-gray-700">
            <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-gray-500 hover:text-yellow-500 transition-colors"><Smile size={24} /></button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-green-500 transition-colors"><ImageIcon size={24} /></button>
            
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
            
            <input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder={isGroup ? `Message ${receiver.name}...` : "Type a message..."} 
                className="flex-1 bg-transparent px-2 py-2 focus:outline-none text-sm dark:text-white placeholder-gray-500 dark:placeholder-gray-400" 
            />
            
            {/* Mic / Send Button */}
            {newMessage.trim() || selectedImage ? (
                <button type="submit" disabled={sending} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:scale-95 flex justify-center w-10 h-10 shadow-md transition-all">
                    {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                </button>
            ) : (
                <button 
                    type="button" 
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    className={`p-2 rounded-full text-white w-10 h-10 flex justify-center items-center shadow-md transition-all ${isRecording ? 'bg-red-500 scale-110 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                </button>
            )}
        </form>
      </div>
    </div>
  );
};

export default ChatRoomScreen;