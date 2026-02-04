import React, { useState } from 'react';
import { Calendar, ChevronRight, Plus, X, AlertCircle, Check } from 'lucide-react';

export default function TimelinePlanner({ timelineId, initialData, onSave, onSocketSync }) {
  // Start date - defaults to today
  const [startDate, setStartDate] = useState(
    initialData?.start_date ? new Date(initialData.start_date) : new Date()
  );
  const [timelineName, setTimelineName] = useState(initialData?.name || 'My Timeline');
  const [isEditingName, setIsEditingName] = useState(false);

  const [tasks, setTasks] = useState(initialData?.tasks || []);
  const [saveStatus, setSaveStatus] = useState('');
  const [nodePositions, setNodePositions] = useState(initialData?.node_positions || {});

  // Track the last remote update marker to detect external changes
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState(null);

  // Sync state from initialData when it changes due to remote updates
  React.useEffect(() => {
    if (initialData?._remoteUpdate && initialData._remoteUpdate !== lastRemoteUpdate) {
      console.log('Applying remote update to TimelinePlanner');
      setTasks(initialData.tasks || []);
      setNodePositions(initialData.node_positions || {});
      setTimelineName(initialData.name || 'My Timeline');
      setStartDate(initialData.start_date ? new Date(initialData.start_date) : new Date());
      setLastRemoteUpdate(initialData._remoteUpdate);
    }
  }, [initialData, lastRemoteUpdate]);

  const saveData = async (newTasks, newStartDate, newTimelineName, newNodePositions) => {
    try {
      setSaveStatus('Saving...');
      const data = {
        tasks: newTasks,
        startDate: (newStartDate || startDate).toISOString().split('T')[0],
        name: newTimelineName !== undefined ? newTimelineName : timelineName,
        nodePositions: newNodePositions !== undefined ? newNodePositions : nodePositions,
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
  };

  const [viewMode, setViewMode] = useState('weekly'); // 'weekly', 'monthly', or 'halfyear'
  const [showAddTask, setShowAddTask] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerTask, setColorPickerTask] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [selectedTaskForDep, setSelectedTaskForDep] = useState(null);
  const [lastClickedNodeId, setLastClickedNodeId] = useState(null);
  const [arrowContextMenu, setArrowContextMenu] = useState(null);
  const [hoveredArrow, setHoveredArrow] = useState(null);
  const [showDeleteNodeConfirm, setShowDeleteNodeConfirm] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState(null);
  const [diagramPan, setDiagramPan] = useState({ x: 0, y: 0 });
  const [diagramZoom, setDiagramZoom] = useState(1);
  const [isPanningDiagram, setIsPanningDiagram] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [newTask, setNewTask] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    color: 'bg-blue-500',
    blockedBy: [],
  });

  // Drag and drop states
  const [draggedTask, setDraggedTask] = useState(null);
  const [draggedOverTask, setDraggedOverTask] = useState(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState(null);

  // Helper function to get date for a given week (weeks start on Monday)
  const getWeekDate = (weekNum) => {
    const date = new Date(startDate);
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    date.setDate(date.getDate() + daysToMonday);
    date.setDate(date.getDate() + (weekNum - 1) * 7);
    return date;
  };

  // Helper function to convert a date to week number
  const dateToWeek = (dateStr) => {
    const targetDate = new Date(dateStr);
    const firstMonday = getWeekDate(1);
    const diffTime = targetDate - firstMonday;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7) + 1;
  };

  // Helper function to calculate duration in weeks from start and end dates
  const datesToDuration = (startDateStr, endDateStr) => {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 7));
  };

  // Helper function to format date as DD/MM/YYYY
  const formatDateDDMMYYYY = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Helper function to format date range
  const formatDateRange = (weekNum, duration) => {
    const start = getWeekDate(weekNum);
    const end = new Date(start);
    end.setDate(end.getDate() + duration * 7 - 1);

    return `${formatDateDDMMYYYY(start)} - ${formatDateDDMMYYYY(end)}`;
  };

  // Helper function to get month for a week
  const getMonthForWeek = (weekNum) => {
    const date = getWeekDate(weekNum);
    return date.getMonth();
  };

  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-red-500',
    'bg-yellow-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ];

  // Calculate the minimum weeks needed based on last task end date + 2 months buffer
  const getMinWeeksNeeded = () => {
    if (tasks.length === 0) return 16;
    const maxEndWeek = Math.max(...tasks.map(t => t.startWeek + t.duration - 1));
    return maxEndWeek + 8;
  };

  // Base weeks for each view mode
  const getBaseWeeks = () => {
    if (viewMode === 'weekly') return 16;
    if (viewMode === 'monthly') return 24;
    if (viewMode === 'halfyear') return 26;
    return 16;
  };

  const totalWeeks = Math.max(getBaseWeeks(), getMinWeeksNeeded());
  const weeksInMonth = 4;

  // Create refs for all timeline containers
  const timelineRefs = React.useRef({});

  // Refs to track current drag state (avoid stale closures)
  const dragStateRef = React.useRef({
    startX: 0,
    startWeek: 0,
    startDuration: 0,
    taskId: null,
    edge: null
  });

  // Refs to track latest state values (avoid stale closures in event handlers)
  const tasksRef = React.useRef(tasks);
  const nodePositionsRef = React.useRef(nodePositions);

  React.useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  React.useEffect(() => {
    nodePositionsRef.current = nodePositions;
  }, [nodePositions]);

  const addTask = () => {
    if (!newTask.name.trim()) return;

    const startWeek = dateToWeek(newTask.startDate);
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
      },
    ];

    // Calculate position for new task
    const diagramElement = document.getElementById('dependency-diagram');
    const diagramWidth = diagramElement ? diagramElement.clientWidth : 800;
    const nodeWidth = 160;
    const nodeHeight = 60;
    const padding = 20;
    const cols = Math.floor((diagramWidth - 2 * padding) / (nodeWidth + 40));

    const existingPositions = Object.keys(nodePositions).length;
    const col = existingPositions % cols;
    const row = Math.floor(existingPositions / cols);

    const newPositions = {
      ...nodePositions,
      [newTaskId]: {
        x: padding + col * (nodeWidth + 40),
        y: padding + row * (nodeHeight + 40)
      }
    };

    setTasks(updatedTasks);
    setNodePositions(newPositions);
    saveData(updatedTasks, startDate, timelineName, newPositions);

    setNewTask({
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      color: 'bg-blue-500',
      blockedBy: [],
    });
    setShowAddTask(false);
  };

  const deleteTask = (id) => {
    const task = tasks.find(t => t.id === id);
    setTaskToDelete(task);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!taskToDelete) return;

    const updatedTasks = tasks.filter(t => t.id !== taskToDelete.id);
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setTaskToDelete(null);
  };

  const toggleDependency = (taskId, dependencyId) => {
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
  };

  const updateStartDate = (newDate) => {
    setStartDate(newDate);
    saveData(tasks, newDate, timelineName, nodePositions);
  };

  const changeTaskColor = (taskId, newColor) => {
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, color: newColor } : t
    );
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
    setShowColorPicker(false);
    setColorPickerTask(null);
  };

  const toggleTaskDone = (taskId) => {
    const updatedTasks = tasks.map(t =>
      t.id === taskId ? { ...t, done: !t.done } : t
    );
    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
  };

  // Initialize node positions for new tasks
  React.useEffect(() => {
    const newPositions = { ...nodePositions };
    let updated = false;

    const diagramElement = document.getElementById('dependency-diagram');
    const diagramWidth = diagramElement ? diagramElement.clientWidth : 800;
    const diagramHeight = diagramElement ? diagramElement.clientHeight : 500;
    const nodeWidth = 160;
    const nodeHeight = 60;
    const padding = 20;
    const cols = Math.max(1, Math.floor((diagramWidth - 2 * padding) / (nodeWidth + 40)));

    let index = 0;
    tasks.forEach((task) => {
      if (!newPositions[task.id]) {
        let x, y;

        if (lastClickedNodeId && nodePositions[lastClickedNodeId]) {
          const clickedPos = nodePositions[lastClickedNodeId];
          x = clickedPos.x + 60;
          y = clickedPos.y + 120;

          if (x + nodeWidth > diagramWidth - padding) {
            x = clickedPos.x - 60;
          }
          if (y + nodeHeight > diagramHeight - padding) {
            y = clickedPos.y - 120;
          }
        } else {
          const col = index % cols;
          const row = Math.floor(index / cols);
          x = padding + col * (nodeWidth + 40);
          y = padding + row * (nodeHeight + 40);
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
  }, [tasks]);

  // Dependency diagram handlers
  const handleNodeMouseDown = (e, taskId) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedNode(taskId);

    const diagramArea = document.getElementById('dependency-diagram');
    if (!diagramArea) return;

    const rect = diagramArea.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = nodePositions[taskId] || { x: 100, y: 100 };

    const handleMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / diagramZoom;
      const deltaY = (moveEvent.clientY - startY) / diagramZoom;

      let newX = startPos.x + deltaX;
      let newY = startPos.y + deltaY;

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      setNodePositions(prev => ({
        ...prev,
        [taskId]: { x: newX, y: newY }
      }));
    };

    const handleMouseUp = () => {
      setDraggedNode(null);
      saveData(tasksRef.current, startDate, timelineName, nodePositionsRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTaskSelect = (taskId) => {
    setSelectedTaskForDep(taskId);
  };

  const handleAddDependency = (fromTaskId, toTaskId) => {
    if (fromTaskId === toTaskId) return;
    if (hasCircularDependency(toTaskId, fromTaskId)) {
      alert('Cannot add dependency: would create a circular dependency');
      return;
    }

    setLastClickedNodeId(fromTaskId);
    toggleDependency(toTaskId, fromTaskId);
  };

  const autoArrangeNodes = () => {
    const nodeWidth = 160;
    const nodeHeight = 60;
    const horizontalSpacing = 40;
    const verticalSpacing = 100;
    const padding = 50;

    const levels = [];
    const visited = new Set();
    const taskLevels = {};

    const getRootTasks = () => {
      return tasks.filter(task => task.blockedBy.length === 0);
    };

    const calculateDepth = (taskId, depth = 0) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      if (!taskLevels[taskId] || taskLevels[taskId] < depth) {
        taskLevels[taskId] = depth;
      }

      const dependents = tasks.filter(t => t.blockedBy.includes(taskId));
      dependents.forEach(dep => {
        calculateDepth(dep.id, depth + 1);
      });
    };

    const roots = getRootTasks();
    roots.forEach(root => calculateDepth(root.id, 0));

    tasks.forEach(task => {
      if (!visited.has(task.id)) {
        taskLevels[task.id] = 0;
      }
    });

    const maxLevel = Math.max(...Object.values(taskLevels), 0);
    for (let i = 0; i <= maxLevel; i++) {
      levels[i] = [];
    }

    Object.keys(taskLevels).forEach(taskId => {
      const level = taskLevels[taskId];
      levels[level].push(taskId);
    });

    const newPositions = {};
    const diagramElement = document.getElementById('dependency-diagram');
    const diagramWidth = diagramElement ? diagramElement.clientWidth : 800;

    levels.forEach((levelTasks, levelIndex) => {
      const tasksInLevel = levelTasks.length;
      const totalWidth = tasksInLevel * nodeWidth + (tasksInLevel - 1) * horizontalSpacing;
      const startX = Math.max(padding, (diagramWidth - totalWidth) / 2);

      levelTasks.forEach((taskId, index) => {
        newPositions[taskId] = {
          x: startX + index * (nodeWidth + horizontalSpacing),
          y: padding + levelIndex * (nodeHeight + verticalSpacing)
        };
      });
    });

    setNodePositions(newPositions);
    saveData(tasks, startDate, timelineName, newPositions);
  };

  const handleDeleteNodeFromDiagram = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setNodeToDelete(task);
    setShowDeleteNodeConfirm(true);
  };

  const confirmDeleteNodeFromDiagram = () => {
    if (!nodeToDelete) return;

    const newPositions = { ...nodePositions };
    delete newPositions[nodeToDelete.id];
    setNodePositions(newPositions);
    saveData(tasks, startDate, timelineName, newPositions);

    setShowDeleteNodeConfirm(false);
    setNodeToDelete(null);
  };

  const cancelDeleteNodeFromDiagram = () => {
    setShowDeleteNodeConfirm(false);
    setNodeToDelete(null);
  };

  const handleDeleteDependency = (fromTaskId, toTaskId) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === toTaskId) {
        const newBlockedBy = task.blockedBy.filter(id => id !== fromTaskId);
        return { ...task, blockedBy: newBlockedBy };
      }
      return task;
    });

    setTasks(updatedTasks);
    saveData(updatedTasks, startDate, timelineName, nodePositions);
    setArrowContextMenu(null);
  };

  // Pan/Zoom diagram handlers
  const handleDiagramMouseDown = (e) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanningDiagram(true);
      setPanStart({ x: e.clientX - diagramPan.x, y: e.clientY - diagramPan.y });
    }
  };

  const handleDiagramMouseMove = (e) => {
    if (isPanningDiagram) {
      setDiagramPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleDiagramMouseUp = () => {
    setIsPanningDiagram(false);
  };

  const handleDiagramWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setDiagramZoom(prev => Math.max(0.25, Math.min(3, prev + delta)));
    }
  };

  const zoomIn = () => {
    setDiagramZoom(prev => Math.min(3, prev + 0.1));
  };

  const zoomOut = () => {
    setDiagramZoom(prev => Math.max(0.25, prev - 0.1));
  };

  // Close context menu when clicking anywhere
  React.useEffect(() => {
    const handleClick = (e) => {
      if (arrowContextMenu && !e.target.closest('.arrow-context-menu')) {
        setArrowContextMenu(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [arrowContextMenu]);

  // Prevent browser zoom in diagram area
  React.useEffect(() => {
    const diagramElement = document.getElementById('dependency-diagram');
    if (!diagramElement) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    diagramElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      diagramElement.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Prevent browser zoom globally when hovering over the planner
  React.useEffect(() => {
    const handleGlobalWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const diagramElement = document.getElementById('dependency-diagram');
        if (diagramElement && diagramElement.contains(e.target)) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', handleGlobalWheel);
    };
  }, []);

  // Vertical drag handlers (reordering tasks)
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, task) => {
    e.preventDefault();
    if (draggedTask && draggedTask.id !== task.id) {
      setDraggedOverTask(task);
    }
  };

  const handleDrop = (e, dropTask) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.id === dropTask.id) return;

    const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
    const dropIndex = tasks.findIndex(t => t.id === dropTask.id);

    const newTasks = [...tasks];
    newTasks.splice(draggedIndex, 1);
    newTasks.splice(dropIndex, 0, draggedTask);

    setTasks(newTasks);
    saveData(newTasks, startDate, timelineName, nodePositions);
    setDraggedTask(null);
    setDraggedOverTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDraggedOverTask(null);
  };

  // Horizontal drag handlers (timeline adjustment)
  const handleTimelineDragStart = (e, task) => {
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
  };

  // Resize handlers for timeline blocks
  const handleResizeStart = (e, task, edge) => {
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
  };

  const getTaskById = (id) => tasks.find(t => t.id === id);

  const getBlockingTasks = (task) => {
    return task.blockedBy.map(id => getTaskById(id)).filter(Boolean);
  };

  const hasCircularDependency = (taskId, dependencyId, visited = new Set()) => {
    if (taskId === dependencyId) return true;
    if (visited.has(dependencyId)) return false;

    visited.add(dependencyId);
    const depTask = getTaskById(dependencyId);
    if (!depTask) return false;

    return depTask.blockedBy.some(id => hasCircularDependency(taskId, id, visited));
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                <div>
                  {isEditingName ? (
                    <input
                      type="text"
                      value={timelineName}
                      onChange={(e) => setTimelineName(e.target.value)}
                      onBlur={() => {
                        setIsEditingName(false);
                        saveData(tasks, startDate, timelineName, nodePositions);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsEditingName(false);
                          saveData(tasks, startDate, timelineName, nodePositions);
                        }
                      }}
                      autoFocus
                      className="text-3xl font-bold text-slate-800 border-b-2 border-blue-500 focus:outline-none"
                    />
                  ) : (
                    <h1
                      className="text-3xl font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition"
                      onClick={() => setIsEditingName(true)}
                      title="Click to edit"
                    >
                      {timelineName}
                    </h1>
                  )}
                  <div className="text-sm text-green-600 h-5 mt-1">
                    {saveStatus}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setViewMode('weekly')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    viewMode === 'weekly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Weekly
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    viewMode === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode('halfyear')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    viewMode === 'halfyear'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Half Year
                </button>
                <button
                  onClick={() => setShowAddTask(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Task
                </button>
              </div>
            </div>
          </div>

        {/* Timeline Grid */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 overflow-x-auto">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Timeline Start Date
            </label>
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => updateStartDate(new Date(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="min-w-max">
            {/* Timeline Header */}
            <div className="flex mb-4">
              <div className="w-64 flex-shrink-0"></div>
              <div className="flex flex-1">
                {viewMode === 'weekly' ? (
                  Array.from({ length: totalWeeks }, (_, i) => {
                    const weekNum = i + 1;
                    const weekDate = getWeekDate(weekNum);
                    const currentMonth = getMonthForWeek(weekNum);
                    const prevMonth = i > 0 ? getMonthForWeek(weekNum - 1) : -1;
                    const isMonthStart = currentMonth !== prevMonth;

                    return (
                      <div
                        key={i}
                        className={`flex-1 text-center text-xs font-medium border-l px-1 ${
                          isMonthStart ? 'border-l-4 border-l-blue-600' : 'border-slate-200'
                        } ${currentMonth % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
                        style={{ minWidth: '70px' }}
                      >
                        <div className={`${isMonthStart ? 'text-blue-700 font-bold' : 'text-slate-600'}`}>
                          {String(weekDate.getDate()).padStart(2, '0')}/{String(weekDate.getMonth() + 1).padStart(2, '0')}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  Array.from({ length: totalWeeks / weeksInMonth }, (_, i) => {
                    const monthStart = getWeekDate(i * weeksInMonth + 1);
                    return (
                      <div
                        key={i}
                        className={`flex-1 text-center text-sm font-semibold border-l-4 border-blue-600 px-2 ${
                          i % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                        }`}
                        style={{ minWidth: '280px' }}
                      >
                        <div className="text-blue-700">
                          {monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Tasks */}
            {tasks.map((task) => {
              const blockingTasks = getBlockingTasks(task);
              const endWeek = task.startWeek + task.duration - 1;
              const dateRange = formatDateRange(task.startWeek, task.duration);
              const isBeingDragged = draggedTask?.id === task.id && !isDraggingTimeline;
              const isDropTarget = draggedOverTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  className={`mb-3 transition-all ${isBeingDragged ? 'opacity-50' : ''} ${isDropTarget ? 'border-t-2 border-blue-500' : ''} ${task.done ? 'bg-green-50 rounded-lg' : ''}`}
                  draggable={!isDraggingTimeline && !isResizing}
                  onDragStart={(e) => !isDraggingTimeline && !isResizing && handleDragStart(e, task)}
                  onDragOver={(e) => !isDraggingTimeline && !isResizing && handleDragOver(e, task)}
                  onDrop={(e) => !isDraggingTimeline && !isResizing && handleDrop(e, task)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center">
                    {/* Task Info */}
                    <div className="w-64 flex-shrink-0 pr-4 cursor-move">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className={`font-semibold flex items-center gap-2 ${task.done ? 'text-green-700' : 'text-slate-800'}`}>
                            <span className="text-slate-400">⋮⋮</span>
                            {task.name}
                            {task.done && <Check className="w-4 h-4 text-green-600" />}
                          </div>
                          <div className="text-xs text-slate-500">
                            {dateRange}
                          </div>
                          {blockingTasks.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-amber-600 group relative">
                              <AlertCircle className="w-3 h-3" />
                              <span className="cursor-help">Blocked by: {blockingTasks.length}</span>
                              <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                                {blockingTasks.map(t => t.name).join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={() => toggleTaskDone(task.id)}
                            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                              task.done
                                ? 'bg-green-500 border-green-600 text-white'
                                : 'bg-white border-slate-300 hover:border-green-500'
                            }`}
                            title={task.done ? "Mark as not done" : "Mark as done"}
                          >
                            {task.done && <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setColorPickerTask(task);
                              setShowColorPicker(true);
                            }}
                            className={`${task.color} w-6 h-6 rounded border-2 border-slate-300 hover:border-slate-500 transition`}
                            title="Change color"
                          />
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div
                      ref={(el) => timelineRefs.current[task.id] = el}
                      className="flex flex-1 relative h-12"
                    >
                      {Array.from({ length: totalWeeks }, (_, i) => {
                        const weekNum = i + 1;
                        const currentMonth = getMonthForWeek(weekNum);
                        const prevMonth = i > 0 ? getMonthForWeek(weekNum - 1) : -1;
                        const isMonthStart = currentMonth !== prevMonth;

                        return (
                          <div
                            key={i}
                            className={`flex-1 border-l ${
                              isMonthStart ? 'border-l-4 border-l-blue-600' : 'border-slate-200'
                            } ${currentMonth % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
                            style={{ minWidth: viewMode === 'weekly' ? '70px' : '70px' }}
                          ></div>
                        );
                      })}
                      <div
                        className={`absolute top-1 ${task.color} text-white rounded-lg shadow-md flex items-center justify-center text-sm font-medium hover:shadow-lg transition select-none ${
                          isDraggingTimeline && draggedTask?.id === task.id ? 'shadow-2xl ring-2 ring-white' : ''
                        } ${isResizing && draggedTask?.id === task.id ? 'shadow-2xl ring-2 ring-white' : ''}`}
                        style={{
                          left: `${((task.startWeek - 1) / totalWeeks) * 100}%`,
                          width: `${(task.duration / totalWeeks) * 100}%`,
                          height: '40px',
                        }}
                      >
                        {/* Left resize handle */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white hover:bg-opacity-20 flex items-center justify-center group"
                          onMouseDown={(e) => handleResizeStart(e, task, 'left')}
                        >
                          <div className="text-xs opacity-0 group-hover:opacity-100">◀</div>
                        </div>

                        {/* Center draggable area */}
                        <div
                          className="flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing"
                          onMouseDown={(e) => {
                            if (e.target === e.currentTarget || e.target.tagName === 'DIV') {
                              handleTimelineDragStart(e, task);
                            }
                          }}
                        >
                          {task.name}
                        </div>

                        {/* Right resize handle */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-white hover:bg-opacity-20 flex items-center justify-center group"
                          onMouseDown={(e) => handleResizeStart(e, task, 'right')}
                        >
                          <div className="text-xs opacity-0 group-hover:opacity-100">▶</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dependencies Diagram */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">Task Dependencies</h2>
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1">
                <button
                  onClick={zoomOut}
                  className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-200 rounded text-slate-700 font-bold transition"
                  title="Zoom out"
                >
                  −
                </button>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="25"
                    max="300"
                    value={Math.round(diagramZoom * 100)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setDiagramZoom(Math.max(0.25, Math.min(3, val / 100)));
                      }
                    }}
                    className="w-12 text-sm text-slate-600 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
                <button
                  onClick={zoomIn}
                  className="w-6 h-6 flex items-center justify-center bg-white hover:bg-slate-200 rounded text-slate-700 font-bold transition"
                  title="Zoom in"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDiagramPan({ x: 0, y: 0 });
                  setDiagramZoom(1);
                }}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition"
              >
                Reset View
              </button>
              <button
                onClick={autoArrangeNodes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
              >
                Auto-Arrange
              </button>
            </div>
          </div>

          {/* Task selector bar */}
          <div className="mb-4 p-4 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600 mb-2">Select tasks to connect dependencies:</div>
            <div className="flex flex-wrap gap-2">
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleTaskSelect(task.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                    selectedTaskForDep === task.id
                      ? `${task.color} text-white ring-2 ring-offset-2 ring-slate-400`
                      : `${task.color} text-white opacity-70 hover:opacity-100`
                  }`}
                >
                  {task.name}
                </button>
              ))}
            </div>
            {selectedTaskForDep && (
              <div className="mt-3 text-sm text-slate-700">
                <strong>Selected:</strong> {tasks.find(t => t.id === selectedTaskForDep)?.name}
                <br />
                <span className="text-xs text-slate-500">Click another task to create a dependency (selected task will be blocked by clicked task)</span>
              </div>
            )}
          </div>

          {/* Diagram area */}
          <div
            id="dependency-diagram"
            className="relative border-2 border-slate-200 rounded-lg bg-slate-50 overflow-hidden"
            style={{ height: '500px', position: 'relative', cursor: isPanningDiagram ? 'grabbing' : 'default' }}
            onMouseDown={handleDiagramMouseDown}
            onMouseMove={handleDiagramMouseMove}
            onMouseUp={handleDiagramMouseUp}
            onMouseLeave={handleDiagramMouseUp}
            onWheel={handleDiagramWheel}
            onClick={(e) => {
              if (selectedTaskForDep && !e.target.closest('[data-task-node]')) {
                setSelectedTaskForDep(null);
              }
            }}
          >
            {/* Pan/Zoom wrapper */}
            <div
              style={{
                transform: `translate(${diagramPan.x}px, ${diagramPan.y}px) scale(${diagramZoom})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%',
                position: 'relative'
              }}
            >
            {/* Task nodes */}
            {tasks.map(task => {
              const pos = nodePositions[task.id];
              if (!pos) return null;

              const isDragging = draggedNode === task.id;
              const blockingTasksInDiagram = task.blockedBy.map(id => tasks.find(t => t.id === id)).filter(Boolean);

              return (
                <div
                  key={task.id}
                  data-task-node="true"
                  onMouseDown={(e) => {
                    if (e.target.closest('.delete-node-btn')) return;
                    if (!selectedTaskForDep) {
                      handleNodeMouseDown(e, task.id);
                    }
                  }}
                  onClick={(e) => {
                    if (e.target.closest('.delete-node-btn')) return;
                    if (!isDragging && selectedTaskForDep && selectedTaskForDep !== task.id) {
                      setLastClickedNodeId(task.id);
                      handleAddDependency(task.id, selectedTaskForDep);
                      setSelectedTaskForDep(null);
                    }
                  }}
                  className={`absolute ${task.done ? 'bg-green-500' : task.color} text-white rounded-lg shadow-lg p-3 transition select-none ${
                    selectedTaskForDep === task.id ? 'ring-4 ring-yellow-400' : ''
                  } ${
                    selectedTaskForDep && selectedTaskForDep !== task.id
                      ? 'cursor-pointer hover:ring-2 hover:ring-white'
                      : 'cursor-move hover:shadow-xl'
                  } ${isDragging ? 'opacity-70 cursor-grabbing' : ''} ${task.done ? 'ring-2 ring-green-300' : ''}`}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                    width: '160px',
                    minHeight: '60px',
                    zIndex: 10
                  }}
                >
                  <button
                    className="delete-node-btn absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition border-2 border-black text-xs font-bold leading-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNodeFromDiagram(task.id);
                    }}
                    title="Remove from diagram"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="font-semibold text-sm flex items-center gap-1">
                    {task.done && <Check className="w-4 h-4 text-white" />}
                    {task.name}
                  </div>
                  {task.blockedBy.length > 0 && (
                    <div className="text-xs mt-1 opacity-90 group relative">
                      <span className="cursor-help">Blocked by: {task.blockedBy.length}</span>
                      <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50">
                        {blockingTasksInDiagram.map(t => t.name).join(', ')}
                      </div>
                    </div>
                  )}
                  {selectedTaskForDep && selectedTaskForDep !== task.id && (
                    <div className="text-xs mt-1 bg-white bg-opacity-20 rounded px-1">
                      Click to connect
                    </div>
                  )}
                </div>
              );
            })}

            {/* Draw arrows for dependencies */}
            <svg
              className="absolute inset-0"
              style={{ width: '100%', height: '100%', zIndex: 5, pointerEvents: 'none' }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#64748b" />
                </marker>
                <marker
                  id="arrowhead-highlight"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                </marker>
              </defs>
              {tasks.map(task => {
                const toPos = nodePositions[task.id];
                if (!toPos) return null;

                return task.blockedBy.map(fromTaskId => {
                  const fromPos = nodePositions[fromTaskId];
                  if (!fromPos) return null;

                  const fromTask = tasks.find(t => t.id === fromTaskId);
                  if (!fromTask) return null;

                  const isHovered = hoveredArrow && hoveredArrow.fromTaskId === fromTaskId && hoveredArrow.toTaskId === task.id;

                  const nodeWidth = 160;
                  const nodeHeight = 60;

                  const fromCenterX = fromPos.x + nodeWidth / 2;
                  const fromCenterY = fromPos.y + nodeHeight / 2;
                  const toCenterX = toPos.x + nodeWidth / 2;
                  const toCenterY = toPos.y + nodeHeight / 2;

                  const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);

                  const getEdgePoint = (centerX, centerY, angle, width, height) => {
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const halfW = width / 2;
                    const halfH = height / 2;

                    let x, y;

                    if (Math.abs(cos) > Math.abs(sin) * (halfW / halfH)) {
                      x = centerX + Math.sign(cos) * halfW;
                      y = centerY + Math.sign(cos) * halfW * Math.tan(angle);
                    } else {
                      y = centerY + Math.sign(sin) * halfH;
                      x = centerX + Math.sign(sin) * halfH / Math.tan(angle);
                    }

                    return { x, y };
                  };

                  const fromPoint = getEdgePoint(fromCenterX, fromCenterY, angle, nodeWidth, nodeHeight);
                  const toPoint = getEdgePoint(toCenterX, toCenterY, angle + Math.PI, nodeWidth, nodeHeight);

                  return (
                    <g key={`${fromTaskId}-${task.id}`}>
                      <line
                        x1={fromPoint.x}
                        y1={fromPoint.y}
                        x2={toPoint.x}
                        y2={toPoint.y}
                        stroke="transparent"
                        strokeWidth="30"
                        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                        onMouseEnter={() => setHoveredArrow({ fromTaskId, toTaskId: task.id })}
                        onMouseLeave={() => setHoveredArrow(null)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setArrowContextMenu({
                            x: e.clientX,
                            y: e.clientY,
                            fromTaskId: fromTaskId,
                            toTaskId: task.id
                          });
                        }}
                      />
                      <line
                        x1={fromPoint.x}
                        y1={fromPoint.y}
                        x2={toPoint.x}
                        y2={toPoint.y}
                        stroke={isHovered ? "#3b82f6" : "#64748b"}
                        strokeWidth={isHovered ? "4" : "3"}
                        markerEnd={isHovered ? "url(#arrowhead-highlight)" : "url(#arrowhead)"}
                        opacity={isHovered ? "1" : "0.8"}
                        style={{ pointerEvents: 'none', transition: 'stroke 0.15s, stroke-width 0.15s' }}
                      />
                    </g>
                  );
                });
              })}
            </svg>

            {tasks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                Add tasks to see the dependency diagram
              </div>
            )}
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-600">
            <strong>How to use:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>To move nodes:</strong> Click and drag any node to reposition it in the diagram</li>
              <li><strong>To pan diagram:</strong> Hold middle mouse button and drag to move the entire view</li>
              <li><strong>To zoom:</strong> Use the +/− buttons or hold Ctrl and scroll mouse wheel</li>
              <li><strong>To remove from diagram:</strong> Click the × button (task stays in timeline, only removed from diagram view)</li>
              <li><strong>To add dependencies:</strong> Select a task from the top bar, then click another node in the diagram</li>
              <li><strong>To delete a dependency:</strong> Right-click on any arrow and confirm deletion</li>
              <li><strong>Auto-Arrange:</strong> Organizes nodes in a tree layout based on dependencies</li>
            </ul>
          </div>
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Add New Task</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter task name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newTask.startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setNewTask({
                        ...newTask,
                        startDate: newStartDate,
                        endDate: newStartDate > newTask.endDate ? newStartDate : newTask.endDate
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newTask.endDate}
                    min={newTask.startDate}
                    onChange={(e) => setNewTask({ ...newTask, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewTask({ ...newTask, color })}
                        className={`w-8 h-8 rounded-full ${color} ${
                          newTask.color === color ? 'ring-4 ring-slate-400' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={addTask}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Add Task
                </button>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Color Picker Modal */}
        {showColorPicker && colorPickerTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Change Color: {colorPickerTask.name}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Select a color
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => changeTaskColor(colorPickerTask.id, color)}
                        className={`w-full h-12 rounded-lg ${color} hover:scale-110 transition ${
                          colorPickerTask.color === color ? 'ring-4 ring-slate-400' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowColorPicker(false);
                    setColorPickerTask(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && taskToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Delete Task?
              </h2>

              <div className="mb-6">
                <p className="text-slate-700 mb-3">
                  Are you sure you want to delete this task?
                </p>
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className={`inline-block px-3 py-1 rounded ${taskToDelete.color} text-white text-sm font-medium mb-2`}>
                    {taskToDelete.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {formatDateRange(taskToDelete.startWeek, taskToDelete.duration)}
                  </div>
                </div>
                {tasks.some(t => t.blockedBy.includes(taskToDelete.id)) && (
                  <div className="mt-3 flex items-start gap-2 text-amber-600 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Warning: Other tasks depend on this task. Those dependencies will be removed.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Node from Diagram Confirmation Modal */}
        {showDeleteNodeConfirm && nodeToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                Remove from Diagram?
              </h2>

              <div className="mb-6">
                <p className="text-slate-700 mb-3">
                  Remove this task from the dependency diagram? The task will remain in the timeline.
                </p>
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className={`inline-block px-3 py-1 rounded ${nodeToDelete.color} text-white text-sm font-medium mb-2`}>
                    {nodeToDelete.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {formatDateRange(nodeToDelete.startWeek, nodeToDelete.duration)}
                  </div>
                </div>
                <div className="mt-3 text-sm text-slate-600">
                  <strong>Note:</strong> You can add it back by clicking "Auto-Arrange" or by adding a dependency to/from this task.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteNodeFromDiagram}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteNodeFromDiagram}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition"
                >
                  Remove from Diagram
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Arrow Context Menu */}
        {arrowContextMenu && (() => {
          const fromTask = tasks.find(t => t.id === arrowContextMenu.fromTaskId);
          const toTask = tasks.find(t => t.id === arrowContextMenu.toTaskId);

          return (
            <div
              className="arrow-context-menu fixed bg-white rounded-lg shadow-2xl border-2 border-slate-400 py-2 z-[100]"
              style={{
                left: `${arrowContextMenu.x}px`,
                top: `${arrowContextMenu.y}px`
              }}
            >
              <div className="px-4 py-2 text-xs text-slate-600 border-b border-slate-200">
                <div className="font-semibold mb-1">Remove Dependency?</div>
                <div><strong>From:</strong> {fromTask?.name}</div>
                <div><strong>To:</strong> {toTask?.name}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDependency(arrowContextMenu.fromTaskId, arrowContextMenu.toTaskId);
                }}
                className="w-full px-4 py-2 text-left text-sm text-white bg-red-600 hover:bg-red-700 transition flex items-center gap-2 font-medium"
              >
                <X className="w-4 h-4" />
                Delete Dependency
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setArrowContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
