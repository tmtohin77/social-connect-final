import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Phone, Video, Loader2, Image as ImageIcon, Smile, X, Mic, StopCircle, Trash2, Pin, MoreVertical, PhoneMissed } from 'lucide-react';
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
  const { user, onlineUsers } = useAuth();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const isGroup = receiver.type === 'group';
  const isActive = !isGroup && onlineUsers.has(receiver.id);

  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
    const channel = supabase.channel(`chat:${receiver.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        } else if (payload.eventType === 'INSERT') {
            const newMsg = payload.new;
            let isMatch = false;
            if (isGroup) isMatch = newMsg.group_id === receiver.id;
            else isMatch = (newMsg.sender_id === receiver.id && newMsg.receiver_id === user?.id) || (newMsg.sender_id === user?.id && newMsg.receiver_id === receiver.id);
            
            if (isMatch) {
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                });
                if (newMsg.sender_id !== user?.id) playSound('message');
                scrollToBottom();
            }
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [receiver.id, isGroup, user?.id]);

  const fetchHistory = async () => {
    let msgQuery = supabase.from('messages').select('*');
    if (isGroup) msgQuery = msgQuery.eq('group_id', receiver.id);
    else msgQuery = msgQuery.or(`and(sender_id.eq.${user?.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${user?.id})`);
    
    const { data: msgs } = await msgQuery;

    let calls: any[] = [];
    if (!isGroup) {
        const { data: callLogs } = await supabase.from('calls').select('*')
            .or(`and(caller_id.eq.${user?.id},receiver_id.eq.${receiver.id}),and(caller_id.eq.${receiver.id},receiver_id.eq.${user?.id})`);
        
        if (callLogs) {
            calls = callLogs.map(c => ({
                id: c.id,
                sender_id: c.caller_id,
                content: c.type === 'missed' ? 'Missed call' : `Call ended (${Math.floor(c.duration/60)}m ${c.duration%60}s)`,
                type: `call_${c.type}`,
                created_at: c.created_at,
                is_call_log: true
            }));
        }
    }

    const combined = [...(msgs || []), ...calls].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setMessages(combined);
    scrollToBottom();
  };

  const handleUnsend = async (msgId: string) => {
    if(window.confirm("Unsend for everyone?")) {
        await supabase.from('messages').delete().eq('id', msgId);
        setActiveMenuId(null);
    }
  };

  const handlePin = async (msg: any) => {
    await supabase.from('messages').update({ is_pinned: !msg.is_pinned }).eq('id', msg.id);
    setActiveMenuId(null);
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
            // ✅ Fix: Check if it's a File object to access 'name'
            let ext = 'webm'; // Default for audio blob
            if (fileToUpload instanceof File) {
                ext = fileToUpload.name.split('.').pop() || 'png';
            }
            
            const fileName = `chat_${Date.now()}_${Math.random()}.${ext}`;
            const { error: upErr } = await supabase.storage.from('post_images').upload(fileName, fileToUpload);
            if (upErr) throw upErr;
            
            // ✅ Fix: Add timestamp to avoid caching issues
            const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
            uploadedUrl = `${data.publicUrl}?t=${Date.now()}`;
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

        setNewMessage(''); setSelectedImage(null); setImagePreview(null); setShowEmoji(false);
        if (type === 'text') playSound('message');

        const { error } = await supabase.from('messages').insert(msgData);
        if (error) throw error;

    } catch (err) { console.error(err); alert("Failed to send"); } 
    finally { setSending(false); }
  };

  // Voice Handlers
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        recorder.ondataavailable = e => { if(e.data.size > 0) audioChunksRef.current.push(e.data); };
        recorder.onstop = () => {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            handleSendMessage(undefined, 'audio', 'Voice message', blob);
        };
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
    } catch(e) { alert("Microphone blocked"); }
  };

  const stopRecording = () => {
    if(mediaRecorder && isRecording) { mediaRecorder.stop(); setIsRecording(false); mediaRecorder.stream.getTracks().forEach(t => t.stop()); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        const file = e.target.files[0];
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    }
  };

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  // --- Render Message ---
  const renderMessageContent = (msg: any, isMe: boolean) => {
    if (msg.type?.startsWith('call_')) {
      return (
        <div className="flex justify-center my-3 w-full">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-xs text-gray-500 dark:text-gray-400 border dark:border-gray-700">
            {msg.type === 'call_video' ? <Video size={14} /> : <Phone size={14} />}
            <span>{msg.content}</span>
            <span className="opacity-60">• {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      );
    }

    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2 group w-full relative items-center`}>
            
            {/* 3-Dot Menu Button */}
            {isMe && (
                <div className="relative mr-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === msg.id ? null : msg.id);
                        }} 
                        className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
                    >
                        <MoreVertical size={14} />
                    </button>
                    
                    {activeMenuId === msg.id && (
                        <div className="absolute bottom-8 right-0 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-1 w-32 border dark:border-gray-700 z-50">
                            <button onClick={(e) => { e.stopPropagation(); handleUnsend(msg.id); }} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 flex gap-2 items-center">
                                <Trash2 size={14} /> Unsend
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handlePin(msg); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex gap-2 items-center">
                                <Pin size={14} /> {msg.is_pinned ? 'Unpin' : 'Pin'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Message Bubble */}
            <div className={`relative max-w-[70%] rounded-2xl p-1 overflow-hidden shadow-sm
                ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-none'}`}>
                
                {msg.is_pinned && <div className="absolute top-1 right-1 z-10"><Pin size={10} className="fill-current rotate-45" /></div>}

                {/* ✅ Image Render (with key to force refresh) */}
                {msg.image_url && msg.type === 'image' && (
                    <img 
                        key={msg.image_url} 
                        src={msg.image_url} 
                        alt="attachment"
                        className="w-full h-auto rounded-xl object-cover max-h-60" 
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                )}
                
                {msg.type === 'audio' && (
                    <div className="px-3 py-2 flex items-center gap-2">
                        <audio controls src={msg.image_url} className="h-8 w-48" />
                    </div>
                )}

                {msg.content && msg.type !== 'image' && msg.type !== 'audio' && (
                    <div className="px-4 py-2 text-sm break-words whitespace-pre-wrap">{msg.content}</div>
                )}
            </div>

            {/* 3-Dot for Receiver */}
            {!isMe && (
                <div className="relative ml-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); }} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500">
                        <MoreVertical size={14} />
                    </button>
                    {activeMenuId === msg.id && (
                        <div className="absolute bottom-8 left-0 bg-white dark:bg-gray-800 shadow-xl rounded-lg py-1 w-32 border dark:border-gray-700 z-50">
                            <button onClick={(e) => { e.stopPropagation(); handlePin(msg); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 flex gap-2 items-center">
                                <Pin size={14} /> {msg.is_pinned ? 'Unpin' : 'Pin'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 fixed inset-0 z-[60] transition-colors">
      <div className="bg-white dark:bg-gray-900 p-3 shadow-sm flex items-center justify-between border-b dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white"><ArrowLeft size={22} /></button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isGroup && onViewProfile && onViewProfile(receiver.id)}>
                <div className="relative">
                    <img src={receiver.avatar} className={`w-10 h-10 border dark:border-gray-600 object-cover ${isGroup ? 'rounded-xl' : 'rounded-full'}`} />
                    {!isGroup && isActive && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>}
                </div>
                <div>
                    <h3 className="font-bold text-sm dark:text-white">{receiver.name}</h3>
                    <span className={`text-xs ${isActive ? 'text-green-600 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>{isGroup ? 'Group Chat' : (isActive ? 'Active now' : 'Offline')}</span>
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

      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-950" onClick={() => {setShowEmoji(false); setActiveMenuId(null);}}>
        {messages.map((msg, idx) => <React.Fragment key={idx}>{renderMessageContent(msg, msg.sender_id === user?.id)}</React.Fragment>)}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white dark:bg-gray-900 border-t dark:border-gray-800 shrink-0 relative">
        {imagePreview && (
            <div className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg border dark:border-gray-600 z-10">
                <img src={imagePreview} className="h-20 w-auto rounded-lg object-cover" />
                <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12}/></button>
            </div>
        )}
        {showEmoji && <div className="absolute bottom-20 left-0 sm:left-4 z-50 shadow-xl rounded-2xl overflow-hidden"><EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} height={350} /></div>}

        <form onSubmit={(e) => handleSendMessage(e, 'text')} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-3xl border dark:border-gray-700">
            <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-gray-500 hover:text-yellow-500"><Smile size={24} /></button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-green-500"><ImageIcon size={24} /></button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={isGroup ? `Message ${receiver.name}...` : "Type a message..."} className="flex-1 bg-transparent px-2 py-2 focus:outline-none text-sm dark:text-white placeholder-gray-500 dark:placeholder-gray-400" />
            
            {newMessage.trim() || selectedImage ? (
                <button type="submit" disabled={sending} className="p-2 bg-blue-600 text-white rounded-full flex justify-center w-10 h-10 shadow-md hover:bg-blue-700">
                    {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                </button>
            ) : (
                <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`p-2 rounded-full text-white w-10 h-10 flex justify-center items-center shadow-md transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
                </button>
            )}
        </form>
      </div>
    </div>
  );
};

export default ChatRoomScreen;