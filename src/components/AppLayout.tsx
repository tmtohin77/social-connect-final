import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import WelcomeScreen from './auth/WelcomeScreen';
import LoginScreen from './auth/LoginScreen';
import RegisterScreen from './auth/RegisterScreen';
import HomeScreen from './home/HomeScreen';
import FriendsScreen from './friends/FriendsScreen';
import ProfileScreen from './profile/ProfileScreen';
import MenuScreen from './menu/MenuScreen';
import ChatListScreen from './messenger/ChatListScreen';
import ChatRoomScreen from './messenger/ChatRoomScreen';
import IncomingCallOverlay from './messenger/IncomingCallOverlay';
import EditProfileModal from './profile/EditProfileModal';
import BottomTabs from './shared/BottomTabs';

type Screen = 'welcome' | 'login' | 'register' | 'home' | 'chatList' | 'chatRoom';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, login, register, logout, updateProfile } = useAuth();
  const [screen, setScreen] = useState<Screen>('welcome');
  const [activeTab, setActiveTab] = useState('home');
  const [chatUser, setChatUser] = useState<any>(null);
  const [showCall, setShowCall] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [showEditProfile, setShowEditProfile] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    const success = await login(email, password);
    if (success) setScreen('home');
  };

  const handleRegister = async (data: any) => {
    const success = await register(data);
    if (success) setScreen('home');
  };

  const openChat = (u: any) => {
    setChatUser(u);
    setScreen('chatRoom');
  };

  const handleCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setShowCall(true);
  };

  // Auth screens
  if (!isAuthenticated) {
    if (screen === 'login') {
      return <LoginScreen onBack={() => setScreen('welcome')} onLogin={handleLogin} onForgotPassword={() => {}} />;
    }
    if (screen === 'register') {
      return <RegisterScreen onBack={() => setScreen('welcome')} onRegister={handleRegister} />;
    }
    return <WelcomeScreen onLogin={() => setScreen('login')} onRegister={() => setScreen('register')} />;
  }

  // Messenger screens
  if (screen === 'chatList') {
    return <ChatListScreen onBack={() => setScreen('home')} onOpenChat={openChat} />;
  }
  if (screen === 'chatRoom' && chatUser) {
    return (
      <>
        <ChatRoomScreen user={chatUser} onBack={() => setScreen('chatList')} onCall={handleCall} />
        {showCall && (
          <IncomingCallOverlay caller={chatUser} callType={callType} 
            onAccept={() => {}} onDecline={() => setShowCall(false)} />
        )}
      </>
    );
  }

  // Main app with tabs
  return (
    <div className="max-w-lg mx-auto bg-gray-50 min-h-screen">
      {activeTab === 'home' && <HomeScreen onOpenMessenger={() => setScreen('chatList')} />}
      {activeTab === 'friends' && <FriendsScreen />}
      {activeTab === 'profile' && <ProfileScreen user={user} onEditProfile={() => setShowEditProfile(true)} />}
      {activeTab === 'menu' && (
        <MenuScreen user={user} onLogout={() => { logout(); setScreen('welcome'); }} 
          onEditProfile={() => setShowEditProfile(true)} />
      )}
      <BottomTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} 
        user={user} onSave={(data) => { updateProfile(data); setShowEditProfile(false); }} />
    </div>
  );
};

const AppLayout: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default AppLayout;
