import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, Lock, User, Loader2 } from 'lucide-react';

const SettingsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      // 1. Update Profile Name
      if (name !== user?.name) {
        await supabase.from('users').update({ name }).eq('id', user?.id);
      }

      // 2. Update Password (if provided)
      if (password) {
        await supabase.auth.updateUser({ password: password });
      }

      alert("Settings updated successfully!");
      if (password) {
        alert("Password changed. Please login again.");
        logout();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to update settings.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 shadow-sm flex items-center gap-3 sticky top-0 z-10 border-b dark:border-gray-700">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full dark:text-white"><ArrowLeft size={22}/></button>
        <h1 className="text-xl font-bold dark:text-white">Settings & Privacy</h1>
      </div>

      <div className="p-4 space-y-6 max-w-md mx-auto">
        {/* Personal Details */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2"><User size={18}/> Personal Details</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
              <p className="text-gray-900 dark:text-white font-medium">{user?.email}</p>
            </div>
            
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full mt-1 p-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2"><Lock size={18}/> Security</h3>
          
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">New Password</label>
            <input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter new password to change"
              className="w-full mt-1 p-3 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-blue-500"
            />
          </div>
        </div>

        <button onClick={handleUpdate} disabled={loading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 flex justify-center items-center gap-2">
          {loading ? <Loader2 className="animate-spin"/> : <><Save size={20}/> Save Changes</>}
        </button>

        {/* Terms */}
        <div className="text-center pt-8 pb-4">
            <p className="text-xs text-gray-400">
                By using SocialConnect, you agree to our <br/>
                <span className="text-blue-500 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-blue-500 cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;