import { io } from 'socket.io-client';

let socket = null;

const SOCKET_URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001';

export function connectSocket() {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}

export function joinTimeline(timelineId) {
  if (socket?.connected) {
    socket.emit('timeline:join', timelineId);
  }
}

export function leaveTimeline(timelineId) {
  if (socket?.connected) {
    socket.emit('timeline:leave', timelineId);
  }
}

export function emitTimelineSync(timelineId, data) {
  if (socket?.connected) {
    socket.emit('timeline:sync', { timelineId, data });
  }
}

export function onTimelineSync(callback) {
  if (socket) {
    socket.on('timeline:sync', callback);
  }
}

export function offTimelineSync(callback) {
  if (socket) {
    socket.off('timeline:sync', callback);
  }
}
