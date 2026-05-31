let ioInstance = null;

function setSocketServer(io) {
  ioInstance = io;
}

function getSocketServer() {
  return ioInstance;
}

function emitToAdmins(event, payload) {
  if (ioInstance) ioInstance.to('role:admin').emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (ioInstance) ioInstance.to(`user:${userId}`).emit(event, payload);
}

function emitToRiders(event, payload) {
  if (ioInstance) ioInstance.to('role:rider').emit(event, payload);
}

module.exports = {
  setSocketServer,
  getSocketServer,
  emitToAdmins,
  emitToUser,
  emitToRiders,
};
