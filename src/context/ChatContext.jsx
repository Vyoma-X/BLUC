import React, { createContext, useContext, useRef, useState, useEffect} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [matchDetails, setMatchDetails] = useState(null); 
  const [selectedGender, setSelectedGender] = useState("random");
  const [peerConnection, setPeerConnection] = useState(null);
  const callStartedRef = useRef(false);
  const pendingCandidates = useRef([]);
   useEffect(() => {
    if (matchDetails?.partnerId) {
      console.log("[Socket] Matched with:", matchDetails.partnerId);
    }
  }, [matchDetails?.partnerId]);
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: 'turn:relay1.expressturn.com:3480',
        username: '174672462322246224',
        credential: 'wPWy5/Q8xaF3LVOKZOdExrhnZ+4='
      }
    ]
  };
   

  const initializeSocket = (gender, interest, name, mode) => {
    if (socketRef.current) return socketRef.current;

    console.log("[Socket] Initializing socket connection...");
    const socketInstance = window.socket || io(
      process.env.NODE_ENV === 'production'
        ? 'https://buzzy-server-nu.vercel.app'
        : 'http://localhost:3000',
      {
        transports: ['websocket'],
        withCredentials: true,
      }
    );

    if (!window.socket) {
      window.socket = socketInstance;
    }

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      console.log("[Socket] Connected:", socketInstance.id);
      socketInstance.emit('user-details', { gender, interest, name, mode,selectedGender});
      setIsConnecting(true);
    });

    socketInstance.on('find other', () => { 
      console.log("[Socket] Received 'find other' event. Cleaning up and reconnecting...");
      cleanupMatch().then(() => {
        setIsConnecting(true);
        if (user) {
          socketInstance.emit('user-details', {
            gender: user.gender,
            interest: user.interest,
            name: user.name,
            mode,
            selectedGender
          });
        }
      });
    });
    

    socketInstance.on('match-found', async(data) => {
      console.log("[Socket] Match found:", data);
      if (data.matched) {
        await cleanupMatch();
        setIsMatched(true); 
        console.log("hello");
        setIsConnecting(false);
        setMatchDetails({ partnerId: data.socketId });
      
      }
    }); 

    socketInstance.on('start-call', () => {
      console.log("[Socket] Received 'start-call'");
      const remoteVideo = document.getElementById("remoteVideo");
      const localVideo = document.getElementById("localVideo");
      const localStream = localVideo?.srcObject;

      if (matchDetails?.partnerId && localStream) {
        console.log("[Call] Starting video call with:", matchDetails.partnerId);
        startVideoCall(matchDetails.partnerId, localStream, remoteVideo);
      } else {
        console.warn("[Call] Cannot start call — missing partnerId or localStream");
      }
    });

    socketInstance.on("cleanup", () => {
      console.log("[Socket] Received 'cleanup' event");
      setIsConnecting(true);
      cleanupMatch();
    });

    return socketInstance;
  };

  const disconnectSocket = () => {
    console.log("[Socket] Disconnecting...");
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      window.socket = null;
    }
    cleanupMatch();
  };

  const cleanupMatch = async () => {
    console.log("[Call] Cleaning up match and peer connection...");
    setIsMatched(false);
    setMatchDetails(null);

    if (peerConnection) {
      console.log("[Call] Closing peer connection...");
      peerConnection.getReceivers().forEach(receiver => {
        if (receiver.track) {
          receiver.track.stop();
        }
      });
      peerConnection.close();
      setPeerConnection(null);
    }

    const remoteVideo = document.getElementById("remoteVideo");
    if (remoteVideo && remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      remoteVideo.srcObject = null;
    } 

    callStartedRef.current = false;
    pendingCandidates.current = [];
  }; 
  

  const disconnectFromMatch = (mode) => {
    const socket = socketRef.current;
    if (socket && matchDetails) {
      console.log("[Match] Disconnecting from partner:", matchDetails.partnerId);
      cleanupMatch();
      socket.emit('disconnect-chat', matchDetails.partnerId, mode);
    }
  };

  const next = (mode) => {
    const socket = socketRef.current;
    if (socket && matchDetails) {
      console.log("[Match] Skipping to next partner...");
      socket.emit('next', matchDetails.partnerId, mode,); 
       
    } 
  };

  const sendMessage = (message, partnerId) => {
    const socket = socketRef.current;
    if (socket && partnerId) {
      console.log("[Chat] Sending message to", partnerId, ":", message);
      window.socket.emit('send-message', message, partnerId);
    }
  };

  const startVideoCall = async (partnerId, localStream, remoteVideoElement) => {
    if (!partnerId || !localStream) return;
    const socket = socketRef.current;
    if (!socket) return;

    console.log("[Call] Creating new RTCPeerConnection...");
    try {
      if (peerConnection) {
        console.log("[Call] Closing existing connection before starting new one...");
        peerConnection.getReceivers().forEach(receiver => {
          if (receiver.track) receiver.track.stop();
        });
        peerConnection.close();
        setPeerConnection(null);
      }

      const pc = new RTCPeerConnection(iceServers);
      setPeerConnection(pc);

      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[ICE] Sending ICE candidate...");
          socket.emit("ice-candidate", event.candidate, partnerId);
        }
      };

      pc.ontrack = (event) => {
        console.log("[Call] Received remote track.");
        if (remoteVideoElement && event.streams[0]) {
          remoteVideoElement.srcObject = event.streams[0];
         
        }
      };

      socket.off("video-offer");
      socket.off("video-answer");
      socket.off("ice-candidate");
      socket.off("end-video");

   socket.on("video-offer", async (offer, fromSocketId) => {
  

  try {
    console.log("[Call] PeerConnection signaling state:", pc.signalingState);

    if (pc.signalingState !== "stable") {
      console.log("[Call] Rolling back and setting remote description...");
      await Promise.all([
        pc.setLocalDescription({ type: "rollback" }).catch(e => console.error("[Call] Rollback failed:", e)),
        pc.setRemoteDescription(new RTCSessionDescription(offer)).catch(e => console.error("[Call] setRemoteDescription (rollback) failed:", e))
      ]);
    } else {
      console.log("[Call] Setting remote description...");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
    }

    console.log("[Call] Creating answer...");
    const answer = await pc.createAnswer();

    console.log("[Call] Setting local description with answer...");
    await pc.setLocalDescription(answer);

    console.log("[Call] Emitting video-answer...");
    socket.emit("video-answer", answer, fromSocketId);
    console.log("[Call] Sent video-answer.");
  } catch (error) {
    console.error("[Call] Error handling offer:", error);
  }
});


      socket.on("video-answer", async (answer) => {
        console.log("[Socket] Received video-answer");
        try {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            for (const candidate of pendingCandidates.current) {
              await pc.addIceCandidate(candidate);
            }
            pendingCandidates.current = [];
          }
        } catch (error) {
          console.error("[Call] Error applying answer:", error);
        }
      });

      socket.on("ice-candidate", async (candidate) => {
        console.log("[Socket] Received ICE candidate");
        try {
          const iceCandidate = new RTCIceCandidate(candidate);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(iceCandidate);
          } else {
            pendingCandidates.current.push(iceCandidate);
          }
        } catch (error) {
          console.error("[ICE] Error adding candidate:", error);
        }
      });

      socket.on("end-video", () => {
        console.log("[Socket] Received end-video signal.");
       
        setPeerConnection(null);
        pendingCandidates.current = [];
        if (remoteVideoElement) {
          remoteVideoElement.srcObject = null;
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("video-offer", offer, partnerId);
      console.log("[Call] Sent video-offer.");
    } catch (error) {
      console.error('[Call] Error starting video call:', error);
      if (peerConnection) {
        peerConnection.getReceivers().forEach(receiver => {
          if (receiver.track) {
            receiver.track.stop();
          }
        });
        peerConnection.close();
        setPeerConnection(null);
      }
    }
  };

  const endVideoCall = () => {
    const socket = socketRef.current;
    if (isMatched) {
      console.log("[Call] Ending video call.");
      socket.emit("end-call", matchDetails.partnerId);
    } 
    cleanupMatch();
  };

  const value = {
    socket: socketRef.current,
    isConnecting,
    isMatched,
    matchDetails, 
    selectedGender,
    initializeSocket,
    disconnectSocket,
    disconnectFromMatch,
    next, 
    setSelectedGender,
    setIsConnecting,
    sendMessage,
    startVideoCall,
    endVideoCall,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
