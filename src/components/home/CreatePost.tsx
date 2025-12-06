import React, { useState, useRef } from 'react';
import { Image, Send, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

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

      // 1. Upload Image (if selected)
      if (image) {
        const fileExt = image.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('post_images')
          .upload(fileName, image);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('post_images').getPublicUrl(fileName);
        imageUrl = data.publicUrl;
      }

      // 2. Insert Post to Database
      const { error: dbError } = await supabase
        .from('posts')
        .insert({
          user_id: user?.id,
          content: content,
          image_url: imageUrl
        });

      if (dbError) throw dbError;

      // 3. Reset Form
      setContent('');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      // 4. Refresh Feed
      onPostCreated();

    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex gap-3 mb-4">
        <img src={user?.avatar} alt="Me" className="w-10 h-10 rounded-full bg-gray-200" />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`What's on your mind, ${user?.name}?`}
          className="w-full bg-gray-50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none h-20"
        />
      </div>

      {image && (
        <div className="relative mb-4">
          <img src={URL.createObjectURL(image)} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
          <button 
            onClick={() => setImage(null)}
            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-gray-50">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50"
        >
          <Image size={20} />
          <span className="text-sm font-medium">Photo</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageSelect} 
          className="hidden" 
          accept="image/*"
        />

        <button 
          onClick={handleSubmit}
          disabled={loading || (!content && !image)}
          className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Post</>}
        </button>
      </div>
    </div>
  );
};

export default CreatePost;