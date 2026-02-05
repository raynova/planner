import { useState, useRef, useEffect, useCallback } from 'react';
import { NODE_WIDTH, NODE_HEIGHT, HORIZONTAL_SPACING, VERTICAL_SPACING, DIAGRAM_PADDING } from '../constants/timeline';

/**
 * Hook for diagram interaction: pan, zoom, selection, connection mode
 * @param {Object} params
 * @param {Object[]} params.tasks - Tasks array
 * @param {Object} params.nodePositions - Node positions
 * @param {Function} params.setNodePositions - Node positions setter
 * @param {Function} params.saveData - Save function
 * @param {Function} params.toggleDependency - Toggle dependency function
 * @param {Function} params.hasCircularDependency - Circular dependency checker
 * @param {Function} params.setLastClickedNodeId - Set last clicked node
 * @param {React.RefObject} params.tasksRef - Tasks ref
 * @param {React.RefObject} params.nodePositionsRef - Node positions ref
 * @param {Date} params.startDate - Timeline start date
 * @param {string} params.timelineName - Timeline name
 * @returns {Object} Diagram interaction state and handlers
 */
export function useDiagramInteraction({
  tasks,
  nodePositions,
  setNodePositions,
  saveData,
  toggleDependency,
  hasCircularDependency,
  setLastClickedNodeId,
  tasksRef,
  nodePositionsRef,
  startDate,
  timelineName,
}) {
  // Pan/zoom state
  const [diagramPan, setDiagramPan] = useState({ x: 0, y: 0 });
  const [diagramZoom, setDiagramZoom] = useState(1);
  const [isPanningDiagram, setIsPanningDiagram] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Node dragging
  const [draggedNode, setDraggedNode] = useState(null);

  // Selection state
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set());
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxStart, setBoxStart] = useState({ x: 0, y: 0 });
  const [boxEnd, setBoxEnd] = useState({ x: 0, y: 0 });

  // Connection mode state
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [hoveredNodeForConnection, setHoveredNodeForConnection] = useState(null);

  // Context menus
  const [arrowContextMenu, setArrowContextMenu] = useState(null);
  const [canvasContextMenu, setCanvasContextMenu] = useState(null);
  const [hoveredArrow, setHoveredArrow] = useState(null);

  // Delete node confirmation
  const [showDeleteNodeConfirm, setShowDeleteNodeConfirm] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState(null);

  // Refs for stale closure prevention
  const connectingFromRef = useRef(connectingFrom);
  const selectedNodeIdsRef = useRef(selectedNodeIds);
  const didPanRef = useRef(false);

  useEffect(() => { connectingFromRef.current = connectingFrom; }, [connectingFrom]);
  useEffect(() => { selectedNodeIdsRef.current = selectedNodeIds; }, [selectedNodeIds]);

  // Arrow key handler for moving selected node and its dependencies
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedNodeId || !nodePositions[selectedNodeId]) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const moveAmount = e.shiftKey ? 50 : 10;
      let dx = 0, dy = 0;

      switch (e.key) {
        case 'ArrowUp': dy = -moveAmount; break;
        case 'ArrowDown': dy = moveAmount; break;
        case 'ArrowLeft': dx = -moveAmount; break;
        case 'ArrowRight': dx = moveAmount; break;
        default: return;
      }

      e.preventDefault();

      const selectedTask = tasks.find(t => t.id === selectedNodeId);
      if (!selectedTask) return;

      const connectedIds = new Set([selectedNodeId]);
      selectedTask.blockedBy.forEach(id => connectedIds.add(id));
      tasks.forEach(t => {
        if (t.blockedBy.includes(selectedNodeId)) {
          connectedIds.add(t.id);
        }
      });

      setNodePositions(prev => {
        const newPositions = { ...prev };
        connectedIds.forEach(id => {
          if (newPositions[id]) {
            newPositions[id] = {
              x: newPositions[id].x + dx,
              y: newPositions[id].y + dy
            };
          }
        });
        return newPositions;
      });
    };

    const handleKeyUp = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedNodeId) {
        saveData(tasksRef.current, startDate, timelineName, nodePositionsRef.current);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedNodeId, tasks, nodePositions, startDate, timelineName, saveData, tasksRef, nodePositionsRef, setNodePositions]);

  // Close context menus on click
  useEffect(() => {
    const handleClick = (e) => {
      if (arrowContextMenu && !e.target.closest('.arrow-context-menu')) {
        setArrowContextMenu(null);
      }
      if (canvasContextMenu && !e.target.closest('.canvas-context-menu')) {
        setCanvasContextMenu(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [arrowContextMenu, canvasContextMenu]);

  // Prevent browser zoom in diagram area
  useEffect(() => {
    const diagramElement = document.getElementById('dependency-diagram');
    if (!diagramElement) return;

    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    diagramElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => diagramElement.removeEventListener('wheel', handleWheel);
  }, []);

  // Prevent browser zoom globally when hovering over diagram
  useEffect(() => {
    const handleGlobalWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        const diagramElement = document.getElementById('dependency-diagram');
        if (diagramElement && diagramElement.contains(e.target)) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleGlobalWheel);
  }, []);

  // Node mouse down handler
  const handleNodeMouseDown = useCallback((e, taskId) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedNode(taskId);
    setSelectedNodeId(taskId);

    const diagramArea = document.getElementById('dependency-diagram');
    if (!diagramArea) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = nodePositions[taskId] || { x: 100, y: 100 };

    const isPartOfSelection = selectedNodeIdsRef.current.has(taskId);
    const nodesToMove = isPartOfSelection ? selectedNodeIdsRef.current : new Set([taskId]);

    const startPositions = {};
    nodesToMove.forEach(id => {
      startPositions[id] = nodePositions[id] || { x: 100, y: 100 };
    });

    const handleMouseMove = (moveEvent) => {
      const deltaX = (moveEvent.clientX - startX) / diagramZoom;
      const deltaY = (moveEvent.clientY - startY) / diagramZoom;

      setNodePositions(prev => {
        const newPositions = { ...prev };
        nodesToMove.forEach(id => {
          const startP = startPositions[id];
          if (startP) {
            newPositions[id] = {
              x: startP.x + deltaX,
              y: startP.y + deltaY
            };
          }
        });
        return newPositions;
      });
    };

    const handleMouseUp = () => {
      setDraggedNode(null);
      saveData(tasksRef.current, startDate, timelineName, nodePositionsRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [nodePositions, diagramZoom, startDate, timelineName, saveData, tasksRef, nodePositionsRef, setNodePositions]);

  // Add dependency handler
  const handleAddDependency = useCallback((fromTaskId, toTaskId) => {
    if (fromTaskId === toTaskId) return;
    if (hasCircularDependency(toTaskId, fromTaskId)) {
      alert('Cannot add dependency: would create a circular dependency');
      return;
    }
    setLastClickedNodeId(fromTaskId);
    toggleDependency(toTaskId, fromTaskId);
  }, [hasCircularDependency, toggleDependency, setLastClickedNodeId]);

  // Auto-arrange nodes
  const autoArrangeNodes = useCallback(() => {
    const levels = [];
    const visited = new Set();
    const taskLevels = {};

    const getRootTasks = () => tasks.filter(task => task.blockedBy.length === 0);

    const calculateDepth = (taskId, depth = 0) => {
      if (visited.has(taskId)) return;
      visited.add(taskId);

      if (!taskLevels[taskId] || taskLevels[taskId] < depth) {
        taskLevels[taskId] = depth;
      }

      const dependents = tasks.filter(t => t.blockedBy.includes(taskId));
      dependents.forEach(dep => calculateDepth(dep.id, depth + 1));
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
      const totalWidth = tasksInLevel * NODE_WIDTH + (tasksInLevel - 1) * HORIZONTAL_SPACING;
      const startX = Math.max(DIAGRAM_PADDING, (diagramWidth - totalWidth) / 2);

      levelTasks.forEach((taskId, index) => {
        newPositions[taskId] = {
          x: startX + index * (NODE_WIDTH + HORIZONTAL_SPACING),
          y: DIAGRAM_PADDING + levelIndex * (NODE_HEIGHT + VERTICAL_SPACING)
        };
      });
    });

    setNodePositions(newPositions);
    saveData(tasks, startDate, timelineName, newPositions);
  }, [tasks, startDate, timelineName, saveData, setNodePositions]);

  // Delete node from diagram
  const handleDeleteNodeFromDiagram = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setNodeToDelete(task);
    setShowDeleteNodeConfirm(true);
  }, [tasks]);

  const confirmDeleteNodeFromDiagram = useCallback(() => {
    if (!nodeToDelete) return;

    const newPositions = { ...nodePositions };
    delete newPositions[nodeToDelete.id];
    setNodePositions(newPositions);
    saveData(tasks, startDate, timelineName, newPositions);

    setShowDeleteNodeConfirm(false);
    setNodeToDelete(null);
  }, [nodeToDelete, nodePositions, tasks, startDate, timelineName, saveData, setNodePositions]);

  const cancelDeleteNodeFromDiagram = useCallback(() => {
    setShowDeleteNodeConfirm(false);
    setNodeToDelete(null);
  }, []);

  // Delete dependency
  const handleDeleteDependency = useCallback((fromTaskId, toTaskId) => {
    const updatedTasks = tasks.map(task => {
      if (task.id === toTaskId) {
        const newBlockedBy = task.blockedBy.filter(id => id !== fromTaskId);
        return { ...task, blockedBy: newBlockedBy };
      }
      return task;
    });
    // Note: This needs to be handled at the component level with setTasks
    // For now, we use toggleDependency which already handles this
    toggleDependency(toTaskId, fromTaskId);
    setArrowContextMenu(null);
  }, [tasks, toggleDependency]);

  // Start connection mode
  const startConnection = useCallback((taskId, e) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom(taskId);

    const diagramArea = document.getElementById('dependency-diagram');
    if (!diagramArea) return;

    const handleMouseMove = (moveEvent) => {
      const rect = diagramArea.getBoundingClientRect();
      const x = (moveEvent.clientX - rect.left - diagramPan.x) / diagramZoom;
      const y = (moveEvent.clientY - rect.top - diagramPan.y) / diagramZoom;
      setCursorPosition({ x, y });
    };

    const handleClick = (clickEvent) => {
      const nodeElement = clickEvent.target.closest('[data-task-node]');
      if (nodeElement) {
        const targetTaskId = nodeElement.dataset.taskId;
        if (targetTaskId && targetTaskId !== connectingFromRef.current) {
          handleAddDependency(connectingFromRef.current, targetTaskId);
        }
      }
      cancelConnection();
    };

    const handleKeyDown = (keyEvent) => {
      if (keyEvent.key === 'Escape') {
        cancelConnection();
      }
    };

    const cancelConnection = () => {
      setConnectingFrom(null);
      setHoveredNodeForConnection(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown);
  }, [diagramPan, diagramZoom, handleAddDependency]);

  // Diagram mouse handlers
  const handleDiagramMouseDown = useCallback((e) => {
    // Middle mouse button - panning
    if (e.button === 1) {
      e.preventDefault();
      didPanRef.current = false;
      setIsPanningDiagram(true);
      setPanStart({ x: e.clientX - diagramPan.x, y: e.clientY - diagramPan.y });
    }
    // Right mouse button - panning
    else if (e.button === 2 && !e.target.closest('[data-task-node]')) {
      e.preventDefault();
      didPanRef.current = false;
      setIsPanningDiagram(true);
      setPanStart({ x: e.clientX - diagramPan.x, y: e.clientY - diagramPan.y });
    }
    // Left click on empty canvas - start box selection
    else if (e.button === 0 && !e.target.closest('[data-task-node]')) {
      e.preventDefault();
      const diagramArea = document.getElementById('dependency-diagram');
      if (!diagramArea) return;

      const rect = diagramArea.getBoundingClientRect();
      const x = (e.clientX - rect.left - diagramPan.x) / diagramZoom;
      const y = (e.clientY - rect.top - diagramPan.y) / diagramZoom;
      setIsBoxSelecting(true);
      setBoxStart({ x, y });
      setBoxEnd({ x, y });
      setSelectedNodeIds(new Set());
      setSelectedNodeId(null);
    }
  }, [diagramPan, diagramZoom]);

  const handleDiagramMouseMove = useCallback((e) => {
    if (isPanningDiagram) {
      didPanRef.current = true;
      setDiagramPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }

    if (isBoxSelecting) {
      const diagramArea = document.getElementById('dependency-diagram');
      if (!diagramArea) return;

      const rect = diagramArea.getBoundingClientRect();
      const x = (e.clientX - rect.left - diagramPan.x) / diagramZoom;
      const y = (e.clientY - rect.top - diagramPan.y) / diagramZoom;
      setBoxEnd({ x, y });

      const minX = Math.min(boxStart.x, x);
      const maxX = Math.max(boxStart.x, x);
      const minY = Math.min(boxStart.y, y);
      const maxY = Math.max(boxStart.y, y);

      const selected = new Set();
      Object.entries(nodePositions).forEach(([id, pos]) => {
        const nodeRight = pos.x + NODE_WIDTH;
        const nodeBottom = pos.y + NODE_HEIGHT;
        if (pos.x < maxX && nodeRight > minX && pos.y < maxY && nodeBottom > minY) {
          selected.add(id);
        }
      });
      setSelectedNodeIds(selected);
    }
  }, [isPanningDiagram, panStart, isBoxSelecting, boxStart, diagramPan, diagramZoom, nodePositions]);

  const handleDiagramMouseUp = useCallback(() => {
    setIsPanningDiagram(false);
    if (isBoxSelecting) {
      setIsBoxSelecting(false);
    }
  }, [isBoxSelecting]);

  const handleDiagramContextMenu = useCallback((e) => {
    // Suppress context menu if we were panning
    if (didPanRef.current) {
      e.preventDefault();
      didPanRef.current = false;
      return;
    }

    if (!e.target.closest('[data-task-node]')) {
      e.preventDefault();
      const diagramArea = document.getElementById('dependency-diagram');
      if (!diagramArea) return;

      const rect = diagramArea.getBoundingClientRect();
      const diagramX = (e.clientX - rect.left - diagramPan.x) / diagramZoom;
      const diagramY = (e.clientY - rect.top - diagramPan.y) / diagramZoom;
      setCanvasContextMenu({
        x: e.clientX,
        y: e.clientY,
        diagramX,
        diagramY
      });
    }
  }, [diagramPan, diagramZoom]);

  const handleDiagramWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setDiagramZoom(prev => Math.max(0.25, Math.min(3, prev + delta)));
    }
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setDiagramZoom(prev => Math.min(3, prev + 0.1));
  }, []);

  const zoomOut = useCallback(() => {
    setDiagramZoom(prev => Math.max(0.25, prev - 0.1));
  }, []);

  const resetView = useCallback(() => {
    setDiagramPan({ x: 0, y: 0 });
    setDiagramZoom(1);
  }, []);

  // Fit all nodes into view with appropriate zoom and centering
  const fitToView = useCallback(() => {
    const diagramElement = document.getElementById('dependency-diagram');
    if (!diagramElement) return;

    const positions = Object.values(nodePositions);
    if (positions.length === 0) {
      setDiagramPan({ x: 0, y: 0 });
      setDiagramZoom(1);
      return;
    }

    // Calculate bounding box of all nodes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + NODE_WIDTH);
      maxY = Math.max(maxY, pos.y + NODE_HEIGHT);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const containerWidth = diagramElement.clientWidth;
    const containerHeight = diagramElement.clientHeight;

    const padding = 50;
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    // Calculate zoom to fit (clamped to 0.25-1.0 range, never zoom in beyond 100%)
    const zoomX = availableWidth / contentWidth;
    const zoomY = availableHeight / contentHeight;
    const zoom = Math.max(0.25, Math.min(1.0, Math.min(zoomX, zoomY)));

    // Calculate pan to center content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const panX = containerWidth / 2 - centerX * zoom;
    const panY = containerHeight / 2 - centerY * zoom;

    setDiagramZoom(zoom);
    setDiagramPan({ x: panX, y: panY });
  }, [nodePositions]);

  return {
    // Pan/zoom
    diagramPan,
    setDiagramPan,
    diagramZoom,
    setDiagramZoom,
    isPanningDiagram,

    // Node dragging
    draggedNode,

    // Selection
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeIds,
    setSelectedNodeIds,
    isBoxSelecting,
    boxStart,
    boxEnd,

    // Connection mode
    connectingFrom,
    cursorPosition,
    hoveredNodeForConnection,
    setHoveredNodeForConnection,
    connectingFromRef,

    // Context menus
    arrowContextMenu,
    setArrowContextMenu,
    canvasContextMenu,
    setCanvasContextMenu,
    hoveredArrow,
    setHoveredArrow,

    // Delete node
    showDeleteNodeConfirm,
    nodeToDelete,

    // Handlers
    handleNodeMouseDown,
    handleAddDependency,
    autoArrangeNodes,
    handleDeleteNodeFromDiagram,
    confirmDeleteNodeFromDiagram,
    cancelDeleteNodeFromDiagram,
    handleDeleteDependency,
    startConnection,
    handleDiagramMouseDown,
    handleDiagramMouseMove,
    handleDiagramMouseUp,
    handleDiagramContextMenu,
    handleDiagramWheel,
    zoomIn,
    zoomOut,
    resetView,
    fitToView,
  };
}
