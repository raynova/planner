import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Modal for confirming task deletion
 */
export default function DeleteConfirmModal({
  task,
  tasks,
  formatDateRange,
  onConfirm,
  onCancel,
}) {
  if (!task) return null;

  const hasDependents = tasks.some(t => t.blockedBy.includes(task.id));

  return (
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
            <div className={`inline-block px-3 py-1 rounded ${task.color} text-white text-sm font-medium mb-2`}>
              {task.name}
            </div>
            <div className="text-sm text-slate-600">
              {formatDateRange(task.startWeek, task.duration)}
            </div>
          </div>
          {hasDependents && (
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
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
