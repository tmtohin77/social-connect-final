import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Search, UserX, Loader2, Users } from 'lucide-react';
import CreateGroupModal from './CreateGroupModal';

interface ChatListProps {
  onSelectUser: (chat: any) => void;
}

const ChatListScreen: React.FC<ChatListProps> = ({ onSelectUser }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]); // Friends + Groups
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    
    // ১. ফ্রেন্ডস আনো
    const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id).eq('status', 'accepted');
    const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id).eq('status', 'accepted');
    
    const friendIds = new Set<string>();
    sent?.forEach(f => friendIds.add(f.receiver_id));
    received?.forEach(f => friendIds.add(f.requester_id));

    let friendsList: any[] = [];
    if (friendIds.size > 0) {
      const { data } = await supabase.from('users').select('*').in('id', Array.from(friendIds));
      if (data) friendsList = data.map(f => ({ ...f, type: 'user' }));
    }

    // ২. গ্রুপ আনো
    const { data: groups } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    // Note: RLS will ensure I only get groups I'm in
    const groupsList = groups ? groups.map(g => ({ ...g, type: 'group' })) : [];

    setItems([...groupsList, ...friendsList]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 p-4 border-b dark:border-gray-800">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold dark:text-white">Messages</h1>
            <button onClick={() => setShowCreateGroup(true)} className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full hover:bg-blue-100 transition">
                <Users size={20} />
            </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input type="text" placeholder="Search..." className="w-full bg-gray-100 dark:bg-gray-800 dark:text-white py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900" />
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
                 {item.type === 'user' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>}
              </div>
              <div className="flex-1">
                 <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    {item.name}
                    {item.type === 'group' && <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">GROUP</span>}
                 </h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Tap to chat</p>
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