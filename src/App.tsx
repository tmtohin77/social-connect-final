import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import RegisterScreen from './components/auth/RegisterScreen';
import HomeScreen from './pages/Home';
import ProfileScreen from './pages/Profile';
import UserProfile from './pages/UserProfile';
import MenuScreen from './components/menu/MenuScreen';
import SearchScreen from './components/shared/SearchScreen';
import ChatListScreen from './components/messenger/ChatListScreen';
import ChatRoomScreen from './components/messenger/ChatRoomScreen';
import CallOverlay from './components/messenger/CallOverlay'; // ✅ নতুন
import IncomingCallOverlay from './components/messenger/IncomingCallOverlay'; // ✅ নতুন
import { appLogo } from './data/mockData';
import { Home, Search, User, Menu } from 'lucide-react';

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

const AppContent = () => {
  const { user, loading, peer } = useAuth();
  const [authView, setAuthView] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [appView, setAppView] = useState<'home' | 'search' | 'profile' | 'menu' | 'chat'>('home');
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  // Call States
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoCall, setIsVideoCall] = useState(true);

  // 1. ইনকামিং কল লিসেনার (কেউ কল করলে)
  useEffect(() => {
    if (!peer) return;

    peer.on('call', (call) => {
      // রিং হচ্ছে...
      setIncomingCall({
        call,
        callerId: call.peer,
        isVideo: call.metadata?.isVideo
      });
    });

    return () => {
      peer.off('call');
    };
  }, [peer]);

  // 2. কল রিসিভ করা (Answer)
  const answerCall = async () => {
    if (!incomingCall) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.isVideo, audio: true });
      setMyStream(stream);
      setIsVideoCall(incomingCall.isVideo);

      incomingCall.call.answer(stream); // কল ধরলাম
      
      incomingCall.call.on('stream', (remoteStream: MediaStream) => {
        setRemoteStream(remoteStream);
      });

      incomingCall.call.on('close', endCall);

      setActiveCall(incomingCall.call);
      setIncomingCall(null);
    } catch (err) {
      console.error('Failed to get local stream', err);
      endCall();
    }
  };

  // 3. কল করা (Start Call)
  const startCall = async (receiverId: string, isVideo: boolean) => {
    if (!peer) return;
    setIsVideoCall(isVideo);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      setMyStream(stream);

      const call = peer.call(receiverId, stream, {
        metadata: { isVideo, callerName: user?.name }
      });

      call.on('stream', (remoteStream: MediaStream) => {
        setRemoteStream(remoteStream);
      });

      call.on('close', endCall);
      setActiveCall(call);
    } catch (err) {
      console.error('Failed to start call', err);
      alert('Camera/Microphone permission denied');
    }
  };

  // 4. কল কেটে দেওয়া (End Call)
  const endCall = () => {
    if (activeCall) activeCall.close();
    if (myStream) myStream.getTracks().forEach(track => track.stop());
    
    setActiveCall(null);
    setIncomingCall(null);
    setMyStream(null);
    setRemoteStream(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-blue-600 dark:bg-gray-900">Loading...</div>;

  if (user) {
    // -- CALL SCREENS (সবার উপরে থাকবে) --
    if (incomingCall) {
        return (
            <IncomingCallOverlay 
                callerName="Friend calling..." 
                isVideo={incomingCall.isVideo}
                onAccept={answerCall}
                onReject={() => {
                    incomingCall.call.close();
                    setIncomingCall(null);
                }}
            />
        );
    }

    if (activeCall) {
        return (
            <CallOverlay 
                stream={myStream}
                remoteStream={remoteStream}
                onEndCall={endCall}
                isVideo={isVideoCall}
                callerName={selectedChatUser?.name || "Friend"}
            />
        );
    }

    // -- NORMAL APP SCREENS --
    if (selectedChatUser) {
        return (
            <ChatRoomScreen 
                receiver={selectedChatUser} 
                onBack={() => setSelectedChatUser(null)} 
                onViewProfile={(id) => {
                    setSelectedChatUser(null);
                    setViewProfileId(id);
                }}
                onStartCall={(video) => startCall(selectedChatUser.id, video)} // ✅ কল বাটন কানেক্টেড
            />
        );
    }

    if (viewProfileId) {
        return (
            <UserProfile 
                userId={viewProfileId} 
                onBack={() => setViewProfileId(null)} 
                onMessage={(u) => {
                    setViewProfileId(null);
                    setSelectedChatUser(u);
                }} 
            />
        );
    }

    return (
      <div className="dark:bg-gray-900 min-h-screen transition-colors duration-300">
        {appView === 'home' && <HomeScreen onOpenChat={() => setAppView('chat')} onViewProfile={(id) => setViewProfileId(id)} />}
        {appView === 'profile' && <ProfileScreen onBack={() => setAppView('home')} />}
        {appView === 'menu' && <MenuScreen />}
        {appView === 'search' && <SearchScreen />}
        
        {appView === 'chat' && (
            <div className="relative h-screen bg-white dark:bg-gray-900">
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={() => setAppView('home')} className="bg-gray-100 dark:bg-gray-800 dark:text-white p-2 rounded-full font-bold text-xs shadow-md">Back</button>
                </div>
                <ChatListScreen onSelectUser={setSelectedChatUser} />
            </div>
        )}

        {appView !== 'chat' && (
            <div className="fixed bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-2 pb-3 flex justify-around z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] transition-colors duration-300">
                {/* Navigation Buttons (Same as before) */}
                <button onClick={() => setAppView('home')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${appView === 'home' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-800' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <Home size={24} strokeWidth={appView === 'home' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Home</span>
                </button>
                <button onClick={() => setAppView('search')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${appView === 'search' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-800' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <Search size={24} strokeWidth={appView === 'search' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Search</span>
                </button>
                <button onClick={() => setAppView('profile')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${appView === 'profile' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-800' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <User size={24} strokeWidth={appView === 'profile' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Profile</span>
                </button>
                <button onClick={() => setAppView('menu')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${appView === 'menu' ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-gray-800' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <Menu size={24} strokeWidth={appView === 'menu' ? 2.5 : 2} />
                    <span className="text-[10px] font-bold">Menu</span>
                </button>
            </div>
        )}
      </div>
    );
  }

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