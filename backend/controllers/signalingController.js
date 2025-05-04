// server/controllers/signalingController.js

exports.callUser = (io, socket, users, { targetUserId, offer }) => {
    const targetSocketId = users[targetUserId];
    if (targetSocketId) {
      io.to(targetSocketId).emit('incoming-call', {
        from: socket.id,
        offer,
      });
    } else {
      console.warn(`⚠️ Target user (${targetUserId}) not found.`);
    }
  };
  
  exports.answerCall = (io, socket, { targetSocketId, answer }) => {
    io.to(targetSocketId).emit('call-answered', {
      from: socket.id,
      answer,
    });
  };
  
  exports.sendIceCandidate = (io, socket, { targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', {
      from: socket.id,
      candidate,
    });
  };
  