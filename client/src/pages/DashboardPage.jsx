import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export default function DashboardPage() {
  const [timelines, setTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadTimelines();
  }, []);

  const loadTimelines = async () => {
    try {
      const data = await api.getTimelines();
      setTimelines(data.timelines || []);
    } catch (error) {
      console.error('Failed to load timelines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const data = await api.createTimeline({
        name: newName.trim(),
        tasks: [
          {
            id: Date.now().toString(),
            name: 'First Task',
            startWeek: 1,
            duration: 2,
            color: 'bg-blue-500',
            blockedBy: [],
            done: false
          }
        ]
      });
      setTimelines([data.timeline, ...timelines]);
      setShowCreateModal(false);
      setNewName('');
      // Navigate to the new timeline
      navigate(`/timeline/${data.timeline.id}`);
    } catch (error) {
      console.error('Failed to create timeline:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this timeline?')) return;

    try {
      await api.deleteTimeline(id);
      setTimelines(timelines.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete timeline:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">Timeline Planner</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">All Timelines</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Timeline</span>
          </button>
        </div>

        {timelines.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No timelines yet</h3>
            <p className="text-gray-600 mb-4">Create your first timeline to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Plus className="h-4 w-4" />
              <span>Create Timeline</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {timelines.map((timeline) => (
              <div
                key={timeline.id}
                onClick={() => navigate(`/timeline/${timeline.id}`)}
                className="bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{timeline.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Starts: {formatDate(timeline.start_date)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Updated: {formatDate(timeline.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(timeline.id, e)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete timeline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Timeline</h3>
            <form onSubmit={handleCreate}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Timeline name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setNewName(''); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
