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
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const isGroup = receiver.type === 'group';

  // UI States
  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Audio States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Delete State
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`room:${receiver.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        // DELETE Event
        if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
            return;
        }
        
        // INSERT Event
        const newMsg = payload.new;
        let isMatch = false;
        if (isGroup) {
            isMatch = newMsg.group_id === receiver.id;
        } else {
            isMatch = (newMsg.sender_id === receiver.id && newMsg.receiver_id === user?.id) ||
                      (newMsg.sender_id === user?.id && newMsg.receiver_id === receiver.id);
        }

        if (isMatch) {
            setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
            if (newMsg.sender_id !== user?.id) playSound('message');
            scrollToBottom();
        }
      })
      .subscribe();

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
    if (window.confirm("Delete this message?")) {
        await supabase.from('messages').delete().eq('id', msgId);
        setMessages(prev => prev.filter(m => m.id !== msgId));
        setSelectedMessageId(null);
    }
  };

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
            const { error: upErr } = await supabase.storage.from('post_images').upload(fileName, fileToUpload);
            if (upErr) throw upErr;
            const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
            uploadedUrl = data.publicUrl;
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

        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setShowEmoji(false);

        const { error } = await supabase.from('messages').insert(msgData);
        if (error) throw error;

    } catch (error) {
        console.error("Failed to send:", error);
    } finally {
        setSending(false);
    }
  };

  // --- Voice Handlers ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleSendMessage(undefined, 'audio', 'Sent a voice message', audioBlob);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) { alert('Microphone blocked'); }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        setIsRecording(false);
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        const file = e.target.files[0];
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const renderMessageContent = (msg: any, isMe: boolean) => {
    const isSelected = selectedMessageId === msg.id;

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

    return (
      <div 
        className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}
        onClick={() => isMe && setSelectedMessageId(isSelected ? null : msg.id)}
      >
        {/* Delete Button Popup */}
        {isSelected && isMe && (
            <button onClick={() => deleteMessage(msg.id)} className="absolute -top-8 bg-black/80 text-white px-3 py-1 rounded-lg text-xs flex items-center gap-1 hover:bg-red-600 transition z-10">
                <Trash2 size={12} /> Delete
            </button>
        )}

        <div className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden cursor-pointer
          ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border dark:border-gray-700 rounded-bl-none'}`}>
          
          {msg.image_url && msg.type === 'image' && <img src={msg.image_url} alt="Sent" className="w-full h-auto max-h-60 object-cover" />}
          
          {msg.type === 'audio' && (
             <div className="px-3 py-2 flex items-center gap-2">
                <audio controls src={msg.image_url} className="h-8 w-48" />
             </div>
          )}

          {msg.content && msg.type !== 'image' && msg.type !== 'audio' && (
            <div className="px-4 py-2 text-sm break-words whitespace-pre-wrap">{msg.content}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 fixed inset-0 z-50 transition-colors">
      <div className="bg-white dark:bg-gray-900 p-3 shadow-sm flex items-center justify-between border-b dark:border-gray-800">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white"><ArrowLeft size={22} /></button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isGroup && onViewProfile && onViewProfile(receiver.id)}>
                <div className="relative">
                    <img src={receiver.avatar} className={`w-10 h-10 border dark:border-gray-600 object-cover ${isGroup ? 'rounded-xl' : 'rounded-full'}`} />
                    {!isGroup && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>}
                </div>
                <div>
                    <h3 className="font-bold text-sm dark:text-white">{receiver.name}</h3>
                    <span className="text-xs text-green-600">{isGroup ? 'Group Chat' : 'Active now'}</span>
                </div>
            </div>
        </div>
        {!isGroup && (
            <div className="flex gap-4 text-blue-600 dark:text-blue-400 pr-2">
                <button onClick={() => onStartCall && onStartCall(false)}><Phone size={22}/></button>
                <button onClick={() => onStartCall && onStartCall(true)}><Video size={24}/></button>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950" onClick={() => {setShowEmoji(false); setSelectedMessageId(null);}}>
        {messages.map((msg, idx) => (
            <React.Fragment key={idx}>{renderMessageContent(msg, msg.sender_id === user?.id)}</React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white dark:bg-gray-900 border-t dark:border-gray-800 relative">
        {imagePreview && (
            <div className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg border z-10">
                <img src={imagePreview} className="h-24 w-auto rounded-lg" />
                <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={14}/></button>
            </div>
        )}
        {showEmoji && <div className="absolute bottom-20 left-0 sm:left-4 z-50"><EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} height={350} /></div>}

        <form onSubmit={(e) => handleSendMessage(e, 'text')} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-3xl border dark:border-gray-700">
            <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-gray-500"><Smile size={24} /></button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500"><ImageIcon size={24} /></button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent px-2 py-2 focus:outline-none text-sm dark:text-white" />
            
            {newMessage.trim() || selectedImage ? (
                <button type="submit" disabled={sending} className="p-2 bg-blue-600 text-white rounded-full flex justify-center w-10 h-10 shadow-md">
                    {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                </button>
            ) : (
                <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`p-2 rounded-full text-white w-10 h-10 flex justify-center items-center ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-600'}`}>
                    {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                </button>
            )}
        </form>
      </div>
    </div>
  );
};

export default ChatRoomScreen;