import React, { useState } from 'react';
import { User, Mail, Lock, Calendar, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

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
    setError('');
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
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 p-4 animate-slide-up">
        <Card className="w-full max-w-md shadow-2xl text-center p-4">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Verify Email</CardTitle>
            <CardDescription>We sent a 6-digit code to <span className="font-bold text-foreground">{formData.contact}</span></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
                value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                placeholder="Enter 6-digit code" 
                className="text-center text-2xl tracking-widest font-mono h-14" 
                maxLength={6}
            />
            <Button onClick={handleVerify} className="w-full" disabled={loading} size="lg">
              {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5"/>}
              Verify Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-gray-900/50 p-4 animate-fade-in py-10">
      <Card className="w-full max-w-md shadow-xl border-border/50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 h-8 w-8 rounded-full">
                <ArrowLeft className="h-4 w-4"/>
            </Button>
            <CardTitle className="text-xl">Create Account</CardTitle>
          </div>
          <CardDescription>Fill in your details to get started.</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="pl-10" placeholder="John Doe" required />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input type="email" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="pl-10" placeholder="name@example.com" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Age</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        <Input type="number" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="pl-10" placeholder="25" required />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <select 
                        className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={formData.gender} 
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="pl-10" placeholder="Create a strong password" required />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}

            <Button type="submit" className="w-full font-bold shadow-lg mt-2" size="lg" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Sign Up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-4">
             <p className="text-sm text-muted-foreground">Already have an account? <button onClick={onBack} className="text-primary font-bold hover:underline">Log in</button></p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterScreen;