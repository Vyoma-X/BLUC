const textwaitingUsers = new Map();  
const videowaitingUsers = new Map();

const activePairs = new Map();
const activeVideoCalls = new Set();
const pastSocketsMap = new Map();
const SOCKET_RETENTION_TIME = 3 * 60 * 1000;

export default (io, socket) => {
  socket.on('user-details', ({ gender, interest, name, mode, selectedGender }) => { 
    socket.data = { gender, interest, selectedGender };
    console.log(socket.data)
    console.log(`User ${socket.id} joined with gender: ${gender}, interest: ${interest} for ${mode}`);
    cleanupUserConnections(socket.id); 
    const waitingUsers = mode === "video" ? videowaitingUsers : textwaitingUsers;  
    let pastid=null; 
    let pastsocket=null;  
    if(socket.data.selectedGender=="random"){ 
     
    for (let [id, otherSocket] of waitingUsers) {  
  
      if (id === socket.id) continue; 
      
      if (
        otherSocket.data &&
        otherSocket.data.interest=== interest 
      ) { 
          connecto(id,otherSocket,mode); 
          return;
        }  
        pastid=id; 
        pastsocket=otherSocket;
       }  

       console.log("waitingUsers",waitingUsers);
       if(waitingUsers.size>0 && pastid){ 
        connecto(pastid,pastsocket,mode); 
        return;
       } 
      } 
    else{  
        for (let [id, otherSocket] of waitingUsers) {  
        if(
         otherSocket.data &&
        otherSocket.data.interest=== interest && 
        otherSocket.data.gender===socket.data.genderin 
        ){ 
          connecto(id,otherSocket,mode);  
          return;
        } 
        else if(otherSocket.data &&
        otherSocket.data.interest=== interest){ 
          pastid=id; 
          pastsocket=otherSocket;
        } 
        else{  
          if(pastid==null){
          pastid=id; 
          pastsocket=otherSocket; 
          }
        }
      }   
      if(pastid){  
        connecto(pastid,pastsocket,mode); 
        return;
      }
    }

  
    waitingUsers.set(socket.id, socket);
    console.log(`User ${socket.id} added to ${mode} waiting list.`);
  }); 

  socket.on('send-message', (message, toSocketId) => {
    const target = io.sockets.sockets.get(toSocketId);
    if (target) {
      target.emit('receive-message', message);
    }
  });

  socket.on('disconnect-chat', (partnerSocketId, mode) => {
    const partnerSocket = io.sockets.sockets.get(partnerSocketId);

    if (mode === "video") {
      handleVideoCallEnd(socket.id, partnerSocketId);   
      socket.emit("end-video"); 
      if (partnerSocket) {
        partnerSocket.emit("end-video");
        partnerSocket.emit("find other");
      }
    } else {
      if (partnerSocket) {
        partnerSocket.emit("disconect", "Partner disconnected.");
        partnerSocket.emit("find other");
      }
      
    }

    activePairs.delete(socket.id);
    activePairs.delete(partnerSocketId);
  });

  socket.on('next', (partnerSocketId, mode ) => {
    const partnerSocket = io.sockets.sockets.get(partnerSocketId);
    if (mode === "video") {
      handleVideoCallEnd(socket.id, partnerSocketId);
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
      target.emit("ice-candidate", candidate);
    }
  }); 
   socket.on("end-call", (partnerId) => {  
    videowaitingUsers.delete(socket.id);
    const partnerSocket = io.sockets.sockets.get(partnerId); 
    console.log("hello");  
    partnerSocket.emit("end-video"); 
    partnerSocket.emit("find other");  
    
    handleVideoCallEnd(socket.id, partnerId); 

  });
 
  function connecto(id,otherSocket,mode){  
        if (mode === "video") {
        videowaitingUsers.delete(id);
        } 
        else{ 
          textwaitingUsers.delete(id);
        }
        const matchedSocket = io.sockets.sockets.get(id);
        if (matchedSocket) {
          matchedSocket.emit('match-found', { matched: true, socketId: socket.id });
          socket.emit('match-found', { matched: true, socketId: matchedSocket.id });

          activePairs.set(socket.id, matchedSocket.id);
          activePairs.set(matchedSocket.id, socket.id);

          if (mode === "video") {
            activeVideoCalls.add(socket.id);
            activeVideoCalls.add(matchedSocket.id);
          }
          // 🆕 Emit start-call to both after match
        }
        return;
  }

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

    activePairs.delete(userId);
  }

  function handleVideoCallEnd(userId, partnerId) {
    activeVideoCalls.delete(`${userId}-${partnerId}`);
    activeVideoCalls.delete(`${partnerId}-${userId}`); 
    activePairs.delete(userId);
    activePairs.delete(partnerId);
  }
};
