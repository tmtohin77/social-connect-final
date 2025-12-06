import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MapPin, Calendar, Grid, Loader2, Edit3 } from 'lucide-react';
import PostCard from '../components/ui/PostCard';
import EditProfileModal from '../components/profile/EditProfileModal';

const ProfileScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth(); // Auth Context থেকে ইউজার নাও (কিন্তু এটাতে পুরোনো ডেটা থাকতে পারে)
  const [profile, setProfile] = useState<any>(user); // লেটেস্ট প্রোফাইল ডেটা
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    // ১. লেটেস্ট প্রোফাইল ডেটা (Bio, Cover সহ) আনো
    const { data: userData } = await supabase.from('users').select('*').eq('id', user?.id).single();
    if (userData) setProfile(userData);

    // ২. পোস্টগুলো আনো
    const { data: postData } = await supabase
      .from('posts')
      .select('*, users(name, avatar)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (postData) setPosts(postData);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20 animate-fade-in">
      {/* Cover Photo */}
      <div className="bg-white pb-4 rounded-b-3xl shadow-sm relative">
        <div className="h-40 bg-gray-300 relative overflow-hidden group">
          {profile?.cover_photo ? (
            <img src={profile.cover_photo} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
          )}
          <button onClick={onBack} className="absolute top-4 left-4 bg-black/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/40 z-10">
            <ArrowLeft size={20} />
          </button>
        </div>
        
        <div className="px-5 -mt-14 mb-4">
          <div className="flex justify-between items-end">
            <div className="relative">
              <img src={profile?.avatar} alt="Profile" className="w-28 h-28 rounded-2xl border-4 border-white shadow-md bg-white object-cover" />
              <div className="absolute bottom-2 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            {/* Edit Button */}
            <button onClick={() => setIsEditing(true)} className="mb-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold hover:bg-gray-200 flex items-center gap-2 transition-all active:scale-95">
              <Edit3 size={16} /> Edit Profile
            </button>
          </div>
          
          <div className="mt-3">
            <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
            <p className="text-gray-500 text-sm">@{profile?.email?.split('@')[0]}</p>
            
            {/* Bio Section */}
            {profile?.bio && (
              <p className="mt-3 text-gray-700 text-sm leading-relaxed max-w-md">{profile.bio}</p>
            )}
          </div>

          <div className="flex gap-4 mt-4 text-sm text-gray-600">
             <div className="flex items-center gap-1"><MapPin size={16}/> Dhaka, BD</div>
             <div className="flex items-center gap-1"><Calendar size={16}/> Joined 2025</div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-6 border-t pt-4">
            <div className="text-center">
              <span className="block font-bold text-xl text-gray-900">{posts.length}</span>
              <span className="text-xs text-gray-500 uppercase">Posts</span>
            </div>
            <div className="text-center">
              <span className="block font-bold text-xl text-gray-900">0</span>
              <span className="text-xs text-gray-500 uppercase">Followers</span>
            </div>
            <div className="text-center">
              <span className="block font-bold text-xl text-gray-900">0</span>
              <span className="text-xs text-gray-500 uppercase">Following</span>
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
            <div className="text-center py-10 bg-white rounded-xl text-gray-500 shadow-sm border border-gray-100">
                No posts yet. Go create one!
            </div>
        ) : (
            posts.map(post => <PostCard key={post.id} post={post} onCommentClick={()=>{}} />)
        )}
      </div>

      {/* Edit Modal */}
      <EditProfileModal 
        isOpen={isEditing} 
        onClose={() => setIsEditing(false)} 
        onUpdate={fetchProfileData} 
      />
    </div>
  );
};

export default ProfileScreen;