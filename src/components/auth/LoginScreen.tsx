import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import CustomInput from '../shared/CustomInput';
import { appLogo } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onBack: () => void;
  onRegisterClick: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onBack, onRegisterClick }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await login(email, password);
    
    if (error) {
      setError('Invalid email or password');
      setLoading(false);
    }
    // Success is handled by AuthContext (App.tsx will switch screen)
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 pt-12 pb-20 px-6 rounded-b-3xl">
        <button onClick={onBack} className="text-white mb-6 flex items-center gap-2 hover:opacity-80">
          <ArrowLeft size={24} /> Back
        </button>
        <div className="flex items-center gap-4">
          <img src={appLogo} alt="Logo" className="w-12 h-12 rounded-xl" />
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome Back!</h1>
            <p className="text-blue-100">Sign in to continue</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-10">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleSubmit}>
            <CustomInput label="Email" type="email" value={email} onChange={setEmail} placeholder="Enter your email" icon={<Mail size={20} />} />
            <CustomInput label="Password" value={password} onChange={setPassword} placeholder="Enter your password" icon={<Lock size={20} />} showPasswordToggle />
            
            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all active:scale-95 flex justify-center items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">Don't have an account?</p>
            <button onClick={onRegisterClick} className="text-blue-600 font-semibold hover:underline">Create New Account</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;