import React from 'react';

/**
 * Modal for confirming node removal from diagram (task stays in timeline)
 */
export default function DeleteNodeConfirmModal({
  node,
  formatDateRange,
  onConfirm,
  onCancel,
}) {
  if (!node) return null;

  return (
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
            <div className={`inline-block px-3 py-1 rounded ${node.color} text-white text-sm font-medium mb-2`}>
              {node.name}
            </div>
            <div className="text-sm text-slate-600">
              {formatDateRange(node.startWeek, node.duration)}
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            <strong>Note:</strong> You can add it back by clicking "Auto-Arrange" or by adding a dependency to/from this task.
          </div>
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
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition"
          >
            Remove from Diagram
          </button>
        </div>
      </div>
    </div>
  );
}
