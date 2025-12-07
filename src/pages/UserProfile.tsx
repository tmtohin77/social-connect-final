import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MessageCircle, UserPlus, UserCheck, Lock, MoreVertical, X } from 'lucide-react';
import PostCard from '../components/ui/PostCard';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Loader2 } from 'lucide-react';

const UserProfile: React.FC<{ userId: string, onBack: () => void, onMessage: (u: any) => void }> = ({ userId, onBack, onMessage }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted' | 'sent'>('none');
  const [loading, setLoading] = useState(true);
  const [friendCount, setFriendCount] = useState(0);
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userData) setProfile(userData);

    const { data: sent } = await supabase.from('friendships').select('*').eq('requester_id', user?.id).eq('receiver_id', userId).maybeSingle();
    const { data: received } = await supabase.from('friendships').select('*').eq('requester_id', userId).eq('receiver_id', user?.id).maybeSingle();

    if (sent) setFriendStatus(sent.status === 'accepted' ? 'accepted' : 'sent');
    else if (received) setFriendStatus(received.status === 'accepted' ? 'accepted' : 'pending');
    else setFriendStatus('none');

    const { count } = await supabase.from('friendships').select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', 'accepted');
    setFriendCount(count || 0);

    if (sent?.status === 'accepted' || received?.status === 'accepted' || userId === user?.id) {
        const { data: postData } = await supabase.from('posts').select('*, users(*), original_post:original_post_id(*)').eq('user_id', userId).order('created_at', { ascending: false });
        if (postData) setPosts(postData);
    } else {
        setPosts([]);
    }
    setLoading(false);
  };

  const sendRequest = async () => {
    await supabase.from('friendships').insert({ requester_id: user?.id, receiver_id: userId, status: 'pending' });
    setFriendStatus('sent');
  };

  const handleUnfriend = async () => {
    await supabase.from('friendships').delete()
      .or(`and(requester_id.eq.${user?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${user?.id})`);
    setFriendStatus('none');
    setPosts([]);
    setShowUnfriendModal(false);
  };

  const handleAccept = async () => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('requester_id', userId).eq('receiver_id', user?.id);
    setFriendStatus('accepted');
    fetchData();
  };

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-primary"/></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 animate-slide-up">
        {/* Cover & Header */}
        <div className="bg-white dark:bg-gray-800 pb-4 shadow-sm relative mb-4">
            <div className="h-48 md:h-64 bg-gray-300 relative group">
                {profile.cover_photo ? (
                    <img src={profile.cover_photo} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-green-400 to-blue-500"></div>
                )}
                <Button variant="ghost" size="icon" onClick={onBack} className="absolute top-4 left-4 bg-black/20 text-white rounded-full hover:bg-black/40"><ArrowLeft size={20}/></Button>
            </div>
            
            <div className="px-5 relative -mt-16 flex flex-col items-center sm:items-start sm:flex-row sm:justify-between gap-4">
                <div className="relative">
                    <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-800 shadow-xl">
                        <AvatarImage src={profile.avatar} className="object-cover" />
                        <AvatarFallback>{profile.name[0]}</AvatarFallback>
                    </Avatar>
                </div>

                <div className="flex-1 text-center sm:text-left sm:pt-16">
                    <h1 className="text-2xl font-bold text-foreground">{profile.name}</h1>
                    <p className="text-muted-foreground text-sm">@{profile.email.split('@')[0]}</p>
                </div>

                <div className="flex gap-3 sm:mt-16">
                    {friendStatus === 'accepted' ? (
                        <>
                            <Button onClick={() => onMessage(profile)} className="gap-2 bg-blue-600 hover:bg-blue-700">
                                <MessageCircle size={18} /> Message
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => setShowUnfriendModal(true)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                <UserCheck size={20} />
                            </Button>
                        </>
                    ) : friendStatus === 'sent' ? (
                        <Button disabled variant="secondary" className="gap-2">Request Sent</Button>
                    ) : friendStatus === 'pending' ? (
                        <Button onClick={handleAccept} className="gap-2 bg-green-600 hover:bg-green-700">
                            <UserCheck size={18} /> Confirm
                        </Button>
                    ) : (
                        <Button onClick={sendRequest} className="gap-2">
                            <UserPlus size={18} /> Add Friend
                        </Button>
                    )}
                </div>
            </div>

            <div className="px-5 mt-4 text-center sm:text-left">
                {profile.bio && <p className="text-sm text-foreground/80 mb-4 max-w-xl">{profile.bio}</p>}
                <div className="inline-flex gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-full text-sm font-medium text-foreground">
                    <span className="font-bold">{friendCount}</span> Friends
                </div>
            </div>
        </div>

        {/* Posts */}
        <div className="p-4 max-w-xl mx-auto space-y-4">
            {friendStatus !== 'accepted' && userId !== user?.id ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700 text-center">
                    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                        <Lock size={32} className="text-muted-foreground" />
                    </div>
                    <h3 className="font-bold text-lg text-foreground">This account is private</h3>
                    <p className="text-muted-foreground text-sm mt-1">Add friend to see their photos and stories.</p>
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">No posts available.</div>
            ) : (
                posts.map(post => <PostCard key={post.id} post={post} onCommentClick={()=>{}} />)
            )}
        </div>

        {/* Unfriend Modal */}
        <Dialog open={showUnfriendModal} onOpenChange={setShowUnfriendModal}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Unfriend {profile.name}?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">Are you sure? You won't be able to message or see their posts anymore.</p>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setShowUnfriendModal(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleUnfriend}>Unfriend</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default UserProfile;