import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import ShareModal from '../home/ShareModal';
import { Card, CardContent, CardFooter, CardHeader } from './card';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Button } from './button';

interface PostCardProps {
  post: any;
  onCommentClick: (postId: string) => void;
  onProfileClick?: (userId: string) => void;
  onDelete?: () => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onCommentClick, onProfileClick, onDelete }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes_count || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

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

  // Shared Content Design
  const SharedContent = () => (
    <div className="mt-3 border border-border rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900/50">
      <div className="p-3 flex items-center gap-2 border-b border-border/50">
        <Avatar className="w-6 h-6">
            <AvatarImage src={displayPost.users?.avatar} />
        </Avatar>
        <div>
          <h4 className="font-bold text-xs text-foreground">{displayPost.users?.name}</h4>
          <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(displayPost.created_at))} ago</p>
        </div>
      </div>
      <div className="p-3">
         {displayPost.content && <p className="text-sm text-foreground/90 whitespace-pre-wrap">{displayPost.content}</p>}
      </div>
      {displayPost.image_url && <img src={displayPost.image_url} className="w-full h-auto object-cover" />}
    </div>
  );

  return (
    <Card className="mb-4 overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div onClick={() => onProfileClick && onProfileClick(post.user_id)} className="cursor-pointer">
              <Avatar className="w-10 h-10 ring-2 ring-background">
                <AvatarImage src={post.users?.avatar} />
                <AvatarFallback>{post.users?.name?.substring(0, 2)}</AvatarFallback>
              </Avatar>
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2 cursor-pointer hover:underline" onClick={() => onProfileClick && onProfileClick(post.user_id)}>
              {post.users?.name}
              {isShared && <span className="text-muted-foreground font-normal text-xs">shared a post</span>}
            </h4>
            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
          </div>
        </div>
        
        <div className="relative">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowMenu(!showMenu)}>
                <MoreHorizontal size={18} />
            </Button>
            {showMenu && (
                <div className="absolute right-0 top-10 bg-popover text-popover-foreground shadow-xl rounded-lg w-32 py-1 z-10 border animate-in fade-in zoom-in-95 duration-200">
                    {user?.id === post.user_id && (
                        <button onClick={handleDelete} className="w-full text-left px-3 py-2 hover:bg-muted text-red-500 text-sm flex gap-2 items-center"><Trash2 size={14}/> Delete</button>
                    )}
                    <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex gap-2 items-center"><X size={14}/> Close</button>
                </div>
            )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {post.content && !isShared && (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words mb-3">{post.content}</p>
        )}
        
        {isShared && post.content && (
           <p className="text-sm text-foreground/90 mb-2">{post.content}</p>
        )}

        {isShared ? (
          <SharedContent />
        ) : (
          post.image_url && (
            <div className="rounded-xl overflow-hidden border border-border/50 bg-gray-100 dark:bg-gray-900">
                <img src={post.image_url} className="w-full h-auto max-h-[500px] object-cover" loading="lazy" />
            </div>
          )
        )}
      </CardContent>

      <CardFooter className="p-2 border-t border-border/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/30">
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleLike} className={`gap-2 ${liked ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-muted-foreground'}`}>
                <Heart size={20} className={liked ? 'fill-current' : ''} />
                <span className="font-bold">{likeCount > 0 ? likeCount : 'Like'}</span>
            </Button>
            
            <Button variant="ghost" size="sm" onClick={() => onCommentClick(post.id)} className="gap-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                <MessageCircle size={20} />
                <span className="font-bold">Comment</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => setShowShareModal(true)} className="gap-2 text-muted-foreground hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20">
                <Share2 size={20} />
                <span className="font-bold">Share</span>
            </Button>
        </div>
        
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-yellow-500">
            <Bookmark size={20} />
        </Button>
      </CardFooter>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} post={post} />
    </Card>
  );
};

export default PostCard;