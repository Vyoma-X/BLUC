// server/config/socketHandler.js

const signalingController = require('../controllers/signalingController');

const users = {}; // { userId: socketId }

module.exports = (io, socket) => {
  // Handle user joining
  socket.on('join', ({ userId }) => {
    users[userId] = socket.id;
    console.log(`🔗 ${userId} joined with socket ID: ${socket.id}`);
  });

  // Handle call initiation
  socket.on('call-user', data => {
    signalingController.callUser(io, socket, users, data);
  });

  // Handle call answer
  socket.on('answer-call', data => {
    signalingController.answerCall(io, socket, data);
  });

  // Handle ICE candidates
  socket.on('ice-candidate', data => {
    signalingController.sendIceCandidate(io, socket, data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
    for (const userId in users) {
      if (users[userId] === socket.id) {
        delete users[userId];
        break;
      }
    }
  });
};
