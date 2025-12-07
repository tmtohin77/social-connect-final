import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserCheck, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';

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

  const fetchSuggestions = async () => {
    if (!user) return;
    setLoading(true);
    const { data: users } = await supabase.from('users').select('*').neq('id', user.id).limit(10);
    if (users) {
      setSuggestions(users);
      checkFriendshipStatus(users.map(u => u.id));
    }
    setLoading(false);
  };

  const searchUsers = async () => {
    setLoading(true);
    const { data: users } = await supabase.from('users').select('*').ilike('name', `%${query}%`).neq('id', user?.id).limit(20);
    if (users) {
      setResults(users);
      checkFriendshipStatus(users.map(u => u.id));
    }
    setLoading(false);
  };

  const checkFriendshipStatus = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    const { data } = await supabase.from('friendships').select('*').or(`requester_id.eq.${user?.id},receiver_id.eq.${user?.id}`);
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

  const sendRequest = async (receiverId: string) => {
    setFriendStatus(prev => ({ ...prev, [receiverId]: 'sent_request' }));
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: receiverId, status: 'pending' });
  };

  const cancelRequest = async (receiverId: string) => {
    const temp = { ...friendStatus };
    delete temp[receiverId];
    setFriendStatus(temp);
    await supabase.from('friendships').delete().eq('requester_id', user?.id).eq('receiver_id', receiverId);
  };

  const renderUserCard = (u: any) => {
    const status = friendStatus[u.id];
    return (
      <Card key={u.id} className="flex items-center justify-between p-3 mb-3 border-none shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile && onViewProfile(u.id)}>
          <Avatar>
             <AvatarImage src={u.avatar} />
             <AvatarFallback>{u.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-sm text-foreground">{u.name}</h3>
            <p className="text-xs text-muted-foreground">@{u.email.split('@')[0]}</p>
          </div>
        </div>
        
        {status === 'accepted' ? (
            <Button variant="ghost" size="sm" className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 gap-2 h-9">
                <UserCheck size={16} /> Friends
            </Button>
        ) : status === 'sent_request' ? (
            <Button variant="secondary" size="sm" onClick={() => cancelRequest(u.id)} className="gap-2 h-9">
                <Clock size={16} /> Cancel
            </Button>
        ) : status === 'received_request' ? (
            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">Pending</span>
        ) : (
            <Button size="sm" onClick={() => sendRequest(u.id)} className="gap-2 h-9 bg-blue-600 hover:bg-blue-700">
                <UserPlus size={16} /> Add
            </Button>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-10 shadow-sm border-b border-border/40">
        <h1 className="text-xl font-bold mb-4 px-1 text-foreground">Find Friends</h1>
        <div className="relative">
          <Search className="absolute left-3 top-3.5 text-muted-foreground" size={18} />
          <Input
            autoFocus
            type="text"
            placeholder="Search by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-11 bg-gray-100 dark:bg-gray-900 border-none focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : query.length > 0 ? (
          <div>
             {results.length === 0 ? (
                <div className="text-center mt-10 text-muted-foreground">No user found.</div>
             ) : results.map((u) => renderUserCard(u))}
          </div>
        ) : (
          <div>
             <h3 className="font-bold text-muted-foreground mb-4 uppercase text-xs tracking-wider">People You May Know</h3>
             {suggestions.length === 0 ? <div className="text-center text-muted-foreground text-sm">No suggestions.</div> : suggestions.map((u) => renderUserCard(u))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;