import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MapPin, Calendar, Grid, Loader2 } from 'lucide-react';
import PostCard from '../components/ui/PostCard';

const ProfileScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const fetchMyPosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('posts')
      .select('*, users(name, avatar)')
      .eq('user_id', user.id) // শুধু আমার পোস্টগুলো আনো
      .order('created_at', { ascending: false });

    if (data) setPosts(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20 animate-fade-in">
      {/* Cover & Header */}
      <div className="bg-white pb-4 rounded-b-3xl shadow-sm">
        <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500 relative">
          <button onClick={onBack} className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30">
            <ArrowLeft size={20} />
          </button>
        </div>
        
        <div className="px-5 -mt-12 mb-4">
          <div className="relative inline-block">
            <img src={user?.avatar} alt="Profile" className="w-24 h-24 rounded-2xl border-4 border-white shadow-md bg-white" />
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          
          <div className="mt-3">
            <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-500">@{user?.email.split('@')[0]}</p>
          </div>

          <div className="flex gap-4 mt-4 text-sm text-gray-600">
             <div className="flex items-center gap-1"><MapPin size={16}/> Dhaka, BD</div>
             <div className="flex items-center gap-1"><Calendar size={16}/> Joined recently</div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6 border-t pt-4">
            <div className="text-center">
              <span className="block font-bold text-xl text-gray-900">{posts.length}</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Posts</span>
            </div>
            <div className="text-center">
              <span className="block font-bold text-xl text-gray-900">1.2k</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Followers</span>
            </div>
            <div className="text-center">
              <span className="block font-bold text-xl text-gray-900">450</span>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Following</span>
            </div>
          </div>
        </div>
      </div>

      {/* User's Posts */}
      <div className="p-4">
        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Grid size={18} /> My Posts
        </h3>
        
        {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600"/></div>
        ) : posts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl text-gray-500">
                No posts yet. Go create one!
            </div>
        ) : (
            posts.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
};

export default ProfileScreen;