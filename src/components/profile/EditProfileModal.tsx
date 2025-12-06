import React, { useState } from 'react';
import { X, Camera, Save, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const EditProfileModal: React.FC<EditProfileProps> = ({ isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || ''); // Bio State
  const [loading, setLoading] = useState(false);

  // Image handling
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // Previews
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar);
  const [coverPreview, setCoverPreview] = useState(user?.cover_photo);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      } else {
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let avatarUrl = user?.avatar;
    let coverUrl = user?.cover_photo;

    try {
      // 1. Upload Avatar if changed
      if (avatarFile) {
        const fileName = `avatar_${user?.id}_${Date.now()}`;
        await supabase.storage.from('avatars').upload(fileName, avatarFile);
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }

      // 2. Upload Cover if changed
      if (coverFile) {
        const fileName = `cover_${user?.id}_${Date.now()}`;
        await supabase.storage.from('avatars').upload(fileName, coverFile); // Same bucket
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        coverUrl = data.publicUrl;
      }

      // 3. Update Database
      const { error } = await supabase.from('users').update({
        name,
        bio,
        avatar: avatarUrl,
        cover_photo: coverUrl
      }).eq('id', user?.id);

      if (!error) {
        onUpdate(); // Refresh Profile
        onClose();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-lg">Edit Profile</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Cover Photo Edit */}
          <div className="relative h-32 bg-gray-200 rounded-xl overflow-hidden group">
            {coverPreview ? (
              <img src={coverPreview} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No Cover Photo</div>
            )}
            <label className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Camera className="text-white" />
              <input type="file" hidden onChange={(e) => handleImageChange(e, 'cover')} />
            </label>
          </div>

          {/* Avatar Edit */}
          <div className="relative w-24 h-24 mx-auto -mt-16">
            <img src={avatarPreview} className="w-full h-full rounded-full border-4 border-white object-cover bg-white" />
            <label className="absolute bottom-0 right-0 bg-blue-600 p-1.5 rounded-full text-white cursor-pointer border-2 border-white hover:bg-blue-700">
              <Camera size={14} />
              <input type="file" hidden onChange={(e) => handleImageChange(e, 'avatar')} />
            </label>
          </div>

          {/* Inputs */}
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 focus:outline-blue-500 mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Bio</label>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              placeholder="Describe yourself..."
              className="w-full p-3 border rounded-xl bg-gray-50 focus:outline-blue-500 mt-1 h-24 resize-none" 
            />
          </div>

          <button onClick={handleSave} disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;