import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, UserX, Loader2, Users, ArrowLeft, Phone, PhoneMissed, Video } from 'lucide-react';
import CreateGroupModal from './CreateGroupModal';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface ChatListProps {
  onSelectUser: (chat: any) => void;
  onBack: () => void;
}

const ChatListScreen: React.FC<ChatListProps> = ({ onSelectUser, onBack }) => {
  const { user, onlineUsers } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    
    // 1. Friends List
    const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id).eq('status', 'accepted');
    const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id).eq('status', 'accepted');
    
    const friendIds = new Set<string>();
    sent?.forEach(f => friendIds.add(f.receiver_id));
    received?.forEach(f => friendIds.add(f.requester_id));

    let chatItems: any[] = [];

    // Fetch Friends & Last Message
    if (friendIds.size > 0) {
        const { data: users } = await supabase.from('users').select('*').in('id', Array.from(friendIds));
        
        if (users) {
            for (let u of users) {
                const { data: lastMsg } = await supabase.from('messages')
                    .select('content, created_at, type')
                    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${u.id}),and(sender_id.eq.${u.id},receiver_id.eq.${user.id})`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                
                chatItems.push({
                    ...u,
                    type: 'user',
                    lastMessage: lastMsg ? lastMsg.content : 'Start a conversation',
                    lastTime: lastMsg ? lastMsg.created_at : null,
                    msgType: lastMsg ? lastMsg.type : 'text'
                });
            }
        }
    }

    // 2. Groups
    const { data: groups } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    if (groups) {
        chatItems = [...chatItems, ...groups.map(g => ({ ...g, type: 'group', lastMessage: 'Group Chat', lastTime: g.created_at }))];
    }

    chatItems.sort((a, b) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime());
    setItems(chatItems);
    setLoading(false);
  };

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
      <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 px-4 py-3 border-b border-border/40">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
                    <ArrowLeft size={22} />
                </Button>
                <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            </div>
            <Button variant="secondary" size="icon" onClick={() => setShowCreateGroup(true)} className="rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20">
                <Users size={20} />
            </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
          <Input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            type="text" 
            placeholder="Search chats..." 
            className="pl-10 h-11 bg-gray-100 dark:bg-gray-800 border-none rounded-2xl" 
          />
        </div>
      </div>

      <div className="p-2 space-y-1">
        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-primary"/></div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center mt-20 text-muted-foreground flex flex-col items-center">
            <UserX size={48} className="text-gray-300 dark:text-gray-700 mb-2" />
            <p>No chats found.</p>
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} onClick={() => onSelectUser(item)} className="flex items-center gap-4 p-3 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm rounded-2xl cursor-pointer transition-all group">
              <div className="relative">
                 <Avatar className={`w-14 h-14 border-2 border-white dark:border-gray-800 ${item.type === 'group' ? 'rounded-xl' : ''}`}>
                    <AvatarImage src={item.avatar} className="object-cover" />
                    <AvatarFallback>{item.name[0]}</AvatarFallback>
                 </Avatar>
                 
                 {item.type === 'user' && onlineUsers.has(item.id) && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full animate-pulse"></span>
                 )}
              </div>
              
              <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-bold text-foreground truncate">{item.name}</h3>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                        {item.lastTime ? formatDistanceToNow(new Date(item.lastTime), { addSuffix: false }).replace('about ', '') : ''}
                    </span>
                 </div>
                 
                 <p className={`text-sm truncate flex items-center gap-1 ${item.msgType?.includes('call') ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.msgType === 'call_missed' ? <PhoneMissed size={14} className="text-red-500"/> : 
                     item.msgType === 'call_video' ? <Video size={14} className="text-blue-500"/> :
                     item.msgType === 'call_audio' ? <Phone size={14} className="text-blue-500"/> : null}
                    
                    {item.lastMessage}
                 </p>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} onGroupCreated={fetchData} />
    </div>
  );
};

export default ChatListScreen;