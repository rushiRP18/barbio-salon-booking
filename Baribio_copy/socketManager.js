/**
 * socketManager.js
 * ----------------
 * Centralised Socket.IO setup.
 *
 * Usage:
 *   const { initSocket } = require("./socketManager");
 *   initSocket(httpServer);          // call once after server.listen()
 *
 *   const { getIO } = require("./socketManager");
 *   const io = getIO();              // use anywhere to emit events
 */

let io = null;

/**
 * Attach Socket.IO to an existing HTTP server.
 * Must be called exactly once (from app.js).
 */
function initSocket(server) {
  const { Server } = require("socket.io");

  io = new Server(server, {
    // Allow the default same-origin policy; add origins here if needed later.
    cors: {
      origin: "*",               // tighten in production if required
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,           // how long to wait before considering the connection closed
    pingInterval: 25000,          // how often to send a ping to the client
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Shopkeeper joins a private room so events are targeted to the right owner.
    socket.on("join-shopkeeper-room", (userId) => {
      if (userId) {
        const room = `shopkeeper:${userId}`;
        socket.join(room);
        console.log(`[Socket.IO] ${socket.id} joined room ${room}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log("[Socket.IO] Initialised and listening for connections");
  return io;
}

/**
 * Return the current Socket.IO instance.
 * Returns null if initSocket() has not been called yet.
 */
function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
