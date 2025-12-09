import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/ui/PostCard';
import CreatePost from '../components/home/CreatePost';
import StoryCircle from '../components/home/StoryCircle';
import CommentModal from '../components/home/CommentModal';
import NotificationsModal from '../components/notifications/NotificationsModal';
import { Loader2, Bell, MessageCircle, Heart, Send, X, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { appLogo } from '../data/mockData';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

interface HomeScreenProps {
  onOpenChat: () => void;
  onViewProfile: (userId: string) => void;
}

interface StoryViewData {
  id: string;
  url: string;
  isMine: boolean;
  userId: string;
  user?: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenChat, onViewProfile }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingStory, setUploadingStory] = useState(false);
  
  const [showComments, setShowComments] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState('');
  
  // Story View States
  const [viewStory, setViewStory] = useState<StoryViewData | null>(null);
  const [viewers, setViewers] = useState<any[]>([]);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const storyInputRef = useRef<HTMLInputElement>(null);

  // Helper to check video
  const isVideo = (url: string) => url?.match(/\.(mp4|webm|ogg)$/i);

  useEffect(() => {
    if (user) {
        fetchPosts();
        fetchStories();
    }
  }, [user]);

  // Story Progress & Video Duration Logic
  useEffect(() => {
    let interval: any;
    if (viewStory) {
      setStoryProgress(0);
      const isVid = isVideo(viewStory.url);
      const duration = isVid ? 15000 : 5000; // Video 15s, Image 5s default
      
      const step = 100 / (duration / 50);

      interval = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            setViewStory(null); // Auto close
            return 0;
          }
          return prev + step;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [viewStory]);

  const fetchPosts = async () => {
    if (!user) return;
    try {
        const { data: sent } = await supabase.from('friendships').select('receiver_id').eq('requester_id', user.id).eq('status', 'accepted');
        const { data: received } = await supabase.from('friendships').select('requester_id').eq('receiver_id', user.id).eq('status', 'accepted');
        
        const friendIds = new Set<string>();
        sent?.forEach(f => friendIds.add(f.receiver_id));
        received?.forEach(f => friendIds.add(f.requester_id));
        friendIds.add(user.id);

        const { data, error } = await supabase
          .from('posts')
          .select(`*, users (name, avatar), original_post:original_post_id (*)`)
          .in('user_id', Array.from(friendIds))
          .order('created_at', { ascending: false });

        if (!error && data) setPosts(data);
    } catch (error) { console.error("Error fetching posts:", error); } finally { setLoading(false); }
  };

  const fetchStories = async () => {
    if (!user) return;
    const { data } = await supabase.from('stories').select('*, users(name, avatar)').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false });
    if (data) {
        const uniqueStories = Array.from(new Map(data.map(item => [item.user_id, item])).values());
        setStories(uniqueStories);
    }
  };

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setUploadingStory(true);
    try {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop();
      const fileName = `story_${user?.id}_${Date.now()}.${ext}`;
      
      await supabase.storage.from('stories').upload(fileName, file);
      const { data } = supabase.storage.from('stories').getPublicUrl(fileName);
      await supabase.from('stories').insert({ user_id: user?.id, image_url: data.publicUrl });
      fetchStories();
    } catch (error) { console.error(error); } finally { setUploadingStory(false); }
  };

  const handleViewStory = async (story: any) => {
    const isMine = story.user_id === user?.id;
    setViewStory({ id: story.id, url: story.image_url, isMine, userId: story.user_id, user: story.users });
    if (!isMine) await supabase.from('story_views').insert({ story_id: story.id, viewer_id: user?.id }).select();
    else fetchStoryViewers(story.id);
  };

  const fetchStoryViewers = async (storyId: string) => {
    const { data } = await supabase.from('story_views').select('*, viewer:viewer_id(name, avatar)').eq('story_id', storyId);
    if (data) setViewers(data);
  };

  // ✅ Fixed Story Deletion
  const deleteStory = async (storyId: string) => {
    if (window.confirm("Delete this story? This cannot be undone.")) {
        // 1. Delete from DB
        const { error } = await supabase.from('stories').delete().eq('id', storyId);
        
        if (!error) {
            setViewStory(null); // Close viewer
            fetchStories(); // Refresh list
        } else {
            alert("Failed to delete story.");
        }
    }
  };

  // ✅ Fixed Story Reply (Sends to Inbox)
  const handleSendReply = async (e?: React.FormEvent, customText?: string) => {
    e?.preventDefault();
    const text = customText || replyText;
    
    if (!text.trim() || !viewStory) return;
    setSendingReply(true);

    try {
        const msgData = {
            sender_id: user?.id,
            receiver_id: viewStory.userId, // Send to story owner
            content: `Replied to story: ${text}`,
            type: 'text',
            image_url: viewStory.url, // Attach story image context
            status: 'sent',
            created_at: new Date().toISOString()
        };

        const { error } = await supabase.from('messages').insert(msgData);
        if (!error) {
            setReplyText('');
            alert("Reply sent!");
        } else {
            console.error(error);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setSendingReply(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 transition-colors duration-300">
      
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 sticky top-0 z-40 flex justify-between items-center border-b border-border/40">
        <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-[2px]">
               <img src={appLogo} alt="Logo" className="w-full h-full bg-white rounded-lg object-contain" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">SocialConnect</h1>
        </div>
        <div className="flex gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowNotifications(true)} className="rounded-full bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 relative">
               <Bell size={20} className="text-gray-700 dark:text-gray-200"/>
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onOpenChat} className="rounded-full bg-gray-100/50 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700 relative">
               <MessageCircle size={20} className="text-gray-700 dark:text-gray-200"/>
               <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
            </Button>
        </div>
      </div>

      <div className="max-w-xl mx-auto pt-4">
        {/* Stories Section */}
        <div className="bg-white dark:bg-gray-800 py-6 border-y border-border/40 mb-6 overflow-x-auto no-scrollbar flex gap-4 px-4 shadow-sm">
            <div className="relative">
                <StoryCircle user={{ name: "You", avatar: user?.avatar }} isAddStory onClick={() => storyInputRef.current?.click()} />
                <input type="file" ref={storyInputRef} hidden accept="image/*,video/*" onChange={handleStoryUpload} />
                {uploadingStory && <div className="absolute inset-0 bg-white/80 rounded-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={24} /></div>}
            </div>
            {stories.map((story) => <StoryCircle key={story.id} user={story.users} onClick={() => handleViewStory(story)} />)}
        </div>

        {/* Create Post */}
        <div className="px-4 mb-6">
            <CreatePost onPostCreated={fetchPosts} />
        </div>

        {/* Feed */}
        <div className="px-4 space-y-6">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div> : 
            posts.length === 0 ? <div className="text-center py-16 text-muted-foreground bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-border/40">
                <p className="text-lg font-medium">No posts yet 😢</p>
                <p className="text-sm">Be the first to share something!</p>
            </div> : 
            posts.map(post => <PostCard key={post.id} post={post} onCommentClick={(id) => { setSelectedPostId(id); setShowComments(true); }} onDelete={fetchPosts} onProfileClick={onViewProfile} />)}
        </div>
      </div>

      {/* Modals */}
      <CommentModal isOpen={showComments} onClose={() => setShowComments(false)} postId={selectedPostId} />
      <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} onNavigate={(type, id) => { if (type === 'profile' && onViewProfile) onViewProfile(id); }} />

      {/* ✅ Full Screen Story Viewer (Facebook Style) */}
      {viewStory && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between animate-fade-in">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 p-2 z-50">
                <div className="flex gap-1 h-1 bg-white/30 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all ease-linear duration-100" style={{ width: `${storyProgress}%` }}></div>
                </div>
            </div>

            {/* Header */}
            <div className="absolute top-4 left-0 right-0 px-4 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-blue-500">
                        <AvatarImage src={viewStory.user?.avatar || user?.avatar} />
                        <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="text-white drop-shadow-md">
                        <p className="font-bold text-sm">{viewStory.user?.name || user?.name}</p>
                        <p className="text-xs opacity-80">Just now</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {viewStory.isMine && (
                        <button onClick={() => deleteStory(viewStory.id)} className="text-white hover:bg-white/20 p-2 rounded-full transition">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button onClick={() => setViewStory(null)} className="text-white hover:bg-white/20 p-2 rounded-full transition">
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center bg-black relative w-full h-full">
                {isVideo(viewStory.url) ? (
                     <video src={viewStory.url} className="w-full h-full object-contain max-h-[85vh]" autoPlay playsInline />
                ) : (
                     <img src={viewStory.url} className="w-full h-full object-contain max-h-[85vh]" />
                )}
            </div>

            {/* ✅ Footer Controls (Facebook Style) */}
            <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent z-50 pb-8">
                {viewStory.isMine ? (
                    <div className="flex justify-center items-center gap-2 text-white bg-white/10 backdrop-blur-md p-3 rounded-full mx-auto w-fit cursor-pointer hover:bg-white/20 transition">
                        <Eye size={20} /> 
                        <span className="font-bold">{viewers.length} Views</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 w-full">
                        <form onSubmit={(e) => handleSendReply(e)} className="flex-1 relative">
                            <Input 
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Send message..." 
                                className="w-full bg-transparent border border-white/60 text-white placeholder-white/70 rounded-full pl-4 pr-10 h-11 focus:border-white focus:ring-0"
                            />
                            {replyText && (
                                <button type="submit" disabled={sendingReply} className="absolute right-2 top-1.5 text-white p-1 hover:bg-white/20 rounded-full">
                                    <Send size={18} />
                                </button>
                            )}
                        </form>
                        
                        <button onClick={(e) => handleSendReply(e, '❤️')} className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white shadow-lg active:scale-90 transition-transform">
                            <Heart size={24} fill="currentColor" />
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;