/**
 * services/socket.js
 * Client-side Socket.IO client singleton connection
 */

import { io } from 'socket.io-client';

const socket = io(window.location.origin, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export default socket;
