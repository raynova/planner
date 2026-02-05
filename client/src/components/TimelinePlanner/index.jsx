import React, { useState, useEffect, useMemo } from 'react';

// Hooks
import { useTimelineData } from '../../hooks/useTimelineData';
import { useTaskOperations } from '../../hooks/useTaskOperations';
import { useDiagramInteraction } from '../../hooks/useDiagramInteraction';
import { useTimelineBar } from '../../hooks/useTimelineBar';

// Components
import TimelineHeader from './TimelineHeader';
import TimelineGrid from './TimelineGrid';
import DependencyDiagram from './DependencyDiagram';
import TimelineNotes from './TimelineNotes';
import {
  AddTaskModal,
  ColorPickerModal,
  DeleteConfirmModal,
  NotesEditorModal,
  DeleteNodeConfirmModal,
} from './modals';

// Utils
import { formatDateRange as formatDateRangeUtil, getTotalWeeks } from '../../utils/dateUtils';

/**
 * Main TimelinePlanner orchestrator component
 * Composes hooks and child components for the timeline planner functionality
 */
export default function TimelinePlanner({ timelineId, initialData, onSave, onSocketSync }) {
  // View state
  const [viewMode, setViewMode] = useState('weekly');
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [hasInitialFit, setHasInitialFit] = useState(false);

  // Filter state
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterColors, setFilterColors] = useState([]);

  // Core data hook
  const {
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
    tasksRef,
    nodePositionsRef,
    saveData,
  } = useTimelineData({ initialData, onSave, onSocketSync });

  // Calculate total weeks
  const totalWeeks = useMemo(() => getTotalWeeks(viewMode, tasks), [viewMode, tasks]);

  // Task operations hook
  const taskOps = useTaskOperations({
    tasks,
    setTasks,
    nodePositions,
    setNodePositions,
    startDate,
    timelineName,
    saveData,
  });

  // Diagram interaction hook
  const diagramInteraction = useDiagramInteraction({
    tasks,
    nodePositions,
    setNodePositions,
    saveData,
    toggleDependency: taskOps.toggleDependency,
    hasCircularDependency: taskOps.hasCircularDependency,
    setLastClickedNodeId: taskOps.setLastClickedNodeId,
    tasksRef,
    nodePositionsRef,
    startDate,
    timelineName,
  });

  // Timeline bar hook
  const timelineBar = useTimelineBar({
    setTasks,
    saveData,
    tasksRef,
    nodePositionsRef,
    startDate,
    timelineName,
    totalWeeks,
  });

  // Initialize node positions for new tasks
  useEffect(() => {
    taskOps.initializeNodePositions();
  }, [tasks]);

  // Auto-fit diagram view on initial load
  useEffect(() => {
    if (!hasInitialFit && Object.keys(nodePositions).length > 0) {
      const timer = setTimeout(() => {
        diagramInteraction.fitToView();
        setHasInitialFit(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodePositions, hasInitialFit, diagramInteraction.fitToView]);

  // Filtered tasks based on status and color filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterStatus === 'done' && !task.done) return false;
      if (filterStatus === 'pending' && task.done) return false;
      if (filterColors.length > 0 && !filterColors.includes(task.color)) return false;
      return true;
    });
  }, [tasks, filterStatus, filterColors]);

  // Format date range helper with startDate bound
  const formatDateRange = (weekNum, duration) => {
    return formatDateRangeUtil(startDate, weekNum, duration);
  };

  // Update start date (recalculates task weeks)
  const updateStartDate = (newDate) => {
    const oldFirstMonday = (() => {
      const date = new Date(startDate);
      const dayOfWeek = date.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      date.setDate(date.getDate() + daysToMonday);
      return date;
    })();

    const newFirstMonday = (() => {
      const date = new Date(newDate);
      const dayOfWeek = date.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      date.setDate(date.getDate() + daysToMonday);
      return date;
    })();

    const weekDiff = Math.round((oldFirstMonday - newFirstMonday) / (7 * 24 * 60 * 60 * 1000));

    const updatedTasks = tasks.map(task => ({
      ...task,
      startWeek: task.startWeek + weekDiff
    }));

    setStartDate(newDate);
    setTasks(updatedTasks);
    saveData(updatedTasks, newDate, timelineName, nodePositions);
  };

  // Handle add task
  const handleAddTask = () => {
    taskOps.addTask();
    setShowAddTask(false);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterColors([]);
  };

  // Save timeline name
  const handleSaveName = () => {
    saveData(tasks, startDate, timelineName, nodePositions);
  };

  // Save timeline notes
  const handleSaveNotes = (newNotes) => {
    saveData(tasks, startDate, timelineName, nodePositions, newNotes);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <TimelineHeader
          timelineName={timelineName}
          setTimelineName={setTimelineName}
          isEditingName={isEditingName}
          setIsEditingName={setIsEditingName}
          saveStatus={saveStatus}
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterColors={filterColors}
          setFilterColors={setFilterColors}
          onSaveName={handleSaveName}
          onShowAddTask={() => setShowAddTask(true)}
          onClearFilters={handleClearFilters}
        />

        {/* Timeline Grid */}
        <TimelineGrid
          tasks={tasks}
          filteredTasks={filteredTasks}
          startDate={startDate}
          viewMode={viewMode}
          totalWeeks={totalWeeks}
          getBlockingTasks={taskOps.getBlockingTasks}
          toggleTaskDone={taskOps.toggleTaskDone}
          openColorPicker={taskOps.openColorPicker}
          deleteTask={taskOps.deleteTask}
          startEditingTask={taskOps.startEditingTask}
          startEditingNotes={taskOps.startEditingNotes}
          editingTaskId={taskOps.editingTaskId}
          editingTaskName={taskOps.editingTaskName}
          setEditingTaskName={taskOps.setEditingTaskName}
          editInputRef={taskOps.editInputRef}
          canBlurSaveRef={taskOps.canBlurSaveRef}
          saveTaskName={taskOps.saveTaskName}
          cancelEditingTask={taskOps.cancelEditingTask}
          draggedTask={timelineBar.draggedTask}
          draggedOverTask={timelineBar.draggedOverTask}
          isDraggingTimeline={timelineBar.isDraggingTimeline}
          isResizing={timelineBar.isResizing}
          timelineRefs={timelineBar.timelineRefs}
          handleDragStart={timelineBar.handleDragStart}
          handleDragOver={timelineBar.handleDragOver}
          handleDrop={timelineBar.handleDrop}
          handleDragEnd={timelineBar.handleDragEnd}
          handleTimelineDragStart={timelineBar.handleTimelineDragStart}
          handleResizeStart={timelineBar.handleResizeStart}
          onClearFilters={handleClearFilters}
          formatDateRange={formatDateRange}
          updateStartDate={updateStartDate}
        />

        {/* Dependency Diagram */}
        <DependencyDiagram
          tasks={tasks}
          nodePositions={nodePositions}
          diagramPan={diagramInteraction.diagramPan}
          diagramZoom={diagramInteraction.diagramZoom}
          setDiagramZoom={diagramInteraction.setDiagramZoom}
          isPanningDiagram={diagramInteraction.isPanningDiagram}
          draggedNode={diagramInteraction.draggedNode}
          selectedNodeId={diagramInteraction.selectedNodeId}
          selectedNodeIds={diagramInteraction.selectedNodeIds}
          isBoxSelecting={diagramInteraction.isBoxSelecting}
          boxStart={diagramInteraction.boxStart}
          boxEnd={diagramInteraction.boxEnd}
          connectingFrom={diagramInteraction.connectingFrom}
          cursorPosition={diagramInteraction.cursorPosition}
          hoveredNodeForConnection={diagramInteraction.hoveredNodeForConnection}
          setHoveredNodeForConnection={diagramInteraction.setHoveredNodeForConnection}
          arrowContextMenu={diagramInteraction.arrowContextMenu}
          setArrowContextMenu={diagramInteraction.setArrowContextMenu}
          canvasContextMenu={diagramInteraction.canvasContextMenu}
          setCanvasContextMenu={diagramInteraction.setCanvasContextMenu}
          hoveredArrow={diagramInteraction.hoveredArrow}
          setHoveredArrow={diagramInteraction.setHoveredArrow}
          handleNodeMouseDown={diagramInteraction.handleNodeMouseDown}
          handleDiagramMouseDown={diagramInteraction.handleDiagramMouseDown}
          handleDiagramMouseMove={diagramInteraction.handleDiagramMouseMove}
          handleDiagramMouseUp={diagramInteraction.handleDiagramMouseUp}
          handleDiagramContextMenu={diagramInteraction.handleDiagramContextMenu}
          handleDiagramWheel={diagramInteraction.handleDiagramWheel}
          handleDeleteNodeFromDiagram={diagramInteraction.handleDeleteNodeFromDiagram}
          handleDeleteDependency={diagramInteraction.handleDeleteDependency}
          startConnection={diagramInteraction.startConnection}
          autoArrangeNodes={diagramInteraction.autoArrangeNodes}
          zoomIn={diagramInteraction.zoomIn}
          zoomOut={diagramInteraction.zoomOut}
          resetView={diagramInteraction.resetView}
          fitToView={diagramInteraction.fitToView}
          setNewTaskPosition={taskOps.setNewTaskPosition}
          setShowAddTask={setShowAddTask}
        />

        {/* Timeline Notes */}
        <TimelineNotes
          notes={notes}
          setNotes={setNotes}
          onSave={handleSaveNotes}
        />

        {/* Modals */}
        {showAddTask && (
          <AddTaskModal
            newTask={taskOps.newTask}
            setNewTask={taskOps.setNewTask}
            onAddTask={handleAddTask}
            onClose={() => {
              setShowAddTask(false);
              taskOps.setNewTaskPosition(null);
            }}
          />
        )}

        {taskOps.showColorPicker && taskOps.colorPickerTask && (
          <ColorPickerModal
            task={taskOps.colorPickerTask}
            onChangeColor={taskOps.changeTaskColor}
            onClose={taskOps.closeColorPicker}
          />
        )}

        {taskOps.editingNotesTask && (
          <NotesEditorModal
            task={taskOps.editingNotesTask}
            notesValue={taskOps.editingNotesValue}
            setNotesValue={taskOps.setEditingNotesValue}
            onSave={taskOps.saveTaskNotes}
            onCancel={taskOps.cancelEditingNotes}
          />
        )}

        {taskOps.showDeleteConfirm && taskOps.taskToDelete && (
          <DeleteConfirmModal
            task={taskOps.taskToDelete}
            tasks={tasks}
            formatDateRange={formatDateRange}
            onConfirm={taskOps.confirmDelete}
            onCancel={taskOps.cancelDelete}
          />
        )}

        {diagramInteraction.showDeleteNodeConfirm && diagramInteraction.nodeToDelete && (
          <DeleteNodeConfirmModal
            node={diagramInteraction.nodeToDelete}
            formatDateRange={formatDateRange}
            onConfirm={diagramInteraction.confirmDeleteNodeFromDiagram}
            onCancel={diagramInteraction.cancelDeleteNodeFromDiagram}
          />
        )}
      </div>
    </div>
  );
}
