import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { COLORS } from '../../constants/timeline';

/**
 * Timeline header with name, view mode switcher, and filters
 */
export default function TimelineHeader({
  timelineName,
  setTimelineName,
  isEditingName,
  setIsEditingName,
  saveStatus,
  viewMode,
  setViewMode,
  filterStatus,
  setFilterStatus,
  filterColors,
  setFilterColors,
  onSaveName,
  onShowAddTask,
  onClearFilters,
}) {
  const hasActiveFilters = filterStatus !== 'all' || filterColors.length > 0;
  return (
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
                  onSaveName();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingName(false);
                    onSaveName();
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
        <div className="flex gap-3 items-center">
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

          {/* Filter controls */}
          <div className="flex flex-col ml-3 pl-3 border-l border-slate-300">
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 py-1 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Tasks</option>
                <option value="pending">Pending</option>
                <option value="done">Completed</option>
              </select>

              {/* Color filter */}
              <div className="flex items-center gap-1">
                {COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      setFilterColors(prev =>
                        prev.includes(color)
                          ? prev.filter(c => c !== color)
                          : [...prev, color]
                      );
                    }}
                    className={`w-4 h-4 rounded-full ${color} ${filterColors.includes(color) ? 'ring-2 ring-slate-600' : 'opacity-40'} ${filterColors.length === 0 ? 'opacity-100' : ''} transition`}
                    title={filterColors.includes(color) ? 'Click to hide this color' : 'Click to show only this color'}
                  />
                ))}
              </div>
            </div>
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="text-xs text-slate-500 hover:text-slate-700 mt-1 text-left"
              >
                Clear filters
              </button>
            )}
          </div>

          <button
            onClick={onShowAddTask}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
