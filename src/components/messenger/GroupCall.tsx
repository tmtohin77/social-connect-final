import React, { useEffect, useState, useRef } from 'react';
import Peer from 'peerjs';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface GroupCallProps {
  groupId: string;
  onLeave: () => void;
}

interface PeerStream {
  peerId: string;
  stream: MediaStream;
  user?: any;
}

// ✅ Config for connection
const peerConfig = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

const GroupCall: React.FC<GroupCallProps> = ({ groupId, onLeave }) => {
  const { user } = useAuth();
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerStream[]>([]);
  const [myPeer, setMyPeer] = useState<Peer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);

  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<PeerStream[]>([]);

  useEffect(() => {
    initializeCall();
    return () => {
      cleanup();
    };
  }, []);

  const initializeCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMyStream(stream);
      if (myVideoRef.current) myVideoRef.current.srcObject = stream;

      // ✅ Updated Peer with Config
      const peer = new Peer(user?.id + '-' + groupId, peerConfig);
      setMyPeer(peer);

      peer.on('open', (id) => {
        const channel = supabase.channel(`group_call:${groupId}`, {
            config: { presence: { key: id } }
        });

        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users = Object.values(state).flat() as any[];
            setParticipants(users);
            
            users.forEach((u: any) => {
                if (u.presence_ref !== id && !peersRef.current.find(p => p.peerId === u.presence_ref)) {
                   connectToNewUser(u.presence_ref, stream, peer);
                }
            });
        }).subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ 
                    user_id: user?.id, 
                    peer_id: id,
                    name: user?.name,
                    avatar: user?.avatar 
                });
            }
        });

        peer.on('call', (call) => {
            call.answer(stream);
            call.on('stream', (userVideoStream) => {
                addPeerStream(call.peer, userVideoStream);
            });
        });
      });

    } catch (err) {
      console.error("Failed to join group call", err);
      onLeave();
    }
  };

  const connectToNewUser = (userId: string, stream: MediaStream, peer: Peer) => {
    if (peersRef.current.find(p => p.peerId === userId)) return;

    const call = peer.call(userId, stream);
    call.on('stream', (userVideoStream) => {
        addPeerStream(userId, userVideoStream);
    });
    call.on('close', () => {
        removePeerStream(userId);
    });
  };

  const addPeerStream = (peerId: string, stream: MediaStream) => {
    setPeers((prev) => {
        if (prev.find(p => p.peerId === peerId)) return prev;
        const newPeers = [...prev, { peerId, stream }];
        peersRef.current = newPeers;
        return newPeers;
    });
  };

  const removePeerStream = (peerId: string) => {
    setPeers((prev) => {
        const newPeers = prev.filter(p => p.peerId !== peerId);
        peersRef.current = newPeers;
        return newPeers;
    });
  };

  const cleanup = () => {
    myStream?.getTracks().forEach(track => track.stop());
    myPeer?.destroy();
    supabase.removeChannel(supabase.channel(`group_call:${groupId}`));
  };

  const toggleMute = () => {
    if (myStream) {
      myStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (myStream) {
      myStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsCameraOff(!isCameraOff);
    }
  };

  const getUserInfo = (peerId: string) => {
    const p = participants.find((part: any) => part.presence_ref === peerId);
    return p || { name: 'User', avatar: '' };
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-950 flex flex-col animate-fade-in">
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2 text-white">
            <Users size={20} />
            <span className="font-bold">Group Call ({peers.length + 1})</span>
        </div>
        <div className="bg-red-500/20 px-3 py-1 rounded-full text-red-300 text-xs font-mono animate-pulse">
            LIVE
        </div>
      </div>

      <div className="flex-1 p-4 grid gap-4 auto-rows-fr grid-cols-1 sm:grid-cols-2 md:grid-cols-3 overflow-y-auto">
        
        {/* ✅ My Video (Mirrored) */}
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl group">
            <video 
                ref={myVideoRef} 
                muted 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover scale-x-[-1] ${isCameraOff ? 'hidden' : ''}`} 
            />
            
            {isCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                    <Avatar className="w-20 h-20">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback>ME</AvatarFallback>
                    </Avatar>
                    <p className="text-white text-sm font-bold">You</p>
                </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded-lg text-white text-xs backdrop-blur-md">
                You {isMuted && '(Muted)'}
            </div>
        </div>

        {/* ✅ Remote Videos (Not Mirrored) */}
        {peers.map((peer) => {
            const info = getUserInfo(peer.peerId);
            return (
                <div key={peer.peerId} className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl">
                    <VideoPlayer stream={peer.stream} />
                    <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded-lg text-white text-xs backdrop-blur-md flex items-center gap-2">
                        <Avatar className="w-4 h-4">
                            <AvatarImage src={info.avatar} />
                        </Avatar>
                        {info.name}
                    </div>
                </div>
            );
        })}
      </div>

      <div className="p-6 flex justify-center gap-6 bg-black/40 backdrop-blur-xl border-t border-white/10">
        <button onClick={toggleMute} className={`p-4 rounded-full transition-all active:scale-95 ${isMuted ? 'bg-white text-black' : 'bg-gray-800/80 text-white hover:bg-gray-700'}`}>
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button onClick={onLeave} className="p-4 bg-red-600 rounded-full text-white hover:bg-red-700 shadow-lg shadow-red-600/30 scale-110 active:scale-95 transition-all">
          <PhoneOff size={28} />
        </button>

        <button onClick={toggleVideo} className={`p-4 rounded-full transition-all active:scale-95 ${isCameraOff ? 'bg-white text-black' : 'bg-gray-800/80 text-white hover:bg-gray-700'}`}>
            {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
        </button>
      </div>
    </div>
  );
};

const VideoPlayer: React.FC<{ stream: MediaStream }> = ({ stream }) => {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.srcObject = stream;
    }, [stream]);
    // Remote video should NOT be mirrored
    return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
};

export default GroupCall;