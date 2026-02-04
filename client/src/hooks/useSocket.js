import { useEffect, useState, useCallback, useRef } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  joinTimeline,
  leaveTimeline,
  emitTimelineSync,
  onTimelineSync,
  offTimelineSync,
} from '../services/socket';

export function useSocket(timelineId, onSync) {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const currentTimelineId = useRef(null);

  // Handle connection status
  useEffect(() => {
    const socket = connectSocket();

    const handleConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      // Re-join room if we have a timeline ID
      if (currentTimelineId.current) {
        joinTimeline(currentTimelineId.current);
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleReconnectAttempt = () => {
      setIsReconnecting(true);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect_attempt', handleReconnectAttempt);

    // Set initial state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect_attempt', handleReconnectAttempt);
      disconnectSocket();
    };
  }, []);

  // Handle timeline room join/leave
  useEffect(() => {
    if (!timelineId) return;

    const socket = getSocket();
    if (!socket) return;

    // Leave previous room if different
    if (currentTimelineId.current && currentTimelineId.current !== timelineId) {
      leaveTimeline(currentTimelineId.current);
    }

    // Join new room
    currentTimelineId.current = timelineId;
    if (socket.connected) {
      joinTimeline(timelineId);
    }

    return () => {
      if (currentTimelineId.current) {
        leaveTimeline(currentTimelineId.current);
        currentTimelineId.current = null;
      }
    };
  }, [timelineId]);

  // Handle incoming sync events
  useEffect(() => {
    if (!onSync) return;

    onTimelineSync(onSync);

    return () => {
      offTimelineSync(onSync);
    };
  }, [onSync]);

  // Function to emit sync events
  const syncTimeline = useCallback((data) => {
    if (timelineId) {
      emitTimelineSync(timelineId, data);
    }
  }, [timelineId]);

  return {
    isConnected,
    isReconnecting,
    syncTimeline,
  };
}
