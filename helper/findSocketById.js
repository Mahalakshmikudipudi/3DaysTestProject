function findSocketByStaffId(io, staffId) {
    for (const [id, socket] of io.of("/").sockets) {
      if (socket.staffId === staffId) return socket;
    }
    return null;
}

module.exports = { findSocketByStaffId };