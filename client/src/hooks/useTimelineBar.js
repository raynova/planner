import { useState, useRef, useCallback } from 'react';

/**
 * Hook for timeline bar dragging and resizing with stale closure prevention
 * @param {Object} params
 * @param {Function} params.setTasks - Tasks setter
 * @param {Function} params.saveData - Save function
 * @param {React.RefObject} params.tasksRef - Tasks ref
 * @param {React.RefObject} params.nodePositionsRef - Node positions ref
 * @param {Date} params.startDate - Timeline start date
 * @param {string} params.timelineName - Timeline name
 * @param {number} params.totalWeeks - Total weeks in timeline
 * @returns {Object} Timeline bar drag/resize state and handlers
 */
export function useTimelineBar({
  setTasks,
  saveData,
  tasksRef,
  nodePositionsRef,
  startDate,
  timelineName,
  totalWeeks,
}) {
  // Drag state
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedOverTask, setDraggedOverTask] = useState(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState(null);

  // Refs to track current drag state (avoid stale closures)
  const dragStateRef = useRef({
    startX: 0,
    startWeek: 0,
    startDuration: 0,
    taskId: null,
    edge: null
  });

  // Refs for timeline containers
  const timelineRefs = useRef({});

  // Vertical drag handlers (reordering tasks)
  const handleDragStart = useCallback((e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, task) => {
    e.preventDefault();
    if (draggedTask && draggedTask.id !== task.id) {
      setDraggedOverTask(task);
    }
  }, [draggedTask]);

  const handleDrop = useCallback((e, dropTask, tasks) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.id === dropTask.id) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
    const dropIndex = tasks.findIndex(t => t.id === dropTask.id);

    const newTasks = [...tasks];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, draggedTask);

    setTasks(newTasks);
    saveData(newTasks, startDate, timelineName, nodePositionsRef.current);
    setDraggedTask(null);
    setDraggedOverTask(null);
  }, [draggedTask, startDate, timelineName, saveData, setTasks, nodePositionsRef]);

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null);
    setDraggedOverTask(null);
  }, []);

  // Horizontal drag handlers (timeline adjustment)
  const handleTimelineDragStart = useCallback((e, task) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDraggingTimeline(true);
    setDraggedTask(task);

    dragStateRef.current = {
      startX: e.clientX,
      startWeek: task.startWeek,
      startDuration: task.duration,
      taskId: task.id,
      edge: null
    };

    const handleMouseMove = (moveEvent) => {
      const timelineElement = timelineRefs.current[dragStateRef.current.taskId];
      if (!timelineElement) return;

      const rect = timelineElement.getBoundingClientRect();
      const weekWidth = rect.width / totalWeeks;
      const deltaX = moveEvent.clientX - dragStateRef.current.startX;
      const weeksDelta = Math.round(deltaX / weekWidth);

      let newStartWeek = dragStateRef.current.startWeek + weeksDelta;
      newStartWeek = Math.max(1, Math.min(newStartWeek, totalWeeks - dragStateRef.current.startDuration + 1));

      setTasks(prevTasks => prevTasks.map(t =>
        t.id === dragStateRef.current.taskId ? { ...t, startWeek: newStartWeek } : t
      ));
    };

    const handleMouseUp = () => {
      setIsDraggingTimeline(false);
      setDraggedTask(null);
      saveData(tasksRef.current, startDate, timelineName, nodePositionsRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [totalWeeks, startDate, timelineName, saveData, setTasks, tasksRef, nodePositionsRef]);

  // Resize handlers for timeline blocks
  const handleResizeStart = useCallback((e, task, edge) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    setResizeEdge(edge);
    setDraggedTask(task);

    dragStateRef.current = {
      startX: e.clientX,
      startWeek: task.startWeek,
      startDuration: task.duration,
      taskId: task.id,
      edge: edge
    };

    const handleMouseMove = (moveEvent) => {
      const timelineElement = timelineRefs.current[dragStateRef.current.taskId];
      if (!timelineElement) return;

      const rect = timelineElement.getBoundingClientRect();
      const weekWidth = rect.width / totalWeeks;
      const deltaX = moveEvent.clientX - dragStateRef.current.startX;
      const weeksDelta = Math.round(deltaX / weekWidth);

      if (dragStateRef.current.edge === 'left') {
        let newStartWeek = dragStateRef.current.startWeek + weeksDelta;
        let newDuration = dragStateRef.current.startDuration - weeksDelta;

        newStartWeek = Math.max(1, newStartWeek);
        newDuration = Math.max(1, newDuration);

        const originalEndWeek = dragStateRef.current.startWeek + dragStateRef.current.startDuration - 1;
        if (newStartWeek > originalEndWeek) {
          newStartWeek = originalEndWeek;
          newDuration = 1;
        }

        setTasks(prevTasks => prevTasks.map(t =>
          t.id === dragStateRef.current.taskId ? { ...t, startWeek: newStartWeek, duration: newDuration } : t
        ));
      } else if (dragStateRef.current.edge === 'right') {
        let newDuration = dragStateRef.current.startDuration + weeksDelta;
        newDuration = Math.max(1, newDuration);

        const maxDuration = totalWeeks - dragStateRef.current.startWeek + 1;
        newDuration = Math.min(newDuration, maxDuration);

        setTasks(prevTasks => prevTasks.map(t =>
          t.id === dragStateRef.current.taskId ? { ...t, duration: newDuration } : t
        ));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeEdge(null);
      setDraggedTask(null);
      saveData(tasksRef.current, startDate, timelineName, nodePositionsRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [totalWeeks, startDate, timelineName, saveData, setTasks, tasksRef, nodePositionsRef]);

  return {
    // State
    draggedTask,
    draggedOverTask,
    isDraggingTimeline,
    isResizing,
    resizeEdge,
    timelineRefs,

    // Handlers
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleTimelineDragStart,
    handleResizeStart,
  };
}
