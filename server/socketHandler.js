const textwaitingUsers = new Map();  
const videowaitingUsers=new Map();

const activePairs = new Map();
const activeVideoCalls = new Set();
const pastSocketsMap = new Map();
const SOCKET_RETENTION_TIME = 3 * 60 * 1000;
export default (io, socket) => {
  socket.on('user-details', ({ gender, interest, name, mode}) => { 
    console.log("Interset:",interest);
    if(mode==="text"){
    socket.data = { gender, interest, };
    console.log(`User ${socket.id} joined with gender: ${gender}, interest: ${interest} for chat`);
    cleanupUserConnections(socket.id); 
    for (let [id, otherSocket] of textwaitingUsers) {
      if (id === socket.id) continue;
      if (
        otherSocket.data &&
        otherSocket.data.gender === interest &&
        otherSocket.data.interest === gender  
      ) 
      {
        console.log("user deleted from waiting list: ",id);
        textwaitingUsers.delete(id); 
        
        const matchedSocket = io.sockets.sockets.get(id);
        if (matchedSocket) {
          matchedSocket.emit('match-found', { matched: true, socketId: socket.id });
          socket.emit('match-found', { matched: true, socketId: matchedSocket.id });
          activePairs.set(socket.id, matchedSocket.id);
          activePairs.set(matchedSocket.id, socket.id); 
          
          console.log(`🎯 Match found: ${socket.id} <--> ${matchedSocket.id}`);
        }
        return;
      }
    }
    textwaitingUsers.set(socket.id, socket);
    console.log(`User ${socket.id} added to waiting list.`); 
    } 
    else{ 
      socket.data = { gender, interest, };
    console.log(`User ${socket.id} joined with gender: ${gender}, interest: ${interest} for video`);
    cleanupUserConnections(socket.id); 
    for (let [id, otherSocket] of videowaitingUsers) {
      if (id === socket.id) continue;
      if (
        otherSocket.data &&
        otherSocket.data.gender === interest &&
        otherSocket.data.interest === gender  
      ) 
      {
        console.log("user deleted from waiting list: ",id);
        videowaitingUsers.delete(id); 
        
        const matchedSocket = io.sockets.sockets.get(id);
        if (matchedSocket) {
          matchedSocket.emit('match-found', { matched: true, socketId: socket.id });
          socket.emit('match-found', { matched: true, socketId: matchedSocket.id });
          activePairs.set(socket.id, matchedSocket.id);
          activePairs.set(matchedSocket.id, socket.id); 
          activeVideoCalls.add(socket.id, matchedSocket.id);
          activeVideoCalls.add(matchedSocket.id, socket.id);
          console.log(`🎯 Match found: ${socket.id} <--> ${matchedSocket.id}`);
        }
        return;
      }
    }
    videowaitingUsers.set(socket.id, socket);
    console.log(`User ${socket.id} added to waiting list.`); 
    }
  });

  socket.on('send-message', (message, toSocketId) => {
    const target = io.sockets.sockets.get(toSocketId);
    if (target) {
      target.emit('receive-message', message);
    }
  });

  socket.on('disconnect-chat', (partnerSocketId,mode)=> { 
    console.log(mode);
    const partnerSocket = io.sockets.sockets.get(partnerSocketId); 
    if(mode==="video"){
    if (activeVideoCalls.has(`${socket.id}-${partnerSocketId}`) ||
        activeVideoCalls.has(`${partnerSocketId}-${socket.id}`)) {
      handleVideoCallEnd(socket.id, partnerSocketId);   
      socket.emit("end-video"); 
      partnerSocket.emit("end-video");
    }

    console.log("users will be added to the videoqueue")
    if (partnerSocket){ 
      partnerSocket.emit("find other");
    }
    
    activePairs.delete(socket.id);
    activePairs.delete(partnerSocketId);
  } 
  else{ 
    if (partnerSocket) {
      partnerSocket.emit('disconect', "Partner disconnected.");
    }
    socket.emit('disconect', "You disconnected.");
    console.log("users will be added to the textqueue")
    if (partnerSocket) 
      partnerSocket.emit("find other")
    
    activePairs.delete(socket.id);
    activePairs.delete(partnerSocketId);

  }} 
); 
   socket.on('next', (partnerSocketId, mode) => {
  const partnerSocket = io.sockets.sockets.get(partnerSocketId);
  if(mode==="video"){
  if (
    activeVideoCalls.has(`${socket.id}-${partnerSocketId}`) ||
    activeVideoCalls.has(`${partnerSocketId}-${socket.id}`)
  ) {
    handleVideoCallEnd(socket.id, partnerSocketId); 
  }

}
  if (partnerSocket) {
    partnerSocket.emit("find other");
  }
  socket.emit("find other");
  

});
  socket.on('disconnect', () => {
    cleanupUserConnections(socket.id);
  });

  socket.on("video-offer", (offer, toSocketId) => {
    const target = io.sockets.sockets.get(toSocketId);
    if (target) {
      target.emit("video-offer", offer, socket.id);
      activeVideoCalls.add(`${socket.id}-${toSocketId}`);
    }
  });

  socket.on("video-answer", (answer, toSocketId) => {
    const target = io.sockets.sockets.get(toSocketId);
    if (target) {
      target.emit("video-answer", answer);
    }
  });

  socket.on("ice-candidate", (candidate, toSocketId) => {
    const target = io.sockets.sockets.get(toSocketId);
    if (target) {
      console.log(`Forwarding ICE candidate to ${toSocketId}`);
      target.emit("ice-candidate", candidate);
    }
  });

  socket.on("start-call", (partnerId) => {
    activeVideoCalls.add(`${socket.id}-${partnerId}`);
  });

  socket.on("end-call", (partnerId) => {
    handleVideoCallEnd(socket.id, partnerId);
  });

  function cleanupUserConnections(userId) {
    videowaitingUsers.delete(userId); 
    textwaitingUsers.delete(userId);
    const partnerId = activePairs.get(userId);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit('disconect', "Partner disconnected unexpectedly.");
      }
    }

    for (const callId of activeVideoCalls) {
      if (callId.includes(userId)) {
        activeVideoCalls.delete(callId);
      }
    }
  }

  function handleVideoCallEnd(userId, partnerId) {
    activeVideoCalls.delete(`${userId}-${partnerId}`);
    activeVideoCalls.delete(`${partnerId}-${userId}`); 
    activePairs.delete(socket.id);
    activePairs.delete(partnerId); 
    const partnerSocket = io.sockets.sockets.get(partnerId); 

    
  } 
  function addPastSocket(currentSocketId, pastSocketId) {
  if (!pastSocketsMap.has(currentSocketId)) {
    pastSocketsMap.set(currentSocketId, []);
  }

  const entry = { id: pastSocketId, addedAt: Date.now() };
  pastSocketsMap.get(currentSocketId).push(entry);
  setTimeout(() => {
    const currentList = pastSocketsMap.get(currentSocketId);
    if (!currentList) return;

    const updatedList = currentList.filter(e => e.id !== pastSocketId);
    if (updatedList.length > 0) {
      pastSocketsMap.set(currentSocketId, updatedList);
    } else {
      pastSocketsMap.delete(currentSocketId);
    }
  }, SOCKET_RETENTION_TIME);
} 
function hasnoPastSocket(socketId, targetId) {
  const entries = pastSocketsMap.get(socketId);
  if (entries.some(entry => entry.id === targetId)) return false; 
  return true;
}
};
