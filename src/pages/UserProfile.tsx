import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MessageCircle, UserPlus, UserCheck, Loader2, UserMinus } from 'lucide-react';
import PostCard from '../components/ui/PostCard';
import { useAuth } from '../context/AuthContext';

interface UserProfileProps {
  userId: string;
  onBack: () => void;
  onMessage: (user: any) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onBack, onMessage }) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single();
    if (userData) setProfile(userData);

    const { data: friendship } = await supabase
      .from('friendships')
      .select('status')
      .or(`and(requester_id.eq.${currentUser?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${currentUser?.id})`)
      .maybeSingle();

    if (friendship) setFriendStatus(friendship.status);

    const { data: postData } = await supabase
      .from('posts')
      .select('*, users(name, avatar), original_post:original_post_id(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (postData) setPosts(postData);
    setLoading(false);
  };

  const handleFriendAction = async () => {
    if (friendStatus === 'none') {
      await supabase.from('friendships').insert({ requester_id: currentUser?.id, receiver_id: userId, status: 'pending' });
      setFriendStatus('pending');
    } else if (friendStatus === 'accepted') {
      // Unfriend Logic with Confirmation
      if (window.confirm("Are you sure you want to unfriend this person?")) {
        await supabase.from('friendships').delete()
          .or(`and(requester_id.eq.${currentUser?.id},receiver_id.eq.${userId}),and(requester_id.eq.${userId},receiver_id.eq.${currentUser?.id})`);
        setFriendStatus('none');
      }
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 animate-fade-in transition-colors">
      {/* Cover & Header */}
      <div className="bg-white dark:bg-gray-800 pb-4 rounded-b-3xl shadow-sm relative mb-16"> {/* mb-16 দিয়ে নিচে জায়গা বাড়ালাম */}
        
        {/* Cover Photo */}
        <div className="h-48 bg-gray-300 dark:bg-gray-700 relative overflow-hidden">
          {profile?.cover_photo ? (
            <img src={profile.cover_photo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          )}
          <button onClick={onBack} className="absolute top-4 left-4 bg-black/30 p-2 rounded-full text-white hover:bg-black/50 backdrop-blur-md z-20">
            <ArrowLeft size={20} />
          </button>
        </div>
        
        {/* Profile Info Section */}
        <div className="px-5 absolute -bottom-12 w-full flex justify-between items-end">
            {/* Profile Picture (z-index বাড়ানো হয়েছে) */}
            <div className="relative z-10"> 
              <img src={profile?.avatar} className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800 shadow-md bg-white object-cover" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-2 z-10"> {/* z-10 added */}
                <button onClick={() => onMessage(profile)} className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:text-white shadow-sm">
                    <MessageCircle size={22}/>
                </button>
                <button 
                    onClick={handleFriendAction} 
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 
                    ${friendStatus === 'accepted' ? 'bg-gray-200 text-gray-800 hover:bg-red-100 hover:text-red-600' : 'bg-blue-600 text-white'}`}
                >
                    {friendStatus === 'accepted' ? <><UserCheck size={18}/> Friends</> : friendStatus === 'pending' ? 'Request Sent' : <><UserPlus size={18}/> Add Friend</>}
                </button>
            </div>
        </div>
      </div>

      {/* Name & Bio */}
      <div className="px-5 pt-2 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile?.name}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">@{profile?.email?.split('@')[0]}</p>
        {profile?.bio && <p className="mt-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-w-md mx-auto sm:mx-0">{profile.bio}</p>}
      </div>

      <div className="p-4 space-y-4 mt-2">
        {posts.map(post => <PostCard key={post.id} post={post} onCommentClick={()=>{}} />)}
      </div>
    </div>
  );
};

export default UserProfile;