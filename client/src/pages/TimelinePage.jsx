import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import TimelinePlanner from '../components/TimelinePlanner/index';

export default function TimelinePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Handle incoming sync events from other clients
  const handleSync = useCallback((data) => {
    console.log('Received sync from another client:', data);
    setTimeline(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: data.tasks,
        node_positions: data.nodePositions,
        name: data.name,
        start_date: data.startDate,
        // Use a unique marker to indicate this is a remote update
        _remoteUpdate: Date.now(),
      };
    });
  }, []);

  // Socket connection with sync callback
  const { isConnected, isReconnecting, syncTimeline } = useSocket(id, handleSync);

  useEffect(() => {
    loadTimeline();
  }, [id]);

  const loadTimeline = async () => {
    try {
      const data = await api.getTimeline(id);
      setTimeline(data.timeline);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (timelineData) => {
    try {
      await api.updateTimeline(id, timelineData);
    } catch (err) {
      console.error('Failed to save timeline:', err);
    }
  };

  // Emit socket sync after saving
  const handleSocketSync = useCallback((data) => {
    syncTimeline(data);
  }, [syncTimeline]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Back button and connection status */}
      <div className="p-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        {/* Connection status indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-green-500'
                : isReconnecting
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-slate-500">
            {isConnected
              ? 'Synced'
              : isReconnecting
              ? 'Reconnecting...'
              : 'Disconnected'}
          </span>
        </div>
      </div>

      <TimelinePlanner
        timelineId={id}
        initialData={timeline}
        onSave={handleSave}
        onSocketSync={handleSocketSync}
      />
    </div>
  );
}
