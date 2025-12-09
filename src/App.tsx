import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/auth/LoginScreen';
import RegisterScreen from './components/auth/RegisterScreen';
import HomeScreen from './pages/Home';
import ProfileScreen from './pages/Profile';
import UserProfile from './pages/UserProfile';
import MenuScreen from './components/menu/MenuScreen';
import SearchScreen from './components/shared/SearchScreen';
import SettingsScreen from './pages/SettingsScreen';
import FriendsScreen from './components/friends/FriendsScreen';
import ChatListScreen from './components/messenger/ChatListScreen';
import ChatRoomScreen from './components/messenger/ChatRoomScreen';
import CallOverlay from './components/messenger/CallOverlay';
import IncomingCallOverlay from './components/messenger/IncomingCallOverlay';
import { appLogo } from './data/mockData';
import { Home, Search, User, Menu, Users } from 'lucide-react';
import { playSound } from './lib/sounds';

const WelcomeScreen = ({ onLogin, onRegister }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex flex-col items-center justify-center p-6 text-white text-center animate-fade-in">
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
  const [appView, setAppView] = useState<'home' | 'search' | 'profile' | 'menu' | 'chat' | 'friends' | 'settings'>('home');
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  // Call States
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoCall, setIsVideoCall] = useState(true);
  
  const callStartTime = useRef<number | null>(null);
  const currentCallerId = useRef<string | null>(null); // The other person's ID
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // 1. Listen for Incoming Peer Calls
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
      currentCallerId.current = call.peer; // Store who is calling
    });

    return () => { peer.off('call'); };
  }, [peer]);

  // 2. ✅ Listen for "Hangup" Signals via Supabase Realtime
  // যদি অন্য পাশ থেকে কল কেটে দেয়, তাহলে এই লিসেনার সেটা ধরবে এবং আমার কলও কেটে দিবে
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('call_signaling')
      .on('broadcast', { event: 'hangup' }, ({ payload }) => {
        // যদি সিগন্যালটি আমার জন্য হয় (payload.to === my ID), কল কেটে দাও
        if (payload.to === user.id) {
          endCallLogic(false); // false = Don't send signal back (to avoid loop)
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const answerCall = async () => {
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
    if (!incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.isVideo, audio: true });
      setMyStream(stream);
      setIsVideoCall(incomingCall.isVideo);
      
      incomingCall.call.answer(stream); // Answer the call
      
      callStartTime.current = Date.now();
      currentCallerId.current = incomingCall.callerId; // Store caller ID

      incomingCall.call.on('stream', (remoteStream: MediaStream) => setRemoteStream(remoteStream));
      incomingCall.call.on('close', () => endCallLogic(false));
      incomingCall.call.on('error', () => endCallLogic(false));
      
      setActiveCall(incomingCall.call);
      setIncomingCall(null);
    } catch (err) { console.error(err); endCallLogic(true); }
  };

  const startCall = async (receiverId: string, isVideo: boolean) => {
    if (!peer) return;
    setIsVideoCall(isVideo);
    ringtoneRef.current = playSound('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      setMyStream(stream);
      
      const call = peer.call(receiverId, stream, { metadata: { isVideo, callerName: user?.name } });
      callStartTime.current = Date.now();
      currentCallerId.current = receiverId; // Store receiver ID

      call.on('stream', (remoteStream: MediaStream) => {
        if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
        setRemoteStream(remoteStream);
      });
      call.on('close', () => endCallLogic(false));
      call.on('error', () => endCallLogic(false));
      
      setActiveCall(call);
    } catch (err) { 
        console.error(err); 
        alert('Camera/Mic permission needed'); 
        if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
    }
  };

  // ✅ Updated End Call Logic (Sends Signal to Other User)
  const endCallLogic = async (notifyOtherUser = true) => {
    // 1. Stop Ringtone
    if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; }
    
    // 2. Notify other user via Supabase Realtime (Critical Fix)
    if (notifyOtherUser && currentCallerId.current) {
        await supabase.channel('call_signaling').send({
            type: 'broadcast',
            event: 'hangup',
            payload: { to: currentCallerId.current }
        });
    }

    // 3. Close Peer Connections
    if (activeCall) activeCall.close();
    if (incomingCall && incomingCall.call) incomingCall.call.close();
    
    // 4. Stop Camera/Mic (Fix for camera light staying on)
    if (myStream) {
        myStream.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
    }
    
    setMyStream(null); 
    setRemoteStream(null);
    setActiveCall(null); 
    setIncomingCall(null);

    // 5. Save Call Log (If duration > 0)
    if (callStartTime.current && currentCallerId.current && user) {
        const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
        let callType = 'missed';
        if (duration > 0) callType = isVideoCall ? 'video_ended' : 'audio_ended';

        await supabase.from('calls').insert({
            caller_id: user.id, receiver_id: currentCallerId.current,
            type: callType, duration: duration
        });

        await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: currentCallerId.current,
            content: callType === 'missed' ? 'Missed call' : `Call ended (${Math.floor(duration/60)}m ${duration%60}s)`,
            type: `call_${isVideoCall ? 'video' : 'audio'}`,
            created_at: new Date().toISOString()
        });

        callStartTime.current = null; 
        currentCallerId.current = null;
    }
  };

  const handleViewProfile = (userId: string) => {
    if (userId === user?.id) setAppView('profile');
    else setViewProfileId(userId);
  };

  if (loading) return <div className="h-screen flex items-center justify-center dark:bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;

  if (user) {
    // Overlays
    if (incomingCall) return <IncomingCallOverlay callerName={incomingCall.callerName} isVideo={incomingCall.isVideo} onAccept={answerCall} onReject={() => { endCallLogic(true); }} />;
    if (activeCall) return <CallOverlay stream={myStream} remoteStream={remoteStream} onEndCall={() => endCallLogic(true)} isVideo={isVideoCall} callerName={selectedChatUser?.name || "User"} />;
    
    // Chat & Profile Views
    if (selectedChatUser) return <ChatRoomScreen receiver={selectedChatUser} onBack={() => setSelectedChatUser(null)} onViewProfile={(id) => { setSelectedChatUser(null); handleViewProfile(id); }} onStartCall={(video) => startCall(selectedChatUser.id, video)} />;
    if (viewProfileId) return <UserProfile userId={viewProfileId} onBack={() => setViewProfileId(null)} onMessage={(u) => { setViewProfileId(null); setSelectedChatUser(u); }} />;

    return (
      <div className="dark:bg-gray-900 min-h-screen transition-colors duration-300 font-sans">
        {appView === 'home' && <HomeScreen onOpenChat={() => setAppView('chat')} onViewProfile={handleViewProfile} />}
        {appView === 'profile' && <ProfileScreen onBack={() => setAppView('home')} />}
        {appView === 'menu' && <MenuScreen onNavigate={(view) => setAppView(view as any)} onViewProfile={() => setAppView('profile')} />}
        {appView === 'search' && <SearchScreen onViewProfile={handleViewProfile} />}
        {appView === 'settings' && <SettingsScreen onBack={() => setAppView('menu')} />}
        {appView === 'friends' && <FriendsScreen onViewProfile={handleViewProfile} />}

        {appView === 'chat' && (
            <div className="relative h-screen bg-white dark:bg-gray-900">
                <div className="absolute top-4 left-4 z-20">
                    <button onClick={() => setAppView('home')} className="bg-gray-100 dark:bg-gray-800 dark:text-white p-2 rounded-full font-bold text-xs shadow-md hover:bg-gray-200 transition">Back</button>
                </div>
                <ChatListScreen onSelectUser={setSelectedChatUser} onBack={() => setAppView('home')} />
            </div>
        )}

        {appView !== 'chat' && (
            <div className="fixed bottom-0 w-full z-50">
                <div className="fixed bottom-0 w-full bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-2 pb-3 flex justify-around shadow-lg">
                    <button onClick={() => setAppView('home')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${appView === 'home' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><Home size={24}/><span className="text-[10px] font-bold">Home</span></button>
                    <button onClick={() => setAppView('friends')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${appView === 'friends' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><Users size={24}/><span className="text-[10px] font-bold">Friends</span></button>
                    <button onClick={() => setAppView('search')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${appView === 'search' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><Search size={24}/><span className="text-[10px] font-bold">Search</span></button>
                    <button onClick={() => setAppView('profile')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${appView === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><User size={24}/><span className="text-[10px] font-bold">Profile</span></button>
                    <button onClick={() => setAppView('menu')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-colors ${appView === 'menu' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}><Menu size={24}/><span className="text-[10px] font-bold">Menu</span></button>
                </div>
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