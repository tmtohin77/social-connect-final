import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import RegisterScreen from './components/auth/RegisterScreen';
import HomeScreen from './pages/Home';
import ProfileScreen from './pages/Profile';
import MenuScreen from './components/menu/MenuScreen';
import ChatListScreen from './components/messenger/ChatListScreen'; // নতুন ইমপোর্ট
import ChatRoomScreen from './components/messenger/ChatRoomScreen'; // নতুন ইমপোর্ট
import { appLogo } from './data/mockData';
import { Home, Search, User, Menu } from 'lucide-react';

// Welcome Screen
const WelcomeScreen = ({ onLogin, onRegister }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center p-6 text-white text-center">
    <div className="bg-white p-4 rounded-3xl shadow-2xl mb-8 animate-bounce-slow">
      <img src={appLogo} alt="Logo" className="w-20 h-20 rounded-2xl" />
    </div>
    <h1 className="text-4xl font-bold mb-2">SocialConnect</h1>
    <p className="text-blue-100 mb-12 max-w-xs">Connect with friends and the world around you.</p>
    <div className="w-full max-w-xs space-y-4">
      <button onClick={onLogin} className="w-full py-4 bg-white text-blue-600 font-bold rounded-xl shadow-lg active:scale-95 transition-all">Log In</button>
      <button onClick={onRegister} className="w-full py-4 bg-blue-500/30 backdrop-blur-md border border-white/30 font-bold rounded-xl active:scale-95 transition-all">Create Account</button>
    </div>
  </div>
);

// Main Content Logic
const AppContent = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<'welcome' | 'login' | 'register'>('welcome');
  
  // Navigation States
  const [appView, setAppView] = useState<'home' | 'search' | 'profile' | 'menu' | 'chat'>('home');
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null); // চ্যাট করার মানুষ

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600">Loading...</div>;

  // -- Authenticated View --
  if (user) {
    // ১. যদি কোনো চ্যাট ওপেন থাকে (ফুল স্ক্রিন)
    if (selectedChatUser) {
        return <ChatRoomScreen receiver={selectedChatUser} onBack={() => setSelectedChatUser(null)} />;
    }

    // ২. যদি চ্যাট লিস্ট বা অন্যান্য পেজ থাকে
    return (
      <>
        {appView === 'home' && <HomeScreen onOpenChat={() => setAppView('chat')} />}
        {appView === 'profile' && <ProfileScreen onBack={() => setAppView('home')} />}
        {appView === 'menu' && <MenuScreen />}
        {appView === 'chat' && (
            <div className="relative h-screen">
                {/* চ্যাট লিস্ট পেজের উপরে ব্যাক বাটন */}
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={() => setAppView('home')} className="bg-gray-100 p-2 rounded-full font-bold text-sm">Back to Home</button>
                </div>
                <ChatListScreen onSelectUser={setSelectedChatUser} />
            </div>
        )}
        {appView === 'search' && <div className="h-screen flex items-center justify-center">Search Coming Soon...</div>}

        {/* Global Bottom Navigation (চ্যাট পেজে হাইড থাকবে) */}
        {appView !== 'chat' && (
            <div className="fixed bottom-0 w-full bg-white border-t p-2 pb-3 flex justify-around z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
            <button onClick={() => setAppView('home')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${appView === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                <Home size={24} strokeWidth={appView === 'home' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Home</span>
            </button>
            
            <button onClick={() => setAppView('search')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${appView === 'search' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                <Search size={24} strokeWidth={appView === 'search' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Search</span>
            </button>

            <button onClick={() => setAppView('profile')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${appView === 'profile' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                <User size={24} strokeWidth={appView === 'profile' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Profile</span>
            </button>

            <button onClick={() => setAppView('menu')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${appView === 'menu' ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
                <Menu size={24} strokeWidth={appView === 'menu' ? 2.5 : 2} />
                <span className="text-[10px] font-bold">Menu</span>
            </button>
            </div>
        )}
      </>
    );
  }

  // -- Guest View --
  if (authView === 'login') return <LoginScreen onBack={() => setAuthView('welcome')} onRegisterClick={() => setAuthView('register')} />;
  if (authView === 'register') return <RegisterScreen onBack={() => setAuthView('welcome')} />;
  return <WelcomeScreen onLogin={() => setAuthView('login')} onRegister={() => setAuthView('register')} />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;