import React, { useEffect, useState } from 'react';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

const CommentModal: React.FC<CommentModalProps> = ({ isOpen, onClose, postId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && postId) fetchComments();
  }, [isOpen, postId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('comments')
      .select('*, users(name, avatar)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (data) setComments(data);
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSending(true);

    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: user?.id,
      content: newComment
    });

    if (!error) {
      setNewComment('');
      // Send Notification Logic (Optional)
      fetchComments();
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if(confirm("Delete comment?")) {
        await supabase.from('comments').delete().eq('id', id);
        setComments(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border/50">
            <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4 bg-gray-50/50 dark:bg-gray-900/50">
          {loading ? (
             <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-primary"/></div>
          ) : comments.length === 0 ? (
             <div className="text-center mt-10 text-muted-foreground">No comments yet.</div>
          ) : (
            <div className="space-y-4">
                {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3 group">
                        <Avatar className="w-8 h-8 mt-1">
                            <AvatarImage src={comment.users?.avatar} />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-border/40 relative">
                                <h4 className="font-bold text-xs text-foreground mb-1">{comment.users?.name}</h4>
                                <p className="text-sm text-foreground/90">{comment.content}</p>
                                
                                {user?.id === comment.user_id && (
                                    <button onClick={() => handleDelete(comment.id)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-border/50 bg-background">
            <form onSubmit={handleSend} className="flex gap-2 items-center">
                <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} />
                </Avatar>
                <Input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 h-10 rounded-full"
                />
                <Button type="submit" size="icon" disabled={sending} className="rounded-full h-10 w-10 shrink-0">
                    {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                </Button>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentModal;