import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase'; // Import Supabase
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
import CallOverlay from './components/messenger/CallOverlay';
import IncomingCallOverlay from './components/messenger/IncomingCallOverlay';
import { appLogo } from './data/mockData';
import { Home, Search, User, Menu } from 'lucide-react';
import { playSound } from './lib/sounds';

const WelcomeScreen = ({ onLogin, onRegister }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center p-6 text-white text-center">
    <div className="bg-white p-4 rounded-3xl shadow-2xl mb-8 animate-bounce-slow">
      <img src={appLogo} alt="Logo" className="w-20 h-20 rounded-2xl" />
    </div>
    <h1 className="text-4xl font-bold mb-2">SocialConnect</h1>
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
  
  // Call History States
  const callStartTime = useRef<number | null>(null);
  const currentCallerId = useRef<string | null>(null); // রিসিভারের আইডি
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // 1. ইনকামিং কল লিসেনার
  useEffect(() => {
    if (!peer) return;

    peer.on('call', (call) => {
      ringtoneRef.current = playSound('incoming');
      setIncomingCall({
        call,
        callerId: call.peer,
        isVideo: call.metadata?.isVideo,
        callerName: call.metadata?.callerName || "Unknown"
      });
    });

    return () => { peer.off('call'); };
  }, [peer]);

  // 2. কল রিসিভ করা
  const answerCall = async () => {
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
    if (!incomingCall) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.isVideo, audio: true });
      setMyStream(stream);
      setIsVideoCall(incomingCall.isVideo);

      incomingCall.call.answer(stream);
      
      // কল শুরু হওয়ার সময় নোট করো
      callStartTime.current = Date.now();
      currentCallerId.current = incomingCall.callerId;

      incomingCall.call.on('stream', (remoteStream: MediaStream) => {
        setRemoteStream(remoteStream);
      });

      incomingCall.call.on('close', endCallLogic);
      incomingCall.call.on('error', endCallLogic);

      setActiveCall(incomingCall.call);
      setIncomingCall(null);
    } catch (err) {
      console.error('Failed to get stream', err);
      endCallLogic();
    }
  };

  // 3. কল করা
  const startCall = async (receiverId: string, isVideo: boolean) => {
    if (!peer) return;
    setIsVideoCall(isVideo);
    ringtoneRef.current = playSound('calling');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      setMyStream(stream);

      const call = peer.call(receiverId, stream, {
        metadata: { isVideo, callerName: user?.name }
      });

      // কল শুরু হওয়ার সময় এবং রিসিভার আইডি নোট করো
      callStartTime.current = Date.now();
      currentCallerId.current = receiverId;

      call.on('stream', (remoteStream: MediaStream) => {
        if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
        setRemoteStream(remoteStream);
      });

      call.on('close', endCallLogic);
      call.on('error', endCallLogic);

      setActiveCall(call);
    } catch (err) {
      console.error('Failed to start call', err);
      alert('Camera permission needed');
      if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
    }
  };

  // 4. কল কেটে দেওয়া এবং হিস্টরি সেভ করা (✅ Updated)
  const endCallLogic = async () => {
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
    
    if (activeCall) activeCall.close();
    if (incomingCall && incomingCall.call) incomingCall.call.close();
    if (myStream) myStream.getTracks().forEach(track => track.stop());

    // ✅ কল হিস্টরি সেভ করা
    if (callStartTime.current && currentCallerId.current && user) {
        const duration = Math.floor((Date.now() - callStartTime.current) / 1000); // সেকেন্ডে
        
        // শুধুমাত্র যদি কল রিসিভ হয়ে থাকে (duration > 0)
        if (duration > 0) {
            await supabase.from('calls').insert({
                caller_id: user.id, // যে রেকর্ড করছে
                receiver_id: currentCallerId.current,
                type: isVideoCall ? 'video' : 'audio',
                duration: duration
            });
        }
        // রিসেট
        callStartTime.current = null;
        currentCallerId.current = null;
    }
    
    setActiveCall(null);
    setIncomingCall(null);
    setMyStream(null);
    setRemoteStream(null);
  };

  const handleManualEndCall = () => {
    endCallLogic();
  };

  if (loading) return <div className="h-screen flex items-center justify-center dark:bg-gray-900">Loading...</div>;

  if (user) {
    if (incomingCall) {
        return (
            <IncomingCallOverlay 
                callerName={incomingCall.callerName} 
                isVideo={incomingCall.isVideo}
                onAccept={answerCall}
                onReject={() => {
                    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
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
                onEndCall={handleManualEndCall}
                isVideo={isVideoCall}
                callerName={selectedChatUser?.name || "Friend"}
            />
        );
    }

    if (selectedChatUser) {
        return (
            <ChatRoomScreen 
                receiver={selectedChatUser} 
                onBack={() => setSelectedChatUser(null)} 
                onViewProfile={(id) => { setSelectedChatUser(null); setViewProfileId(id); }}
                onStartCall={(video) => startCall(selectedChatUser.id, video)} 
            />
        );
    }

    if (viewProfileId) {
        return (
            <UserProfile 
                userId={viewProfileId} 
                onBack={() => setViewProfileId(null)} 
                onMessage={(u) => { setViewProfileId(null); setSelectedChatUser(u); }} 
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
            <div className="fixed bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-2 pb-3 flex justify-around z-50 shadow transition-colors duration-300">
                <button onClick={() => setAppView('home')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${appView === 'home' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><Home size={24}/><span className="text-[10px] font-bold">Home</span></button>
                <button onClick={() => setAppView('search')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${appView === 'search' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><Search size={24}/><span className="text-[10px] font-bold">Search</span></button>
                <button onClick={() => setAppView('profile')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${appView === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><User size={24}/><span className="text-[10px] font-bold">Profile</span></button>
                <button onClick={() => setAppView('menu')} className={`p-2 rounded-xl flex flex-col items-center gap-1 ${appView === 'menu' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><Menu size={24}/><span className="text-[10px] font-bold">Menu</span></button>
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