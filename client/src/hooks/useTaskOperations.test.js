import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskOperations } from './useTaskOperations';

describe('useTaskOperations', () => {
  let mockSetTasks;
  let mockSetNodePositions;
  let mockSaveData;
  let tasks;
  let nodePositions;
  const startDate = new Date('2025-01-06');
  const timelineName = 'Test Timeline';

  beforeEach(() => {
    mockSetTasks = vi.fn();
    mockSetNodePositions = vi.fn();
    mockSaveData = vi.fn();
    tasks = [
      { id: '1', name: 'Task 1', startWeek: 1, duration: 2, color: 'bg-blue-500', blockedBy: [], done: false, notes: '' },
      { id: '2', name: 'Task 2', startWeek: 3, duration: 1, color: 'bg-red-500', blockedBy: ['1'], done: false, notes: '' },
    ];
    nodePositions = {
      '1': { x: 0, y: 0 },
      '2': { x: 200, y: 0 },
    };
  });

  const renderTaskOperations = () => {
    return renderHook(() =>
      useTaskOperations({
        tasks,
        setTasks: mockSetTasks,
        nodePositions,
        setNodePositions: mockSetNodePositions,
        startDate,
        timelineName,
        saveData: mockSaveData,
      })
    );
  };

  describe('getTaskById', () => {
    it('returns task by id', () => {
      const { result } = renderTaskOperations();
      expect(result.current.getTaskById('1')).toEqual(tasks[0]);
    });

    it('returns undefined for non-existent id', () => {
      const { result } = renderTaskOperations();
      expect(result.current.getTaskById('999')).toBeUndefined();
    });
  });

  describe('getBlockingTasks', () => {
    it('returns empty array for task with no blockers', () => {
      const { result } = renderTaskOperations();
      expect(result.current.getBlockingTasks(tasks[0])).toEqual([]);
    });

    it('returns blocking tasks', () => {
      const { result } = renderTaskOperations();
      const blocking = result.current.getBlockingTasks(tasks[1]);
      expect(blocking).toHaveLength(1);
      expect(blocking[0].id).toBe('1');
    });
  });

  describe('hasCircularDependency', () => {
    it('returns true for self-reference', () => {
      const { result } = renderTaskOperations();
      expect(result.current.hasCircularDependency('1', '1')).toBe(true);
    });

    it('returns false for valid dependency', () => {
      // Using tasks without existing circular relationship
      const independentTasks = [
        { id: '1', name: 'Task 1', blockedBy: [] },
        { id: '2', name: 'Task 2', blockedBy: [] },
      ];
      const { result } = renderHook(() =>
        useTaskOperations({
          tasks: independentTasks,
          setTasks: mockSetTasks,
          nodePositions: {},
          setNodePositions: mockSetNodePositions,
          startDate,
          timelineName,
          saveData: mockSaveData,
        })
      );
      // Adding 1 as blocker of 2 should not create a cycle
      expect(result.current.hasCircularDependency('2', '1')).toBe(false);
    });

    it('detects circular dependency', () => {
      // Create a cycle: 1 -> 2 -> 3 -> 1
      const cyclicTasks = [
        { id: '1', blockedBy: ['3'] },
        { id: '2', blockedBy: ['1'] },
        { id: '3', blockedBy: ['2'] },
      ];
      const { result } = renderHook(() =>
        useTaskOperations({
          tasks: cyclicTasks,
          setTasks: mockSetTasks,
          nodePositions: {},
          setNodePositions: mockSetNodePositions,
          startDate,
          timelineName,
          saveData: mockSaveData,
        })
      );
      // Adding 1 as dependency of 3 would create: 3 blocked by 1, but 1 is already blocked by 3
      expect(result.current.hasCircularDependency('3', '1')).toBe(true);
    });
  });

  describe('deleteTask', () => {
    it('shows delete confirmation', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.deleteTask('1');
      });

      expect(result.current.showDeleteConfirm).toBe(true);
      expect(result.current.taskToDelete.id).toBe('1');
    });
  });

  describe('confirmDelete', () => {
    it('deletes task and saves', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.deleteTask('1');
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(mockSetTasks).toHaveBeenCalled();
      expect(mockSaveData).toHaveBeenCalled();
      expect(result.current.showDeleteConfirm).toBe(false);
    });
  });

  describe('cancelDelete', () => {
    it('hides confirmation', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.deleteTask('1');
      });

      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.showDeleteConfirm).toBe(false);
      expect(result.current.taskToDelete).toBeNull();
    });
  });

  describe('toggleTaskDone', () => {
    it('toggles done status and saves', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.toggleTaskDone('1');
      });

      expect(mockSetTasks).toHaveBeenCalled();
      expect(mockSaveData).toHaveBeenCalled();
    });
  });

  describe('task name editing', () => {
    it('starts editing', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.startEditingTask('1', 'Task 1');
      });

      expect(result.current.editingTaskId).toBe('1');
      expect(result.current.editingTaskName).toBe('Task 1');
    });

    it('cancels editing', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.startEditingTask('1', 'Task 1');
      });

      act(() => {
        result.current.cancelEditingTask();
      });

      expect(result.current.editingTaskId).toBeNull();
      expect(result.current.editingTaskName).toBe('');
    });
  });

  describe('notes editing', () => {
    it('starts editing notes', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.startEditingNotes(tasks[0]);
      });

      expect(result.current.editingNotesTask).toEqual(tasks[0]);
      expect(result.current.editingNotesValue).toBe('');
    });

    it('cancels notes editing', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.startEditingNotes(tasks[0]);
      });

      act(() => {
        result.current.cancelEditingNotes();
      });

      expect(result.current.editingNotesTask).toBeNull();
    });
  });

  describe('color picker', () => {
    it('opens color picker', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.openColorPicker(tasks[0]);
      });

      expect(result.current.showColorPicker).toBe(true);
      expect(result.current.colorPickerTask).toEqual(tasks[0]);
    });

    it('closes color picker', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.openColorPicker(tasks[0]);
      });

      act(() => {
        result.current.closeColorPicker();
      });

      expect(result.current.showColorPicker).toBe(false);
      expect(result.current.colorPickerTask).toBeNull();
    });
  });

  describe('changeTaskColor', () => {
    it('changes color and saves', () => {
      const { result } = renderTaskOperations();

      act(() => {
        result.current.changeTaskColor('1', 'bg-green-500');
      });

      expect(mockSetTasks).toHaveBeenCalled();
      expect(mockSaveData).toHaveBeenCalled();
      expect(result.current.showColorPicker).toBe(false);
    });
  });
});
