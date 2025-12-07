import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Phone, Video, Loader2, Image as ImageIcon, Smile, X, Mic, StopCircle, Trash2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';

const playSound = (type: 'message') => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
  audio.volume = 0.5;
  audio.play().catch(() => {});
};

interface ChatRoomProps {
  receiver: any;
  onBack: () => void;
  onViewProfile?: (userId: string) => void;
  onStartCall?: (isVideo: boolean) => void;
}

const ChatRoomScreen: React.FC<ChatRoomProps> = ({ receiver, onBack, onViewProfile, onStartCall }) => {
  const { user, onlineUsers } = useAuth(); // ✅ onlineUsers added
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const isGroup = receiver.type === 'group';

  // Active Status Logic
  const isActive = !isGroup && onlineUsers.has(receiver.id);
  const lastActiveText = !isGroup && !isActive ? 'Offline' : 'Active now'; 

  // ... (Other states same as before)
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ Message Delete State
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    const channel = supabase.channel(`chat:${receiver.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        } else if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            // ... (Same logic as before for checking group/user match)
            let isMatch = false;
            if (isGroup) isMatch = newMsg.group_id === receiver.id;
            else isMatch = (newMsg.sender_id === receiver.id && newMsg.receiver_id === user?.id) || (newMsg.sender_id === user?.id && newMsg.receiver_id === receiver.id);
            
            if (isMatch) {
                setMessages(prev => [...prev, newMsg]);
                if (newMsg.sender_id !== user?.id) playSound('message');
                scrollToBottom();
            }
        }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [receiver.id]);

  const fetchMessages = async () => {
    let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
    if (isGroup) query = query.eq('group_id', receiver.id);
    else query = query.or(`and(sender_id.eq.${user?.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${user?.id})`);
    const { data } = await query;
    if (data) { setMessages(data); scrollToBottom(); }
  };

  const deleteMessage = async (msgId: string) => {
    if(window.confirm("Unsend this message?")) {
        await supabase.from('messages').delete().eq('id', msgId);
        setSelectedMsgId(null);
    }
  };

  // ... (handleImageSelect, startRecording, stopRecording, sendVoiceMessage same as previous)
  // ... (Upload and Send Logic same, ensure bucket is 'post_images' for simplicity)

  const handleSendMessage = async (e?: React.FormEvent, type: string = 'text', customContent?: string, fileBlob?: Blob) => {
    e?.preventDefault();
    const content = customContent || newMessage;
    if (!content.trim() && !selectedImage && !fileBlob) return;
    
    setSending(true);
    let uploadedUrl = null;

    try {
        const fileToUpload = fileBlob || selectedImage;
        if (fileToUpload) {
            const ext = type === 'audio' ? 'webm' : 'png';
            const fileName = `chat_${Date.now()}_${Math.random()}.${ext}`;
            const { data, error } = await supabase.storage.from('post_images').upload(fileName, fileToUpload);
            if (error) throw error;
            const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(fileName);
            uploadedUrl = urlData.publicUrl;
        }

        const msgData = {
            sender_id: user?.id,
            receiver_id: isGroup ? null : receiver.id,
            group_id: isGroup ? receiver.id : null,
            content: type === 'image' ? 'Sent a photo' : content,
            type: type,
            image_url: uploadedUrl || (selectedImage ? imagePreview : null),
            created_at: new Date().toISOString()
        };

        // UI Reset
        setNewMessage(''); setSelectedImage(null); setImagePreview(null); setShowEmoji(false);
        // DB Insert
        await supabase.from('messages').insert(msgData);
    } catch (err) { console.error(err); alert('Failed to send'); } 
    finally { setSending(false); }
  };

  // Scroll
  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const renderMessageContent = (msg: any, isMe: boolean) => {
    const isSelected = selectedMsgId === msg.id;
    return (
        <div 
            className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 relative group`}
            onClick={() => isMe && setSelectedMsgId(isSelected ? null : msg.id)}
        >
            {/* Delete Popup */}
            {isSelected && isMe && (
                <div className="absolute -top-8 bg-black/80 text-white px-3 py-1 rounded-lg text-xs cursor-pointer z-10 flex gap-1 items-center" onClick={() => deleteMessage(msg.id)}>
                    <Trash2 size={12}/> Unsend
                </div>
            )}

            <div className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden 
                ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border dark:border-gray-700 rounded-bl-none'}`}>
                
                {msg.image_url && msg.type === 'image' && <img src={msg.image_url} className="w-full h-auto max-h-60 object-cover" />}
                
                {msg.type === 'audio' && <div className="px-3 py-2"><audio controls src={msg.image_url} className="h-8 w-48" /></div>}

                {msg.content && msg.type !== 'image' && msg.type !== 'audio' && <div className="px-4 py-2 text-sm break-words">{msg.content}</div>}
            </div>
        </div>
    );
  };

  // (Helper functions for image/audio input same as before...)
  // Just use handleSendMessage in form submit

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 fixed inset-0 z-50 transition-colors">
      <div className="bg-white dark:bg-gray-900 p-3 shadow-sm flex items-center justify-between border-b dark:border-gray-800">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white"><ArrowLeft size={22} /></button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isGroup && onViewProfile && onViewProfile(receiver.id)}>
                <div className="relative">
                    <img src={receiver.avatar} className={`w-10 h-10 border dark:border-gray-600 object-cover ${isGroup ? 'rounded-xl' : 'rounded-full'}`} />
                    {!isGroup && isActive && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>}
                </div>
                <div>
                    <h3 className="font-bold text-sm dark:text-white">{receiver.name}</h3>
                    <span className={`text-xs ${isActive ? 'text-green-600 font-bold' : 'text-gray-500'}`}>{isGroup ? 'Group Chat' : (isActive ? 'Active now' : 'Offline')}</span>
                </div>
            </div>
        </div>
        {/* Call Buttons... (Same) */}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-950" onClick={() => {setShowEmoji(false); setSelectedMsgId(null);}}>
        {messages.map((msg, idx) => <React.Fragment key={idx}>{renderMessageContent(msg, msg.sender_id === user?.id)}</React.Fragment>)}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (Using handleSendMessage) ... (Same UI as before) */}
      <div className="p-3 bg-white dark:bg-gray-900 border-t dark:border-gray-800 relative">
         {/* ... Image Preview, Emoji Picker, Form ... (Copy from previous ChatRoomScreen code I gave, just ensure onSubmit calls handleSendMessage) */}
         <form onSubmit={(e) => handleSendMessage(e)} className="...">
            {/* ... inputs ... */}
         </form>
      </div>
    </div>
  );
};

export default ChatRoomScreen;