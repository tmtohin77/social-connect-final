import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, UserX, Loader2, Users, ArrowLeft, Phone, PhoneMissed } from 'lucide-react';
import CreateGroupModal from './CreateGroupModal';
import { formatDistanceToNow } from 'date-fns';

interface ChatListProps {
  onSelectUser: (chat: any) => void;
  onBack: () => void;
}

const ChatListScreen: React.FC<ChatListProps> = ({ onSelectUser, onBack }) => {
  const { user, onlineUsers } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

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
            // সবার লাস্ট মেসেজ চেক করা (একটু ভারী কুয়েরি, তাই সিম্পল রাখছি)
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
        // গ্রুপের লাস্ট মেসেজও একইভাবে আনা যেতে পারে
        chatItems = [...chatItems, ...groups.map(g => ({ ...g, type: 'group', lastMessage: 'Group Chat' }))];
    }

    // Sort by Time
    chatItems.sort((a, b) => new Date(b.lastTime || 0).getTime() - new Date(a.lastTime || 0).getTime());

    setItems(chatItems);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 px-4 py-3 border-b dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                    <ArrowLeft size={20} className="text-gray-700 dark:text-white" />
                </button>
                <h1 className="text-2xl font-bold dark:text-white">Messages</h1>
            </div>
            <button onClick={() => setShowCreateGroup(true)} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full hover:bg-blue-100 transition">
                <Users size={20} />
            </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input type="text" placeholder="Search chats..." className="w-full bg-gray-100 dark:bg-gray-800 dark:text-white py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900" />
        </div>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-600"/></div>
        ) : items.length === 0 ? (
          <div className="text-center mt-20 text-gray-500 dark:text-gray-400 flex flex-col items-center">
            <UserX size={48} className="text-gray-300 dark:text-gray-600 mb-2" />
            <p>No chats yet.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} onClick={() => onSelectUser(item)} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl cursor-pointer transition-colors group">
              <div className="relative">
                 <img src={item.avatar} alt={item.name} className={`w-14 h-14 border border-gray-100 dark:border-gray-700 object-cover ${item.type === 'group' ? 'rounded-2xl' : 'rounded-full'}`} />
                 
                 {/* Online Indicator */}
                 {item.type === 'user' && onlineUsers.has(item.id) && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
                 )}
              </div>
              
              <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-center mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h3>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                        {item.lastTime ? formatDistanceToNow(new Date(item.lastTime), { addSuffix: false }).replace('about ', '') : ''}
                    </span>
                 </div>
                 
                 <p className="text-sm text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                    {/* Call Icon if call log */}
                    {item.msgType?.includes('call') && (
                        item.lastMessage.includes('Missed') ? <PhoneMissed size={14} className="text-red-500"/> : <Phone size={14} className="text-blue-500"/>
                    )}
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