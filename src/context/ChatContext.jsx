import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
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
  const [peerConnection, setPeerConnection] = useState(null);
  const [currentInterest, setCurrentInterest] = useState(null);

  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: 'turn:relay1.expressturn.com:3480',
        username: '174672462322246224',
        credential: 'wPWy5/Q8xaF3LVOKZOdExrhnZ+4='
      }
    ],
  };

  const callStartedRef = useRef(false);
  const pendingCandidates = useRef([]);

  const initializeSocket = (gender, interest, name, mode) => {
    setCurrentInterest(interest); // Store the interest
    if (socketRef.current) return socketRef.current;

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
      console.log('Socket connected:', socketInstance.id);
      socketInstance.emit('user-details', { gender, interest, name, mode });
      setIsConnecting(true);
    });

    socketInstance.on('find other', () => {
      console.log('Finding other user...');
      if (user) {
        socketInstance.emit('user-details', {
          gender: user.gender,
          interest: currentInterest, // Use stored interest
          mode: mode
        });
        setIsConnecting(true);
        cleanupMatch();
      }
    });

    socketInstance.on('match-found', (data) => {
      if (data.matched) {
        setIsMatched(true);
        setIsConnecting(false);
        setMatchDetails({ partnerId: data.socketId });
        console.log("Matched with:", data.socketId);
      }
    });

    return socketInstance;
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      window.socket = null;
    }
    cleanupMatch();
  };

  const cleanupMatch = () => {
    setIsMatched(false);
    setMatchDetails(null);
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    callStartedRef.current = false;
    pendingCandidates.current = [];
  };

  const disconnectFromMatch = (mode) => {
    const socket = socketRef.current;
    if (socket && matchDetails) {
      socket.emit('disconnect-chat', matchDetails.partnerId, mode);
      cleanupMatch();
    }
  };

  const next = (mode) => {
    const socket = socketRef.current;
    if (socket && matchDetails) {
      socket.emit('next', matchDetails.partnerId, mode);
      cleanupMatch();
    }
  };

  const sendMessage = (message, partnerId) => {
    const socket = socketRef.current;
    if (socket && partnerId) {
      socket.emit('send-message', message, partnerId);
    }
  };

  const startVideoCall = async (partnerId, localStream, remoteVideoElement) => {
    if (!partnerId || !localStream) return;

    const socket = socketRef.current;
    try {
      console.log("Starting video call...");
      
      // Close existing peer connection if any
      if (peerConnection) {
        peerConnection.close();
      }

      const pc = new RTCPeerConnection(iceServers);
      setPeerConnection(pc);
      callStartedRef.current = true;

      // Add local tracks to peer connection
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("ice-candidate", event.candidate, partnerId);
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoElement && event.streams && event.streams[0]) {
          remoteVideoElement.srcObject = event.streams[0];
        }
      };

      socket.on("video-offer", async (offer, fromSocketId) => {
        if (partnerId === fromSocketId) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("video-answer", answer, fromSocketId);
          } catch (error) {
            console.error("Error handling offer:", error);
          }
        }
      });

      socket.on("video-answer", async (answer) => {
        try {
          if (pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            for (const c of pendingCandidates.current) {
              await pc.addIceCandidate(c);
            }
            pendingCandidates.current = [];
          }
        } catch (error) {
          console.error("Error handling answer:", error);
        }
      });

      socket.on("ice-candidate", async (candidate) => {
        const ice = new RTCIceCandidate(candidate);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(ice);
          } catch (error) {
            console.error("ICE candidate error:", error);
          }
        } else {
          pendingCandidates.current.push(ice);
        }
      });

      socket.on("end-video", () => {
        pc.close();
        setPeerConnection(null);
        callStartedRef.current = false;
        pendingCandidates.current = [];
      });

      socket.emit("start-call", partnerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("video-offer", offer, partnerId);

      return pc;
    } catch (error) {
      console.error('Error starting video call:', error);
    }
  };

  const endVideoCall = () => {
    const socket = socketRef.current;
    if (socket && matchDetails) {
      socket.emit("end-call", matchDetails.partnerId);
    }
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    callStartedRef.current = false;
    pendingCandidates.current = [];
  };

  const value = {
    socket: socketRef.current,
    isConnecting,
    isMatched,
    matchDetails,
    initializeSocket,
    disconnectSocket,
    disconnectFromMatch,
    next,
    setIsConnecting,
    sendMessage,
    startVideoCall,
    endVideoCall
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};