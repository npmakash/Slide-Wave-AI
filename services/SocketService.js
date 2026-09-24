/**
 * services/SocketService.js
 * Real-time WebSocket connection & event emitter using Socket.IO
 */

const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.info(`🔌 Socket client connected: ${socket.id}`);

    socket.on('join_admin', () => {
      socket.join('admin_room');
      logger.info(`👑 Socket ${socket.id} joined admin_room`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket client disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info(`⚡ Socket.IO initialized successfully`);
  return io;
}

function getIO() {
  return io;
}

/** Emit real-time new developer support message */
function emitNewSupportMessage(message) {
  if (io) {
    io.emit('support_message_new', message);
    logger.info(`⚡ Real-time Socket broadcast: support_message_new (${message.id})`);
  }
}

/** Emit real-time deleted single message */
function emitSupportMessageDeleted(messageId) {
  if (io) {
    io.emit('support_message_delete', { id: messageId });
    logger.info(`⚡ Real-time Socket broadcast: support_message_delete (${messageId})`);
  }
}

/** Emit real-time cleared all support messages */
function emitSupportMessagesCleared() {
  if (io) {
    io.emit('support_messages_cleared', { timestamp: new Date().toISOString() });
    logger.info(`⚡ Real-time Socket broadcast: support_messages_cleared`);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitNewSupportMessage,
  emitSupportMessageDeleted,
  emitSupportMessagesCleared,
};
