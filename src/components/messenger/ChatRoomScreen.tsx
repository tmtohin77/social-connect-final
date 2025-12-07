import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Send, Phone, Video, Loader2, Image as ImageIcon, Smile, X, Mic, StopCircle, Trash2, Pin, MoreVertical, Check, CheckCheck } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const playSound = (type: 'message' | 'sent') => {
  const file = type === 'message' 
    ? 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' // Incoming
    : 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'; // Outgoing/Sent
  const audio = new Audio(file);
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

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
    markAsSeen(); // চ্যাট ওপেন করলেই সিন হবে

    // Realtime Subscription
    const channel = supabase.channel(`chat:${receiver.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.eventType === 'DELETE') {
            setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
            // স্ট্যাটাস আপডেট (Seen হলে টিক চেঞ্জ হবে)
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
                
                if (newMsg.sender_id !== user?.id) {
                    playSound('message');
                    markAsSeen(); // নতুন মেসেজ আসলে সাথে সাথে সিন মার্ক করবে
                }
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

    // Call Logs logic (Optional)
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

  // ✅ Mark messages as SEEN Logic
  const markAsSeen = async () => {
    if (isGroup) return; // গ্রুপের জন্য লজিক আলাদা হতে পারে
    await supabase.from('messages')
        .update({ status: 'seen' })
        .eq('receiver_id', user?.id)
        .eq('sender_id', receiver.id)
        .eq('status', 'sent'); // শুধু 'sent' গুলোকে 'seen' করবে
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
            let ext = 'webm';
            if (fileToUpload instanceof File) {
                ext = fileToUpload.name.split('.').pop() || 'png';
            }
            
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
            content: (selectedImage ? 'Sent a photo' : content) || 'Sent a file',
            type: selectedImage ? 'image' : type,
            image_url: uploadedUrl || (selectedImage ? imagePreview : null),
            status: 'sent', // Default status
            created_at: new Date().toISOString()
        };

        setNewMessage(''); setSelectedImage(null); setImagePreview(null); setShowEmoji(false);
        playSound('sent');

        const { error } = await supabase.from('messages').insert(msgData);
        if (error) throw error;

    } catch (err) { console.error(err); alert("Failed to send message."); } 
    finally { setSending(false); }
  };

  // ✅ New Toggle Voice Logic
  const toggleRecording = async () => {
    if (isRecording) {
        // Stop Logic
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
            setRecordingDuration(0);
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
    } else {
        // Start Logic
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            
            recorder.ondataavailable = e => { 
                if(e.data.size > 0) audioChunksRef.current.push(e.data); 
            };
            
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                // ১ সেকেন্ডের কম হলে পাঠাবে না (ভুল ক্লিক রোধ করতে)
                if (audioChunksRef.current.length > 0) {
                    handleSendMessage(undefined, 'audio', 'Voice message', blob);
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            
            // Timer
            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch(e) { 
            alert("Microphone permission denied."); 
        }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        const file = e.target.files[0];
        setSelectedImage(file);
        setImagePreview(URL.createObjectURL(file));
    }
  };

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const handleUnsend = async (msgId: string) => {
    if(window.confirm("Unsend for everyone?")) {
        await supabase.from('messages').delete().eq('id', msgId);
        setActiveMenuId(null);
    }
  };

  const renderMessageContent = (msg: any, isMe: boolean) => {
    if (msg.type?.startsWith('call_')) {
      return (
        <div className="flex justify-center my-4 w-full">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-1.5 rounded-full text-xs text-muted-foreground border border-border/50">
            {msg.type === 'call_video' ? <Video size={14} /> : <Phone size={14} />}
            <span>{msg.content}</span>
            <span className="opacity-60">• {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
          </div>
        </div>
      );
    }

    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 group w-full relative items-end gap-2 px-2`}>
            
            {!isMe && <Avatar className="w-6 h-6 mb-1"><AvatarImage src={receiver.avatar}/><AvatarFallback>{receiver.name[0]}</AvatarFallback></Avatar>}

            <div className={`relative max-w-[75%] rounded-2xl p-1 overflow-hidden shadow-sm transition-all
                ${isMe 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-gray-800 border border-border/40 text-foreground rounded-bl-none'}`}>
                
                {/* Images */}
                {msg.image_url && msg.type === 'image' && (
                    <img 
                        src={msg.image_url} 
                        alt="attachment"
                        className="w-full h-auto rounded-xl object-cover max-h-60 min-w-[150px]" 
                        loading="lazy"
                    />
                )}
                
                {/* Audio */}
                {msg.type === 'audio' && (
                    <div className="px-3 py-2 flex items-center gap-2 min-w-[200px]">
                        <audio controls src={msg.image_url} className="h-8 w-full" />
                    </div>
                )}

                {/* Text */}
                {msg.content && msg.type !== 'image' && msg.type !== 'audio' && (
                    <div className="px-4 py-2 text-sm break-words whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                )}

                {/* ✅ Tick System for Sender */}
                {isMe && !isGroup && (
                    <div className="absolute bottom-1 right-2">
                        {msg.status === 'seen' ? (
                            <CheckCheck size={14} className="text-blue-200" strokeWidth={3} />
                        ) : (
                            <Check size={14} className="text-blue-200/70" />
                        )}
                    </div>
                )}
            </div>
            
            {/* Context Menu */}
            <div className={`opacity-0 group-hover:opacity-100 transition-opacity`}>
                 <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}>
                    <MoreVertical size={14} />
                 </Button>
            </div>
            
            {activeMenuId === msg.id && (
                <div className={`absolute bottom-8 ${isMe ? 'right-0' : 'left-8'} bg-popover shadow-xl rounded-lg py-1 w-32 border z-50`}>
                    <button onClick={(e) => { e.stopPropagation(); handleUnsend(msg.id); }} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-muted flex gap-2 items-center">
                        <Trash2 size={14} /> Unsend
                    </button>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 fixed inset-0 z-[60] transition-colors">
      
      {/* Header */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-3 shadow-sm flex items-center justify-between border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
                <ArrowLeft size={22} />
            </Button>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => !isGroup && onViewProfile && onViewProfile(receiver.id)}>
                <div className="relative">
                    <Avatar className={`border-2 border-background ${isGroup ? 'rounded-xl' : ''}`}>
                        <AvatarImage src={receiver.avatar} />
                        <AvatarFallback>{receiver.name[0]}</AvatarFallback>
                    </Avatar>
                    {!isGroup && isActive && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>}
                </div>
                <div>
                    <h3 className="font-bold text-sm text-foreground">{receiver.name}</h3>
                    <span className={`text-xs ${isActive ? 'text-green-600 font-bold' : 'text-muted-foreground'}`}>{isGroup ? 'Group Chat' : (isActive ? 'Active now' : 'Offline')}</span>
                </div>
            </div>
        </div>
        {!isGroup && (
            <div className="flex gap-1 text-primary pr-1">
                <Button variant="ghost" size="icon" onClick={() => onStartCall && onStartCall(false)}><Phone size={20}/></Button>
                <Button variant="ghost" size="icon" onClick={() => onStartCall && onStartCall(true)}><Video size={22}/></Button>
            </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950" onClick={() => {setShowEmoji(false); setActiveMenuId(null);}}>
        {messages.map((msg, idx) => <React.Fragment key={idx}>{renderMessageContent(msg, msg.sender_id === user?.id)}</React.Fragment>)}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-gray-900 border-t border-border/40 shrink-0 relative">
        {imagePreview && (
            <div className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg border border-border z-10 animate-slide-up">
                <img src={imagePreview} className="h-24 w-auto rounded-lg object-cover" />
                <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"><X size={12}/></button>
            </div>
        )}
        
        {showEmoji && <div className="absolute bottom-20 left-4 z-50 shadow-xl rounded-2xl overflow-hidden animate-fade-in"><EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} height={350} /></div>}

        <form onSubmit={(e) => handleSendMessage(e, 'text')} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-3xl border border-transparent focus-within:border-blue-500/50 transition-colors">
            <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmoji(!showEmoji)} className="text-gray-500 hover:text-yellow-500 rounded-full h-10 w-10">
                <Smile size={24} />
            </Button>
            
            <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-green-500 rounded-full h-10 w-10">
                <ImageIcon size={24} />
            </Button>
            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
            
            <input 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                placeholder={isRecording ? `Recording... ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}` : (isGroup ? `Message ${receiver.name}...` : "Type a message...")} 
                className={`flex-1 bg-transparent px-2 py-2 focus:outline-none text-sm text-foreground placeholder:text-muted-foreground ${isRecording ? 'text-red-500 font-bold animate-pulse' : ''}`} 
                disabled={isRecording}
            />
            
            {newMessage.trim() || selectedImage ? (
                <Button type="submit" disabled={sending} className="rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} className="ml-0.5"/>}
                </Button>
            ) : (
                <Button 
                    type="button" 
                    onClick={toggleRecording} // ✅ Click to start/stop (Toggle)
                    className={`rounded-full w-10 h-10 p-0 shadow-md transition-all duration-300 ${isRecording ? 'bg-red-600 scale-110 animate-pulse ring-4 ring-red-200' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isRecording ? <StopCircle size={20} className="text-white"/> : <Mic size={20} className="text-white"/>}
                </Button>
            )}
        </form>
      </div>
    </div>
  );
};

export default ChatRoomScreen;