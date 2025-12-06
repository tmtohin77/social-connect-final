import React, { useState } from 'react';
import { User, Mail, Lock, ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import CustomInput from '../shared/CustomInput';
import { appLogo } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface RegisterScreenProps {
  onBack: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onBack }) => {
  const { register, verifyEmail } = useAuth();
  const [step, setStep] = useState<'form' | 'otp'>('form');
  
  const [formData, setFormData] = useState({ name: '', age: '', gender: 'Male', contact: '', password: '' });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await register(formData);
    setLoading(false);

    if (error) setError(error.message);
    else setStep('otp');
  };

  const handleVerify = async () => {
    setLoading(true);
    const { error } = await verifyEmail(formData.contact, otp.trim());
    setLoading(false);
    
    if (error) alert('Invalid Code');
    // Success handled by App.tsx
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Check Email</h2>
          <p className="text-gray-500 mb-6">Code sent to {formData.contact}</p>
          <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter Code" className="w-full text-center text-2xl py-3 border rounded-xl mb-6" />
          <button onClick={handleVerify} disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold">
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 pt-12 pb-16 px-6 rounded-b-3xl">
        <button onClick={onBack} className="text-white mb-4 flex items-center gap-2"><ArrowLeft size={24} /> Back</button>
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
      </div>
      <div className="px-6 -mt-8">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <form onSubmit={handleRegister}>
            <CustomInput label="Name" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} icon={<User size={20} />} />
            <CustomInput label="Email" value={formData.contact} onChange={(v) => setFormData({...formData, contact: v})} icon={<Mail size={20} />} />
            <div className="grid grid-cols-2 gap-4">
              <CustomInput label="Age" type="number" value={formData.age} onChange={(v) => setFormData({...formData, age: v})} icon={<Calendar size={20} />} />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select className="w-full p-3 border rounded-xl bg-gray-50" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
            </div>
            <CustomInput label="Password" value={formData.password} onChange={(v) => setFormData({...formData, password: v})} icon={<Lock size={20} />} showPasswordToggle />
            
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            
            <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl mt-2">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Get Code'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;