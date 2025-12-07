import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserCheck, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface SearchProps {
  onViewProfile?: (userId: string) => void;
}

const SearchScreen: React.FC<SearchProps> = ({ onViewProfile }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [friendStatus, setFriendStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSuggestions();
  }, []);

  useEffect(() => {
    if (query.length > 0) {
      searchUsers();
    } else {
      setResults([]);
    }
  }, [query]);

  // Suggestions Fetch Logic
  const fetchSuggestions = async () => {
    if (!user) return;
    setLoading(true);

    const { data: users } = await supabase
      .from('users')
      .select('*')
      .neq('id', user.id)
      .limit(10);

    if (users) {
      setSuggestions(users);
      checkFriendshipStatus(users.map(u => u.id));
    }
    setLoading(false);
  };

  // Search Logic
  const searchUsers = async () => {
    setLoading(true);
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .ilike('name', `%${query}%`)
      .neq('id', user?.id)
      .limit(20);
    
    if (users) {
      setResults(users);
      checkFriendshipStatus(users.map(u => u.id));
    }
    setLoading(false);
  };

  // Friendship Check
  const checkFriendshipStatus = async (userIds: string[]) => {
    if (userIds.length === 0) return;

    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${user?.id},receiver_id.eq.${user?.id}`);

    const statusMap: Record<string, string> = {};
    
    data?.forEach((f) => {
      const otherId = f.requester_id === user?.id ? f.receiver_id : f.requester_id;
      if (userIds.includes(otherId)) {
        statusMap[otherId] = f.status;
        if (f.status === 'pending' && f.requester_id === user?.id) statusMap[otherId] = 'sent_request';
        if (f.status === 'pending' && f.receiver_id === user?.id) statusMap[otherId] = 'received_request';
      }
    });
    setFriendStatus(prev => ({ ...prev, ...statusMap }));
  };

  // Actions
  const sendRequest = async (receiverId: string) => {
    setFriendStatus(prev => ({ ...prev, [receiverId]: 'sent_request' }));
    await supabase.from('friendships').insert({
      requester_id: user?.id,
      receiver_id: receiverId,
      status: 'pending'
    });
  };

  const cancelRequest = async (receiverId: string) => {
    const temp = { ...friendStatus };
    delete temp[receiverId];
    setFriendStatus(temp);

    await supabase.from('friendships').delete()
      .eq('requester_id', user?.id)
      .eq('receiver_id', receiverId);
  };

  // Render Card
  const renderUserCard = (u: any) => {
    const status = friendStatus[u.id];
    return (
      <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 mb-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile && onViewProfile(u.id)}>
          <img src={u.avatar} className="w-12 h-12 rounded-full object-cover border dark:border-gray-600" />
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white">{u.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">@{u.email.split('@')[0]}</p>
          </div>
        </div>
        
        {status === 'accepted' ? (
            <button className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-bold flex items-center gap-2">
                <UserCheck size={16} /> Friends
            </button>
        ) : status === 'sent_request' ? (
            <button onClick={() => cancelRequest(u.id)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600">
                <Clock size={16} /> Cancel
            </button>
        ) : status === 'received_request' ? (
            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">Check Requests</span>
        ) : (
            <button onClick={() => sendRequest(u.id)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md active:scale-95">
                <UserPlus size={16} /> Add
            </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
      <div className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-10 shadow-sm border-b dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4 px-1 dark:text-white">Find Friends</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="Search name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-700 dark:text-white py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-all placeholder-gray-500"
          />
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : query.length > 0 ? (
          <div>
             {results.length === 0 ? (
                <div className="text-center mt-10 text-gray-500 dark:text-gray-400">No user found.</div>
             ) : (
                results.map((u) => renderUserCard(u))
             )}
          </div>
        ) : (
          <div>
             <h3 className="font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase text-xs tracking-wider">People You May Know</h3>
             {suggestions.length === 0 ? (
                <div className="text-center text-gray-400 text-sm">No suggestions yet.</div>
             ) : (
                suggestions.map((u) => renderUserCard(u))
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;