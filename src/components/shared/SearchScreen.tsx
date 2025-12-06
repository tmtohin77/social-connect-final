import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  // ১. সার্চ লজিক
  useEffect(() => {
    if (query.length > 1) {
      searchUsers();
    } else {
      setResults([]);
    }
  }, [query]);

  // ২. আমি কাকে কাকে ফলো করছি সেটা চেক করা
  useEffect(() => {
    fetchFollowing();
  }, []);

  const fetchFollowing = async () => {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user?.id);
    if (data) {
      setFollowing(new Set(data.map(f => f.following_id)));
    }
  };

  const searchUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .ilike('name', `%${query}%`) // Case-insensitive search
      .neq('id', user?.id) // নিজেকে বাদ দাও
      .limit(20);
    
    if (data) setResults(data);
    setLoading(false);
  };

  const handleFollow = async (targetId: string) => {
    // Optimistic Update
    const newFollowing = new Set(following);
    
    if (following.has(targetId)) {
      // Unfollow
      newFollowing.delete(targetId);
      await supabase.from('follows').delete().eq('follower_id', user?.id).eq('following_id', targetId);
    } else {
      // Follow
      newFollowing.add(targetId);
      await supabase.from('follows').insert({ follower_id: user?.id, following_id: targetId });
    }
    setFollowing(newFollowing);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 animate-fade-in">
      {/* Header Search Bar */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-2xl font-bold mb-4 px-1">Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input
            autoFocus
            type="text"
            placeholder="Search for friends..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-100 py-3 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : results.length === 0 && query.length > 1 ? (
          <div className="text-center mt-10 text-gray-500">No users found.</div>
        ) : (
          <div className="space-y-3">
            {results.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full object-cover border" />
                  <div>
                    <h3 className="font-bold text-gray-800">{u.name}</h3>
                    <p className="text-xs text-gray-500">@{u.email.split('@')[0]}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleFollow(u.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95
                    ${following.has(u.id) 
                      ? 'bg-gray-100 text-gray-700 border border-gray-200' 
                      : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'}`}
                >
                  {following.has(u.id) ? (
                    <><UserCheck size={16} /> Following</>
                  ) : (
                    <><UserPlus size={16} /> Follow</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
        
        {!query && (
            <div className="text-center mt-20">
                <Search size={48} className="mx-auto text-gray-300 mb-4"/>
                <p className="text-gray-400">Search for people to follow</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;