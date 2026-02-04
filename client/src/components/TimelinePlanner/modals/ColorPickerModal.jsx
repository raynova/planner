import React from 'react';
import { COLORS } from '../../../constants/timeline';

/**
 * Modal for changing task color
 */
export default function ColorPickerModal({
  task,
  onChangeColor,
  onClose,
}) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Change Color: {task.name}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Select a color
            </label>
            <div className="grid grid-cols-4 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onChangeColor(task.id, color)}
                  className={`w-full h-12 rounded-lg ${color} hover:scale-110 transition ${
                    task.color === color ? 'ring-4 ring-slate-400' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
