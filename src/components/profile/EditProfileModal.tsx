import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Camera, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar);
  const [coverPreview, setCoverPreview] = useState(user?.cover_photo);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    if (e.target.files?.[0]) {
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
    try {
      let avatarUrl = user?.avatar;
      let coverUrl = user?.cover_photo;

      if (avatarFile) {
        const fileName = `avatar_${user?.id}_${Date.now()}`;
        await supabase.storage.from('avatars').upload(fileName, avatarFile);
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }

      if (coverFile) {
        const fileName = `cover_${user?.id}_${Date.now()}`;
        await supabase.storage.from('avatars').upload(fileName, coverFile); // Using avatars bucket for now
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        coverUrl = data.publicUrl;
      }

      await supabase.from('users').update({
        name,
        bio,
        avatar: avatarUrl,
        cover_photo: coverUrl
      }).eq('id', user?.id);

      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Cover Photo */}
          <div className="relative h-32 w-full rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden group">
             {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500"></div>
             )}
             <label className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="text-white" />
                <input type="file" hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'cover')} />
             </label>
          </div>

          {/* Avatar */}
          <div className="flex justify-center -mt-16 relative z-10">
             <div className="relative group">
                <Avatar className="w-24 h-24 border-4 border-background ring-2 ring-border">
                    <AvatarImage src={avatarPreview} />
                    <AvatarFallback>ME</AvatarFallback>
                </Avatar>
                <label className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="text-white w-6 h-6" />
                    <input type="file" hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'avatar')} />
                </label>
             </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write something about yourself..." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4"/>}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;