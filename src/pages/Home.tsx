import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/ui/PostCard';
import CreatePost from '../components/home/CreatePost';
import StoryCircle from '../components/home/StoryCircle';
import CommentModal from '../components/home/CommentModal';
import NotificationsModal from '../components/notifications/NotificationsModal';
import { Loader2, Bell, MessageCircle, X, Eye } from 'lucide-react';
import { appLogo } from '../data/mockData';

interface HomeScreenProps {
  onOpenChat: () => void;
  onViewProfile?: (userId: string) => void;
}

// Story Viewer Interface
interface StoryViewData {
  id: string;
  url: string;
  isMine: boolean;
  userId: string;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenChat, onViewProfile }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingStory, setUploadingStory] = useState(false);
  
  // Modals States
  const [showComments, setShowComments] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  
  // Story View States
  const [viewStory, setViewStory] = useState<StoryViewData | null>(null);
  const [viewers, setViewers] = useState<any[]>([]);
  const [showViewersModal, setShowViewersModal] = useState(false);

  const storyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
        fetchPosts();
        fetchStories();
    }
  }, [user]);

  const fetchPosts = async () => {
    if (!user) return;

    try {
        // ১. আমার সব ফ্রেন্ডের আইডি বের করো
        const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id).eq('status', 'accepted');
        const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id).eq('status', 'accepted');
        
        const friendIds = new Set<string>();
        sent?.forEach(f => friendIds.add(f.receiver_id));
        received?.forEach(f => friendIds.add(f.requester_id));
        friendIds.add(user.id); // নিজের পোস্টও দেখতে চাই

        // ২. শুধু ফ্রেন্ডদের এবং নিজের পোস্ট আনো
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            users (name, avatar),
            original_post:original_post_id (
              id,
              content,
              image_url,
              created_at,
              users (name, avatar)
            )
          `)
          .in('user_id', Array.from(friendIds)) // ✅ Privacy Filter Added
          .order('created_at', { ascending: false });

        if (!error && data) setPosts(data);
    } catch (error) {
        console.error("Error fetching posts:", error);
    } finally {
        setLoading(false);
    }
  };

  const fetchStories = async () => {
    if (!user) return;

    // ১. স্টোরির জন্যও একই ফ্রেন্ড ফিল্টার (Optional: চাইলে স্টোরিও শুধু ফ্রেন্ডদের দেখাতে পারো)
    // আপাতত সব একটিভ স্টোরি আনছি, পরে ফিল্টার করা যাবে
    const { data } = await supabase
      .from('stories')
      .select('*, users(name, avatar)')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    if (data) {
        const uniqueStories = Array.from(new Map(data.map(item => [item.user_id, item])).values());
        setStories(uniqueStories);
    }
  };

  // Story Upload Logic
  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setUploadingStory(true);
    
    try {
      const file = e.target.files[0];
      const fileName = `story_${user?.id}_${Date.now()}`;
      await supabase.storage.from('stories').upload(fileName, file);
      const { data } = supabase.storage.from('stories').getPublicUrl(fileName);
      
      await supabase.from('stories').insert({
        user_id: user?.id,
        image_url: data.publicUrl
      });

      fetchStories();
    } catch (error) {
      console.error(error);
      alert('Failed to upload story');
    } finally {
      setUploadingStory(false);
    }
  };

  // Story View Logic
  const handleViewStory = async (story: any) => {
    const isMine = story.user_id === user?.id;
    setViewStory({
        id: story.id,
        url: story.image_url,
        isMine,
        userId: story.user_id
    });

    if (!isMine) {
        // Record View
        await supabase.from('story_views').insert({
            story_id: story.id,
            viewer_id: user?.id
        }).select();
    } else {
        // Fetch My Viewers
        fetchStoryViewers(story.id);
    }
  };

  const fetchStoryViewers = async (storyId: string) => {
    const { data } = await supabase
        .from('story_views')
        .select('*, viewer:viewer_id(name, avatar)')
        .eq('story_id', storyId);
    
    if (data) setViewers(data);
  };

  const openCommentModal = (postId: string) => {
    setSelectedPostId(postId);
    setShowComments(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-24 transition-colors duration-300">
      {/* Top Header */}
      <div className="bg-white dark:bg-gray-800 p-4 sticky top-0 z-40 shadow-sm flex justify-between items-center border-b dark:border-gray-700 transition-colors">
        <div className="flex items-center gap-2">
            <img src={appLogo} alt="Logo" className="w-8 h-8 rounded-lg" />
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">SocialConnect</h1>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
               <Bell size={20} className="text-gray-700 dark:text-gray-200"/>
               <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></span>
            </button>
            <button onClick={onOpenChat} className="relative p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
               <MessageCircle size={20} className="text-gray-700 dark:text-gray-200"/>
            </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Stories Section */}
        <div className="bg-white dark:bg-gray-800 py-4 border-b border-gray-100 dark:border-gray-700 mb-4 overflow-x-auto no-scrollbar flex gap-4 px-4 transition-colors">
            {/* My Story Upload */}
            <div className="relative">
                <StoryCircle 
                    user={{ name: "You", avatar: user?.avatar || "" }} 
                    isAddStory 
                    onClick={() => storyInputRef.current?.click()} 
                />
                <input type="file" ref={storyInputRef} hidden accept="image/*" onChange={handleStoryUpload} />
                {uploadingStory && (
                    <div className="absolute inset-0 bg-white/50 rounded-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-600" size={20} />
                    </div>
                )}
            </div>
            
            {/* Friends' Stories */}
            {stories.map((story) => (
                <StoryCircle 
                    key={story.id} 
                    user={story.users} 
                    onClick={() => handleViewStory(story)} 
                />
            ))}
        </div>

        {/* Create Post */}
        <div className="px-4">
            <CreatePost onPostCreated={fetchPosts} />
        </div>

        {/* Feed Section */}
        <div className="px-4 mt-2">
            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
            ) : posts.length === 0 ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <p className="text-lg font-medium">No posts yet 😢</p>
                    <p className="text-sm">Add friends to see their posts!</p>
                </div>
            ) : (
                posts.map(post => (
                    <PostCard 
                        key={post.id} 
                        post={post} 
                        onCommentClick={openCommentModal} 
                        onDelete={fetchPosts} 
                        onProfileClick={onViewProfile}
                    />
                ))
            )}
        </div>
      </div>

      {/* Modals */}
      <CommentModal isOpen={showComments} onClose={() => setShowComments(false)} postId={selectedPostId} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} />

      {/* Story Viewer Overlay */}
      {viewStory && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center">
            <button 
                className="absolute top-4 right-4 text-white p-2 bg-white/20 rounded-full z-50 hover:bg-white/30" 
                onClick={() => { setViewStory(null); setShowViewersModal(false); }}
            >
                <X size={24} />
            </button>

            <img src={viewStory.url} className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl" />

            {/* Viewers Eye Icon (Only for My Story) */}
            {viewStory.isMine && (
                <div className="absolute bottom-10 flex flex-col items-center z-50" onClick={() => setShowViewersModal(true)}>
                    <div className="flex items-center gap-2 text-white bg-black/50 backdrop-blur-md px-4 py-2 rounded-full cursor-pointer hover:bg-black/70 transition border border-white/20">
                        <Eye size={20} />
                        <span className="font-bold">{viewers.length} Views</span>
                    </div>
                </div>
            )}

            {/* Viewers List Modal */}
            {showViewersModal && (
                <div className="absolute bottom-0 w-full max-w-md bg-white dark:bg-gray-800 rounded-t-3xl h-[50vh] transition-transform duration-300 animate-slide-up z-[80]">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 dark:text-white">Story Views ({viewers.length})</h3>
                        <button onClick={(e) => { e.stopPropagation(); setShowViewersModal(false); }} className="dark:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-4 overflow-y-auto h-full pb-20">
                        {viewers.length === 0 ? <p className="text-gray-500 text-center mt-10">No views yet.</p> : 
                            viewers.map(v => (
                            <div key={v.id} className="flex items-center gap-3 mb-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl">
                                <img src={v.viewer.avatar} className="w-10 h-10 rounded-full border object-cover"/>
                                <span className="font-bold text-gray-800 dark:text-white">{v.viewer.name}</span>
                            </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default HomeScreen;