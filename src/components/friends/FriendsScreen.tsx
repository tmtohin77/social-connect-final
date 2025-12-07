import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, UserCheck, X, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card } from '../ui/card';
import { Loader2 } from 'lucide-react';

interface FriendsProps {
  onViewProfile: (userId: string) => void;
}

const FriendsScreen: React.FC<FriendsProps> = ({ onViewProfile }) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'main' | 'sent_requests'>('main');
  const [requests, setRequests] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [viewMode]);

  const fetchAllData = async () => {
    setLoading(true);
    if (!user) return;

    if (viewMode === 'main') {
        const { data: reqData } = await supabase.from('friendships').select('id, requester:requester_id(*)').eq('receiver_id', user.id).eq('status', 'pending');
        if (reqData) setRequests(reqData.map(d => ({ ...d.requester, friendship_id: d.id })));

        const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id);
        const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id);
        const excludeIds = new Set<string>([user.id]);
        sent?.forEach(d => excludeIds.add(d.receiver_id));
        received?.forEach(d => excludeIds.add(d.requester_id));

        const { data: users } = await supabase.from('users').select('*').limit(20);
        if (users) setSuggestions(users.filter(u => !excludeIds.has(u.id)));

    } else {
        const { data: sentData } = await supabase.from('friendships').select('id, receiver:receiver_id(*)').eq('requester_id', user.id).eq('status', 'pending');
        if (sentData) setSentRequests(sentData.map(d => ({ ...d.receiver, friendship_id: d.id })));
    }
    setLoading(false);
  };

  const handleAccept = async (friendshipId: string) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    fetchAllData();
  };

  const handleDelete = async (friendshipId: string) => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    fetchAllData();
  };

  const sendRequest = async (receiverId: string) => {
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: receiverId, status: 'pending' });
    setSuggestions(prev => prev.filter(u => u.id !== receiverId));
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-primary"/></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-10 shadow-sm border-b border-border/40 flex justify-between items-center">
        <h1 className="text-xl font-bold text-foreground">
            {viewMode === 'main' ? 'Friends & Suggestions' : 'Sent Requests'}
        </h1>
        
        <div className="relative">
            <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
                <MoreVertical size={20} />
            </Button>
            
            {showMenu && (
                <div className="absolute right-0 top-10 bg-popover text-popover-foreground shadow-xl rounded-lg w-48 z-20 py-1 border animate-in zoom-in-95">
                    <button 
                        onClick={() => { setViewMode('sent_requests'); setShowMenu(false); }} 
                        className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
                    >
                        View Sent Requests
                    </button>
                    <button 
                        onClick={() => { setViewMode('main'); setShowMenu(false); }} 
                        className="w-full text-left px-4 py-2 hover:bg-muted text-sm"
                    >
                        Find Friends
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Sent Requests View */}
        {viewMode === 'sent_requests' && (
            <div className="space-y-3">
                {sentRequests.length === 0 ? <p className="text-center text-muted-foreground mt-10">No sent requests pending.</p> : sentRequests.map(u => (
                    <Card key={u.id} className="flex items-center justify-between p-3 border-none shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(u.id)}>
                            <Avatar>
                                <AvatarImage src={u.avatar} />
                                <AvatarFallback>{u.name[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-bold text-sm text-foreground">{u.name}</h3>
                                <p className="text-xs text-muted-foreground">Request pending</p>
                            </div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleDelete(u.friendship_id)} className="gap-1 h-8">
                            <X size={14}/> Cancel
                        </Button>
                    </Card>
                ))}
            </div>
        )}

        {/* Main View */}
        {viewMode === 'main' && (
            <>
                {requests.length > 0 && (
                    <div>
                        <h3 className="font-bold text-muted-foreground mb-3 uppercase text-xs tracking-wider">Friend Requests</h3>
                        <div className="space-y-3">
                            {requests.map(u => (
                                <Card key={u.id} className="flex items-center justify-between p-3 border-none shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(u.id)}>
                                        <Avatar>
                                            <AvatarImage src={u.avatar} />
                                            <AvatarFallback>{u.name[0]}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h3 className="font-bold text-sm text-foreground">{u.name}</h3>
                                            <p className="text-xs text-muted-foreground">wants to be friends</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleAccept(u.friendship_id)} className="bg-blue-600 hover:bg-blue-700 h-8">Confirm</Button>
                                        <Button variant="secondary" size="sm" onClick={() => handleDelete(u.friendship_id)} className="h-8">Delete</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="font-bold text-muted-foreground mb-3 uppercase text-xs tracking-wider">People You May Know</h3>
                    <div className="space-y-3">
                        {suggestions.map(u => (
                            <Card key={u.id} className="flex items-center justify-between p-3 border-none shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile(u.id)}>
                                    <Avatar>
                                        <AvatarImage src={u.avatar} />
                                        <AvatarFallback>{u.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-bold text-sm text-foreground">{u.name}</h3>
                                        <p className="text-xs text-muted-foreground">Suggested for you</p>
                                    </div>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => sendRequest(u.id)} className="gap-1 h-9 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:border-blue-900 dark:hover:bg-blue-900/30">
                                    <UserPlus size={16}/> Add
                                </Button>
                            </Card>
                        ))}
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default FriendsScreen;