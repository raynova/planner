import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook for managing timeline core data state with automatic saving and sync
 * @param {Object} params
 * @param {Object} params.initialData - Initial timeline data from server
 * @param {Function} params.onSave - Callback to save data to server
 * @param {Function} params.onSocketSync - Callback to sync via socket
 * @returns {Object} Timeline data state and operations
 */
export function useTimelineData({ initialData, onSave, onSocketSync }) {
  // Core state
  const [startDate, setStartDate] = useState(
    initialData?.start_date ? new Date(initialData.start_date) : new Date()
  );
  const [timelineName, setTimelineName] = useState(initialData?.name || 'My Timeline');
  const [tasks, setTasks] = useState(initialData?.tasks || []);
  const [nodePositions, setNodePositions] = useState(initialData?.node_positions || {});
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [saveStatus, setSaveStatus] = useState('');

  // Track remote updates
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState(null);

  // Refs to avoid stale closures in event handlers
  const tasksRef = useRef(tasks);
  const nodePositionsRef = useRef(nodePositions);
  const startDateRef = useRef(startDate);
  const timelineNameRef = useRef(timelineName);
  const notesRef = useRef(notes);

  // Keep refs in sync
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { nodePositionsRef.current = nodePositions; }, [nodePositions]);
  useEffect(() => { startDateRef.current = startDate; }, [startDate]);
  useEffect(() => { timelineNameRef.current = timelineName; }, [timelineName]);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  // Sync state from initialData when it changes due to remote updates
  useEffect(() => {
    if (initialData?._remoteUpdate && initialData._remoteUpdate !== lastRemoteUpdate) {
      console.log('Applying remote update to TimelinePlanner');
      setTasks(initialData.tasks || []);
      setNodePositions(initialData.node_positions || {});
      setTimelineName(initialData.name || 'My Timeline');
      setStartDate(initialData.start_date ? new Date(initialData.start_date) : new Date());
      setNotes(initialData.notes || '');
      setLastRemoteUpdate(initialData._remoteUpdate);
    }
  }, [initialData, lastRemoteUpdate]);

  // Save data function
  const saveData = useCallback(async (newTasks, newStartDate, newTimelineName, newNodePositions, newNotes) => {
    try {
      setSaveStatus('Saving...');
      const data = {
        tasks: newTasks,
        startDate: (newStartDate || startDateRef.current).toISOString().split('T')[0],
        name: newTimelineName !== undefined ? newTimelineName : timelineNameRef.current,
        nodePositions: newNodePositions !== undefined ? newNodePositions : nodePositionsRef.current,
        notes: newNotes !== undefined ? newNotes : notesRef.current,
      };
      await onSave(data);
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 2000);

      // Emit socket sync to other clients
      if (onSocketSync) {
        onSocketSync(data);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('Error saving');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  }, [onSave, onSocketSync]);

  // Helper to save current state from refs (useful for event handlers)
  const saveCurrentState = useCallback(() => {
    saveData(tasksRef.current, startDateRef.current, timelineNameRef.current, nodePositionsRef.current);
  }, [saveData]);

  return {
    // State
    startDate,
    setStartDate,
    timelineName,
    setTimelineName,
    tasks,
    setTasks,
    nodePositions,
    setNodePositions,
    notes,
    setNotes,
    saveStatus,

    // Refs (for event handlers to avoid stale closures)
    tasksRef,
    nodePositionsRef,
    startDateRef,
    timelineNameRef,
    notesRef,

    // Functions
    saveData,
    saveCurrentState,
  };
}
