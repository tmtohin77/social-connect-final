import React, { useEffect, useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    if (isOpen && postId) {
      fetchComments();
    }
  }, [isOpen, postId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, users(name, avatar)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (data) setComments(data);
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('comments').insert({
      user_id: user?.id,
      post_id: postId,
      content: newComment
    });

    if (!error) {
      setNewComment('');
      fetchComments(); // রিফ্রেশ কমেন্ট লিস্ট
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full sm:w-[500px] h-[80vh] sm:h-[600px] rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Comments</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">No comments yet.</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <img src={c.users?.avatar} className="w-8 h-8 rounded-full" />
                <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs">{c.users?.name}</span>
                    <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(c.created_at))} ago</span>
                  </div>
                  <p className="text-sm text-gray-800">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-white pb-6 sm:pb-3">
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-full">
            <img src={user?.avatar} className="w-8 h-8 rounded-full border" />
            <input 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..." 
              className="flex-1 bg-transparent text-sm px-2 focus:outline-none"
            />
            <button onClick={handleSend} disabled={loading || !newComment.trim()} className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;