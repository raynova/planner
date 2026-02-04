import { useState, useRef, useEffect, useCallback } from 'react';
import { dateToWeek, datesToDuration } from '../utils/dateUtils';
import { NODE_WIDTH, NODE_HEIGHT, PADDING, getDefaultNewTask } from '../constants/timeline';

/**
 * Hook for task CRUD operations
 * @param {Object} params
 * @param {Object[]} params.tasks - Current tasks array
 * @param {Function} params.setTasks - Tasks setter
 * @param {Object} params.nodePositions - Current node positions
 * @param {Function} params.setNodePositions - Node positions setter
 * @param {Date} params.startDate - Timeline start date
 * @param {string} params.timelineName - Timeline name
 * @param {Function} params.saveData - Save function
 * @returns {Object} Task operations
 */
export function useTaskOperations({
  tasks,
  setTasks,
  nodePositions,
  setNodePositions,
  startDate,
  timelineName,
  saveData,
}) {
  // New task form state
  const [newTask, setNewTask] = useState(getDefaultNewTask());
  const [newTaskPosition, setNewTaskPosition] = useState(null);
  const [lastClickedNodeId, setLastClickedNodeId] = useState(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Color picker state
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTask, setColorPickerTask] = useState(null);

  // Task editing state
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const editInputRef = useRef(null);
  const canBlurSaveRef = useRef(false);

  // Notes editing state
  const [editingNotesTask, setEditingNotesTask] = useState(null);
  const [editingNotesValue, setEditingNotesValue] = useState('');

  // Focus input when editing starts
  useEffect(() => {
    if (editingTaskId) {
      canBlurSaveRef.current = false;
      setTimeout(() => {
        canBlurSaveRef.current = true;
        if (editInputRef.current) {
          editInputRef.current.focus();
          editInputRef.current.select();
        }
      }, 50);
    }
  }, [editingTaskId]);

  // Add task
  const addTask = useCallback(() => {
    if (!newTask.name.trim()) return;

    const startWeek = dateToWeek(startDate, newTask.startDate);
    const duration = datesToDuration(newTask.startDate, newTask.endDate);
    const newTaskId = Date.now().toString();

    const updatedTasks = [
      ...tasks,
      {
        id: newTaskId,
        name: newTask.name,
        startWeek: startWeek,
        duration: duration,
        color: newTask.color,
        blockedBy: [],
        done: false,
        notes: newTask.notes || '',
      },
    ];

    // Calculate position for new task
    let taskPosition;
    if (newTaskPosition) {
      taskPosition = { x: newTaskPosition.x, y: newTaskPosition.y };
    } else {
      const diagramElement = document.getElementById('dependency-diagram');
      const diagramWidth = diagramElement ? diagramElement.clientWidth : 800;
      const cols = Math.floor((diagramWidth - 2 * PADDING) / (NODE_WIDTH + 40));

      const existingPositions = Object.keys(nodePositions).length;
      const col = existingPositions % cols;
      const row = Math.floor(existingPositions / cols);

      taskPosition = {
        x: PADDING + col * (NODE_WIDTH + 40),
        y: PADDING + row * (NODE_HEIGHT + 40)
      };
    }

    const newPositions = {
      ...nodePositions,
      [newTaskId]: taskPosition
    };

    setTasks(updatedTasks);
    setNodePositions(newPositions);
    saveData(updatedTasks, startDate, timelineName, newPositions);

    setNewTask(getDefaultNewTask());
    setNewTaskPosition(null);

    return newTaskId;
  }, [newTask, newTaskPosition, tasks, nodePositions, startDate, timelineName, saveData, setTasks, setNodePositions]);

  // Delete task (shows confirmation)
  const deleteTask = useCallback((id) => {
    const task = tasks.find(t => t.id === id);
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
  }, [tasks]);

  // Confirm delete
  const confirmDelete = useCallback(() => {
    if (!taskToDelete) return;

    const updatedTasks = tasks.filter(t => t.id !== taskToDelete.id);
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  }, [taskToDelete, tasks, startDate, timelineName, nodePositions, saveData, setTasks]);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  }, []);

  // Toggle dependency
  const toggleDependency = useCallback((taskId, dependencyId) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const blockedBy = task.blockedBy.includes(dependencyId)
          ? task.blockedBy.filter(id => id !== dependencyId)
          : [...task.blockedBy, dependencyId];
        return { ...task, blockedBy };
      }
      return task;
    });
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
  }, [tasks, startDate, timelineName, nodePositions, saveData, setTasks]);

  // Change task color
  const changeTaskColor = useCallback((taskId, newColor) => {
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, color: newColor } : t
    );
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
    setShowColorPicker(false);
    setColorPickerTask(null);
  }, [tasks, startDate, timelineName, nodePositions, saveData, setTasks]);

  // Toggle task done
  const toggleTaskDone = useCallback((taskId) => {
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
  }, [tasks, startDate, timelineName, nodePositions, saveData, setTasks]);

  // Start editing task name
  const startEditingTask = useCallback((taskId, currentName) => {
    setEditingTaskId(taskId);
    setEditingTaskName(currentName);
  }, []);

  // Cancel editing task
  const cancelEditingTask = useCallback(() => {
    setEditingTaskId(null);
    setEditingTaskName('');
  }, []);

  // Save task name
  const saveTaskName = useCallback((taskId) => {
    const trimmedName = editingTaskName.trim();
    if (!trimmedName) {
      cancelEditingTask();
      return;
    }
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, name: trimmedName } : t
    );
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
    setEditingTaskId(null);
    setEditingTaskName('');
  }, [editingTaskName, tasks, startDate, timelineName, nodePositions, saveData, setTasks, cancelEditingTask]);

  // Start editing notes
  const startEditingNotes = useCallback((task) => {
    setEditingNotesTask(task);
    setEditingNotesValue(task.notes || '');
  }, []);

  // Save task notes
  const saveTaskNotes = useCallback(() => {
    if (!editingNotesTask) return;
    const updatedTasks = tasks.map(t =>
      t.id === editingNotesTask.id ? { ...t, notes: editingNotesValue } : t
    );
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
    setEditingNotesTask(null);
    setEditingNotesValue('');
  }, [editingNotesTask, editingNotesValue, tasks, startDate, timelineName, nodePositions, saveData, setTasks]);

  // Cancel editing notes
  const cancelEditingNotes = useCallback(() => {
    setEditingNotesTask(null);
    setEditingNotesValue('');
  }, []);

  // Open color picker
  const openColorPicker = useCallback((task) => {
    setColorPickerTask(task);
    setShowColorPicker(true);
  }, []);

  // Close color picker
  const closeColorPicker = useCallback(() => {
    setShowColorPicker(false);
    setColorPickerTask(null);
  }, []);

  // Get task by ID helper
  const getTaskById = useCallback((id) => tasks.find(t => t.id === id), [tasks]);

  // Get blocking tasks helper
  const getBlockingTasks = useCallback((task) => {
    return task.blockedBy.map(id => getTaskById(id)).filter(Boolean);
  }, [getTaskById]);

  // Check for circular dependency
  const hasCircularDependency = useCallback((taskId, dependencyId, visited = new Set()) => {
    if (taskId === dependencyId) return true;
    if (visited.has(dependencyId)) return false;

    visited.add(dependencyId);
    const depTask = getTaskById(dependencyId);
    if (!depTask) return false;

    return depTask.blockedBy.some(id => hasCircularDependency(taskId, id, new Set(visited)));
  }, [getTaskById]);

  // Initialize node positions for new tasks
  const initializeNodePositions = useCallback(() => {
    const newPositions = { ...nodePositions };
    let updated = false;

    const diagramElement = document.getElementById('dependency-diagram');
    const diagramWidth = diagramElement ? diagramElement.clientWidth : 800;
    const diagramHeight = diagramElement ? diagramElement.clientHeight : 500;
    const cols = Math.max(1, Math.floor((diagramWidth - 2 * PADDING) / (NODE_WIDTH + 40)));

    let index = 0;
    tasks.forEach((task) => {
      if (!newPositions[task.id]) {
        let x, y;

        if (lastClickedNodeId && nodePositions[lastClickedNodeId]) {
          const clickedPos = nodePositions[lastClickedNodeId];
          x = clickedPos.x + 60;
          y = clickedPos.y + 120;

          if (x + NODE_WIDTH > diagramWidth - PADDING) {
            x = clickedPos.x - 60;
          }
          if (y + NODE_HEIGHT > diagramHeight - PADDING) {
            y = clickedPos.y - 120;
          }
        } else {
          const col = index % cols;
          const row = Math.floor(index / cols);
          x = PADDING + col * (NODE_WIDTH + 40);
          y = PADDING + row * (NODE_HEIGHT + 40);
        }

        newPositions[task.id] = { x, y };
        updated = true;
        index++;
      } else {
        index++;
      }
    });

    if (updated) {
      setNodePositions(newPositions);
      saveData(tasks, startDate, timelineName, newPositions);
      setLastClickedNodeId(null);
    }
  }, [tasks, nodePositions, lastClickedNodeId, startDate, timelineName, saveData, setNodePositions]);

  return {
    // New task state
    newTask,
    setNewTask,
    newTaskPosition,
    setNewTaskPosition,
    lastClickedNodeId,
    setLastClickedNodeId,

    // Delete confirmation
    showDeleteConfirm,
    taskToDelete,

    // Color picker
    showColorPicker,
    colorPickerTask,

    // Task editing
    editingTaskId,
    editingTaskName,
    setEditingTaskName,
    editInputRef,
    canBlurSaveRef,

    // Notes editing
    editingNotesTask,
    editingNotesValue,
    setEditingNotesValue,

    // Operations
    addTask,
    deleteTask,
    confirmDelete,
    cancelDelete,
    toggleDependency,
    changeTaskColor,
    toggleTaskDone,
    startEditingTask,
    cancelEditingTask,
    saveTaskName,
    startEditingNotes,
    saveTaskNotes,
    cancelEditingNotes,
    openColorPicker,
    closeColorPicker,
    getTaskById,
    getBlockingTasks,
    hasCircularDependency,
    initializeNodePositions,
  };
}
