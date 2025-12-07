import React, { useState, useRef } from 'react';
import { Image, Send, Loader2, X, Video, Smile } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Textarea } from '../ui/textarea';

interface CreatePostProps {
  onPostCreated: () => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !image) return;
    setLoading(true);

    try {
      let imageUrl = null;
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('post_images').upload(fileName, image);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      const { error: dbError } = await supabase.from('posts').insert({
          user_id: user?.id,
          content: content,
          image_url: imageUrl
        });

      if (dbError) throw dbError;

      setContent('');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onPostCreated();

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  return (
    <Card className="mb-6 border-none shadow-md bg-white dark:bg-gray-800 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.substring(0, 2)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What's on your mind, ${user?.name}?`}
              className="bg-gray-50 dark:bg-gray-900 border-none resize-none focus-visible:ring-1 min-h-[80px]"
            />
            
            {image && (
                <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    <img src={URL.createObjectURL(image)} alt="Preview" className="w-full max-h-60 object-contain" />
                    <button onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20">
                        <Image size={18} className="mr-2" /> Photo
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Video size={18} className="mr-2" /> Video
                    </Button>
                    <Button variant="ghost" size="sm" className="hidden sm:flex text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                        <Smile size={18} className="mr-2" /> Feeling
                    </Button>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />

                <Button onClick={handleSubmit} disabled={loading || (!content && !image)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={16} className="mr-2" /> Post</>}
                </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePost;