import { Server } from 'socket.io';

let io = null;

export function initializeSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join a timeline room
    socket.on('timeline:join', (timelineId) => {
      const room = `timeline:${timelineId}`;
      socket.join(room);
      console.log(`Client ${socket.id} joined room ${room}`);
    });

    // Leave a timeline room
    socket.on('timeline:leave', (timelineId) => {
      const room = `timeline:${timelineId}`;
      socket.leave(room);
      console.log(`Client ${socket.id} left room ${room}`);
    });

    // Broadcast timeline state to other clients in the same room
    socket.on('timeline:sync', ({ timelineId, data }) => {
      const room = `timeline:${timelineId}`;
      // Broadcast to all OTHER clients in the room (not the sender)
      socket.to(room).emit('timeline:sync', data);
      console.log(`Client ${socket.id} synced timeline ${timelineId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('Socket.io server initialized');
  return io;
}

export function getIO() {
  return io;
}
