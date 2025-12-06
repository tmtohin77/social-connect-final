import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Trash2, Copy, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ShareModal from '../home/ShareModal';

interface PostCardProps {
  post: any;
  onCommentClick: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
  onDelete?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onCommentClick, onProfileClick, onDelete }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // যদি এটা শেয়ার করা পোস্ট হয়, তাহলে আসল কন্টেন্ট সেট করো
  const isShared = !!post.original_post;
  const displayPost = isShared ? post.original_post : post;

  useEffect(() => {
    if (user) checkLikeStatus();
  }, [user]);

  const checkLikeStatus = async () => {
    const { data } = await supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', user?.id).single();
    if (data) setLiked(true);
  };

  const handleLike = async () => {
    if (!user) return;
    const previousLiked = liked;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);

    if (previousLiked) await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
    else await supabase.from('likes').insert({ post_id: post.id, user_id: user.id });
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this post?")) {
        await supabase.from('posts').delete().eq('id', post.id);
        if (onDelete) onDelete();
    }
    setShowMenu(false);
  };

  // শেয়ারড পোস্টের ভিতরের ডিজাইন (Nested Post)
  const SharedContent = () => (
    <div className="mt-2 mx-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      <div className="p-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <img src={displayPost.users?.avatar} className="w-8 h-8 rounded-full border object-cover" />
        <div>
          <h4 className="font-bold text-sm text-gray-900 dark:text-white">{displayPost.users?.name}</h4>
          <p className="text-[10px] text-gray-500">{formatDistanceToNow(new Date(displayPost.created_at))} ago</p>
        </div>
      </div>
      <div className="p-3">
         {displayPost.content && <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{displayPost.content}</p>}
      </div>
      {displayPost.image_url && <img src={displayPost.image_url} className="w-full h-auto object-cover" />}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sm:rounded-xl sm:border sm:shadow-sm mb-4 transition-colors duration-300 relative pt-1">
      
      {/* Header (যে পোস্ট শেয়ার করেছে তার নাম) */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onProfileClick && onProfileClick(post.user_id)}>
          <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px] rounded-full">
            <img src={post.users?.avatar} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-white dark:border-gray-800 object-cover" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-2">
              {post.users?.name}
              {isShared && <span className="text-gray-500 font-normal text-xs">shared a post</span>}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
          </div>
        </div>
        
        {/* Menu */}
        <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><MoreHorizontal size={20} /></button>
            {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-gray-700 shadow-xl rounded-lg w-32 py-2 z-10 border dark:border-gray-600">
                    {user?.id === post.user_id && (
                        <button onClick={handleDelete} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-500 text-sm flex gap-2"><Trash2 size={16}/> Delete</button>
                    )}
                    <button onClick={() => setShowMenu(false)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm dark:text-white flex gap-2"><X size={16}/> Close</button>
                </div>
            )}
        </div>
      </div>

      {/* Main Content (ক্যাপশন) */}
      {post.content && !isShared && (
        <p className="px-4 pb-3 text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>
      )}
      
      {/* শেয়ার করা হলে এখানে ক্যাপশন */}
      {isShared && post.content && (
         <p className="px-4 pb-2 text-gray-800 dark:text-gray-200 text-sm">{post.content}</p>
      )}

      {/* Media / Shared Post */}
      {isShared ? (
        <SharedContent />
      ) : (
        post.image_url && <img src={post.image_url} className="w-full h-auto max-h-[500px] object-cover bg-gray-100 dark:bg-gray-900" loading="lazy" />
      )}

      {/* Actions */}
      <div className="p-3 mt-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-6">
            <button onClick={handleLike}><Heart size={24} className={`${liked ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-300'}`} /></button>
            <button onClick={() => onCommentClick(post.id)}><MessageCircle size={24} className="text-gray-600 dark:text-gray-300 -rotate-90" /></button>
            <button onClick={() => setShowShareModal(true)}><Share2 size={24} className="text-gray-600 dark:text-gray-300" /></button>
          </div>
          <button onClick={() => setSaved(!saved)}><Bookmark size={24} className={`${saved ? 'fill-black dark:fill-white' : 'text-gray-600 dark:text-gray-300'}`} /></button>
        </div>
        <p className="font-bold text-sm text-gray-900 dark:text-white">{likeCount} likes</p>
      </div>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} post={post} />
    </div>
  );
};

export default PostCard;