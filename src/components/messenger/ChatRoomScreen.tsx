import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, Send, Phone, Video, Loader2, Image as ImageIcon, Smile, X, Mic, StopCircle, 
  Trash2, Pin, MoreVertical, Check, CheckCheck, Reply, Copy, Forward, Star, Download, Users 
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import GroupCall from './GroupCall';

const playSound = (type: 'message' | 'sent') => {
  const file = type === 'message' 
    ? 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'
    : 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
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

  // Group Call States
  const [isGroupCallActive, setIsGroupCallActive] = useState(false);
  const [activeCallersCount, setActiveCallersCount] = useState(0);

  const [showEmoji, setShowEmoji] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ✅ Call Presence Listener (Fix for Join Button)
  useEffect(() => {
    if (!isGroup) return;

    // Use the exact same channel name as GroupCall.tsx
    const channelName = `group_call:${receiver.id}`;
    const callChannel = supabase.channel(channelName);

    callChannel
        .on('presence', { event: 'sync' }, () => {
            const state = callChannel.presenceState();
            const count = Object.keys(state).length;
            console.log("Active Callers:", count); // Debugging
            setActiveCallersCount(count);
        })
        .subscribe();

    return () => {
        supabase.removeChannel(callChannel);
    };
  }, [receiver.id, isGroup]);

  useEffect(() => {
    fetchHistory();
    markAsSeen();

    const chatChannel = supabase.channel(`chat:${receiver.id}`)
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
                if (newMsg.sender_id !== user?.id) {
                    playSound('message');
                    markAsSeen();
                }
                scrollToBottom();
            }
        }
      })
      .subscribe();

    return () => { 
        supabase.removeChannel(chatChannel); 
    };
  }, [receiver.id, isGroup, user?.id]);

  const fetchHistory = async () => {
    let msgQuery = supabase.from('messages').select('*');
    if (isGroup) msgQuery = msgQuery.eq('group_id', receiver.id);
    else msgQuery = msgQuery.or(`and(sender_id.eq.${user?.id},receiver_id.eq.${receiver.id}),and(sender_id.eq.${receiver.id},receiver_id.eq.${user?.id})`);
    
    const { data: msgs } = await msgQuery;
    const combined = [...(msgs || [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setMessages(combined);
    scrollToBottom();
  };

  const markAsSeen = async () => {
    if (isGroup) return;
    await supabase.from('messages').update({ status: 'seen' }).eq('receiver_id', user?.id).eq('sender_id', receiver.id).eq('status', 'sent');
  };

  const handleSendMessage = async (e?: React.FormEvent, type: string = 'text', customContent?: string, fileBlob?: Blob) => {
    e?.preventDefault();
    let finalContent = customContent || newMessage;
    if (replyingTo && type === 'text') finalContent = `> Replying to: ${replyingTo.content || 'Media'}\n\n${finalContent}`;
    if (!finalContent.trim() && !selectedImage && !fileBlob) return;
    setSending(true);
    let uploadedUrl = null;
    try {
        const fileToUpload = fileBlob || selectedImage;
        if (fileToUpload) {
            let ext = 'webm';
            if (fileToUpload instanceof File) ext = fileToUpload.name.split('.').pop() || 'png';
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
            content: (selectedImage ? 'Sent a photo' : finalContent) || 'Sent a file',
            type: selectedImage ? 'image' : type,
            image_url: uploadedUrl || (selectedImage ? imagePreview : null),
            status: 'sent',
            created_at: new Date().toISOString()
        };
        setNewMessage(''); setSelectedImage(null); setImagePreview(null); setShowEmoji(false); setReplyingTo(null);
        playSound('sent');
        await supabase.from('messages').insert(msgData);
    } catch (err) { console.error(err); alert("Failed to send."); } 
    finally { setSending(false); }
  };

  const toggleRecording = async () => {
    if (isRecording) {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
            setRecordingDuration(0);
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            recorder.ondataavailable = e => { if(e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (audioChunksRef.current.length > 0) handleSendMessage(undefined, 'audio', 'Voice message', blob);
            };
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            timerRef.current = setInterval(() => { setRecordingDuration(prev => prev + 1); }, 1000);
        } catch(e) { alert("Microphone blocked."); }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
        setSelectedImage(e.target.files[0]);
        setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

  const handleUnsend = async (msgId: string) => {
    if(window.confirm("Delete this message for everyone?")) {
        await supabase.from('messages').delete().eq('id', msgId);
        setActiveMenuId(null);
    }
  };

  const handlePin = async (msg: any) => {
    await supabase.from('messages').update({ is_pinned: !msg.is_pinned }).eq('id', msg.id);
    setActiveMenuId(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setActiveMenuId(null);
  };

  const handleReply = (msg: any) => {
    setReplyingTo(msg);
    setActiveMenuId(null);
    fileInputRef.current?.focus();
  };

  const renderMessageContent = (msg: any, isMe: boolean, idx: number) => {
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

    const menuPositionClass = idx < 2 ? "top-8 origin-top" : "bottom-8 origin-bottom";

    return (
        <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2 group w-full relative items-end gap-2 px-2`}>
            {!isMe && <Avatar className="w-6 h-6 mb-1 border border-border"><AvatarImage src={receiver.avatar}/><AvatarFallback>{receiver.name[0]}</AvatarFallback></Avatar>}
            
            <div className={`relative max-w-[75%] rounded-2xl p-1 overflow-hidden shadow-sm transition-all ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white dark:bg-gray-800 border border-border/40 text-foreground rounded-bl-sm'}`}>
                {msg.is_pinned && <div className="absolute top-1 right-1 z-10"><Pin size={10} className="fill-current rotate-45" /></div>}
                
                {msg.image_url && msg.type === 'image' && (
                    <img 
                        src={msg.image_url} 
                        className="w-full h-auto rounded-xl object-cover max-h-60 min-w-[150px] cursor-pointer hover:opacity-95" 
                        loading="lazy"
                        onClick={() => setViewImage(msg.image_url)}
                    />
                )}
                
                {msg.type === 'audio' && (<div className="px-3 py-2 flex items-center gap-2 min-w-[200px]"><audio controls src={msg.image_url} className="h-8 w-full" /></div>)}
                {msg.content && msg.type !== 'image' && msg.type !== 'audio' && (<div className="px-3 py-2 text-[15px] break-words whitespace-pre-wrap leading-relaxed">{msg.content}</div>)}
                
                <div className={`flex justify-end items-center gap-1 px-2 pb-1 text-[10px] ${isMe ? 'text-blue-200' : 'text-muted-foreground'}`}>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isMe && !isGroup && (msg.status === 'seen' ? <CheckCheck size={12} strokeWidth={3} /> : <Check size={12} />)}
                </div>
            </div>

            <div className={`opacity-0 group-hover:opacity-100 transition-opacity self-center`}>
                 <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === msg.id ? null : msg.id); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground">
                    <MoreVertical size={16} />
                 </button>
            </div>
            
            {activeMenuId === msg.id && (
                <div 
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute ${menuPositionClass} ${isMe ? 'right-4' : 'left-10'} bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-2xl rounded-xl py-1 w-48 border border-border z-50 animate-in zoom-in-95`}
                >
                    <div className="flex flex-col text-sm font-medium text-foreground">
                        <button onClick={() => handleReply(msg)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 w-full text-left transition-colors">
                            <Reply size={16} /> Reply
                        </button>
                        <button onClick={() => handleCopy(msg.content)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 w-full text-left transition-colors">
                            <Copy size={16} /> Copy
                        </button>
                        <button onClick={() => handlePin(msg)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 w-full text-left transition-colors">
                            <Star size={16} /> {msg.is_pinned ? 'Unstar' : 'Star'}
                        </button>
                        {isMe && (
                            <button onClick={() => handleUnsend(msg.id)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 w-full text-left transition-colors border-t border-border/50 mt-1">
                                <Trash2 size={16} /> Delete
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
  };

  if (isGroupCallActive && isGroup) {
    return <GroupCall groupId={receiver.id} onLeave={() => setIsGroupCallActive(false)} />;
  }

  // Determine Call Status for Header
  const isCallOngoing = activeCallersCount > 0;

  return (
    <div className="flex flex-col h-screen bg-[#EFE7DD] dark:bg-gray-950 fixed inset-0 z-[60] transition-colors font-sans">
      <div className="bg-white dark:bg-gray-900 px-2 py-2 flex items-center justify-between shadow-sm border-b border-border/10 shrink-0 z-20">
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full text-foreground"><ArrowLeft size={22} /></Button>
            <div className="flex items-center gap-3 cursor-pointer ml-1" onClick={() => !isGroup && onViewProfile && onViewProfile(receiver.id)}>
                <div className="relative">
                    <Avatar className={`h-10 w-10 border border-border/20 ${isGroup ? 'rounded-xl' : ''}`}>
                        <AvatarImage src={receiver.avatar} className="object-cover" />
                        <AvatarFallback>{receiver.name[0]}</AvatarFallback>
                    </Avatar>
                    {!isGroup && isActive && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>}
                </div>
                <div>
                    <h3 className="font-semibold text-base text-foreground leading-tight">{receiver.name}</h3>
                    {isGroup ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            {isCallOngoing ? <span className="text-red-500 font-bold animate-pulse flex items-center gap-1">● Live ({activeCallersCount})</span> : 'tap for info'}
                        </span>
                    ) : (
                        <span className={`text-xs ${isActive ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>{isActive ? 'Online' : 'Offline'}</span>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-1 pr-1 text-blue-600 dark:text-blue-400">
            {isGroup ? (
                // ✅ Join Button logic fixed
                <Button 
                    variant={isCallOngoing ? "default" : "ghost"} 
                    size={isCallOngoing ? "sm" : "icon"} 
                    onClick={() => setIsGroupCallActive(true)} 
                    className={`rounded-full transition-all ${isCallOngoing ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse px-4' : ''}`}
                >
                    {isCallOngoing ? (
                        <span className="flex items-center gap-2 font-bold">Join <Video size={18} /></span>
                    ) : (
                        <Video size={24} />
                    )}
                </Button>
            ) : (
                <>
                    <Button variant="ghost" size="icon" onClick={() => onStartCall && onStartCall(false)} className="rounded-full"><Phone size={22}/></Button>
                    <Button variant="ghost" size="icon" onClick={() => onStartCall && onStartCall(true)} className="rounded-full"><Video size={24}/></Button>
                </>
            )}
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto p-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] dark:bg-none bg-repeat bg-center"
        onClick={() => {setShowEmoji(false); setActiveMenuId(null);}}
      >
        <div className="space-y-1">
            {messages.map((msg, idx) => <React.Fragment key={idx}>{renderMessageContent(msg, msg.sender_id === user?.id, idx)}</React.Fragment>)}
            <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-border/20 shrink-0 relative flex flex-col gap-2">
        {replyingTo && (
            <div className="mx-2 p-2 bg-white dark:bg-gray-800 rounded-lg border-l-4 border-blue-500 shadow-sm flex justify-between items-center animate-slide-up">
                <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-blue-500 mb-0.5">Replying to message</p>
                    <p className="text-sm text-foreground truncate">{replyingTo.content || 'Attachment'}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                    <X size={16} />
                </button>
            </div>
        )}

        {imagePreview && (
            <div className="absolute bottom-20 left-4 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-lg border border-border z-10 animate-slide-up">
                <img src={imagePreview} className="h-24 w-auto rounded-lg object-cover" />
                <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"><X size={12}/></button>
            </div>
        )}
        
        {showEmoji && <div className="absolute bottom-20 left-2 z-50 shadow-xl rounded-2xl overflow-hidden animate-fade-in"><EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} height={300} width={300} /></div>}

        <div className="flex items-end gap-2">
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-[24px] border border-border/10 shadow-sm flex items-center px-1 py-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowEmoji(!showEmoji)} className="text-gray-500 hover:text-yellow-500 rounded-full h-10 w-10 shrink-0">
                    <Smile size={24} />
                </Button>
                
                <input 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder={isRecording ? `Recording... ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, '0')}` : "Message"} 
                    className={`flex-1 bg-transparent px-2 py-3 focus:outline-none text-[15px] text-foreground placeholder:text-muted-foreground ${isRecording ? 'text-red-500 font-bold animate-pulse' : ''}`} 
                    disabled={isRecording}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSendMessage(e); }}
                />

                <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-green-500 rounded-full h-10 w-10 shrink-0 -mr-1">
                    <ImageIcon size={22} strokeWidth={2} />
                </Button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageSelect} />
            </div>

            <div className="pb-1">
                {newMessage.trim() || selectedImage ? (
                    <Button onClick={handleSendMessage} disabled={sending} className="rounded-full w-11 h-11 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95 flex items-center justify-center">
                        {sending ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} className="ml-0.5"/>}
                    </Button>
                ) : (
                    <Button 
                        type="button" 
                        onClick={toggleRecording} 
                        className={`rounded-full w-11 h-11 p-0 shadow-md transition-all duration-300 flex items-center justify-center ${isRecording ? 'bg-red-500 scale-110 animate-pulse ring-4 ring-red-200' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                        {isRecording ? <StopCircle size={20} className="text-white"/> : <Mic size={20} className="text-white"/>}
                    </Button>
                )}
            </div>
        </div>
      </div>

      {viewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setViewImage(null)}>
            <img src={viewImage} className="max-w-full max-h-full object-contain" />
            <button className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full hover:bg-white/20">
                <X size={24} />
            </button>
            <a href={viewImage} download target="_blank" onClick={(e) => e.stopPropagation()} className="absolute bottom-8 right-8 text-white p-3 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md">
                <Download size={24} />
            </a>
        </div>
      )}
    </div>
  );
};

export default ChatRoomScreen;