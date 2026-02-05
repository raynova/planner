import React from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { getWeekDate, getMonthForWeek, getMonthColumns, getMonthlyTaskPosition } from '../../utils/dateUtils';

/**
 * Timeline grid with task bars (weekly/monthly views)
 */
export default function TimelineGrid({
  tasks,
  filteredTasks,
  startDate,
  viewMode,
  totalWeeks,
  // Task operations
  getBlockingTasks,
  toggleTaskDone,
  openColorPicker,
  deleteTask,
  startEditingTask,
  startEditingNotes,
  // Editing state
  editingTaskId,
  editingTaskName,
  setEditingTaskName,
  editInputRef,
  canBlurSaveRef,
  saveTaskName,
  cancelEditingTask,
  // Drag state
  draggedTask,
  draggedOverTask,
  isDraggingTimeline,
  isResizing,
  timelineRefs,
  // Drag handlers
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  handleTimelineDragStart,
  handleResizeStart,
  // Filter reset
  onClearFilters,
  // Date formatting
  formatDateRange,
  // Start date update
  updateStartDate,
}) {
  const months = getMonthColumns(startDate, totalWeeks);

  return (
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
        {viewMode === 'weekly' && (
          <>
            {/* Month labels row */}
            <div className="flex">
              <div className="w-64 flex-shrink-0"></div>
              <div className="flex flex-1">
                {(() => {
                  const monthGroups = [];
                  let currentMonthStart = 0;
                  let currentMonth = getMonthForWeek(startDate, 1);

                  for (let i = 0; i < totalWeeks; i++) {
                    const weekNum = i + 1;
                    const weekMonth = getMonthForWeek(startDate, weekNum);

                    if (weekMonth !== currentMonth || i === totalWeeks - 1) {
                      const endIndex = i === totalWeeks - 1 && weekMonth === currentMonth ? i + 1 : i;
                      const weekCount = endIndex - currentMonthStart;
                      const monthDate = getWeekDate(startDate, currentMonthStart + 1);
                      monthGroups.push({
                        month: currentMonth,
                        weekCount,
                        monthDate
                      });

                      if (i < totalWeeks - 1 || weekMonth !== currentMonth) {
                        currentMonthStart = i;
                        currentMonth = weekMonth;

                        if (i === totalWeeks - 1 && weekMonth !== monthGroups[monthGroups.length - 1]?.month) {
                          const lastMonthDate = getWeekDate(startDate, weekNum);
                          monthGroups.push({
                            month: weekMonth,
                            weekCount: 1,
                            monthDate: lastMonthDate
                          });
                        }
                      }
                    }
                  }

                  return monthGroups.map((group, idx) => (
                    <div
                      key={idx}
                      className={`text-center text-sm font-semibold border-l-4 border-blue-600 px-2 py-1 ${
                        group.month % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100'
                      }`}
                      style={{ minWidth: `${group.weekCount * 70}px`, flex: group.weekCount }}
                    >
                      <div className="text-blue-700">
                        {group.monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            {/* Week dates row */}
            <div className="flex mb-4">
              <div className="w-64 flex-shrink-0"></div>
              <div className="flex flex-1">
                {Array.from({ length: totalWeeks }, (_, i) => {
                  const weekNum = i + 1;
                  const weekDate = getWeekDate(startDate, weekNum);
                  const currentMonth = getMonthForWeek(startDate, weekNum);
                  const prevMonth = i > 0 ? getMonthForWeek(startDate, weekNum - 1) : -1;
                  const isMonthStart = currentMonth !== prevMonth;

                  return (
                    <div
                      key={i}
                      className={`flex-1 text-center text-xs font-medium border-l px-1 ${
                        isMonthStart ? 'border-l-4 border-l-blue-600' : 'border-slate-200'
                      } ${currentMonth % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}
                      style={{ minWidth: '70px' }}
                    >
                      <div className="text-slate-600">
                        {String(weekDate.getDate()).padStart(2, '0')}/{String(weekDate.getMonth() + 1).padStart(2, '0')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {viewMode === 'monthly' && (
          <div className="flex mb-4">
            <div className="w-64 flex-shrink-0"></div>
            <div className="flex flex-1">
              {months.map((monthDate, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center text-sm font-semibold border-l-4 border-blue-600 px-2 ${
                    i % 2 === 0 ? 'bg-slate-50' : 'bg-white'
                  }`}
                  style={{ minWidth: '120px' }}
                >
                  <div className="text-blue-700">
                    {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks */}
        {filteredTasks.length === 0 && tasks.length > 0 && (
          <div className="py-8 text-center text-slate-500">
            <p>No tasks match the current filter.</p>
            <button
              onClick={onClearFilters}
              className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
            >
              Clear filters
            </button>
          </div>
        )}
        {filteredTasks.map((task) => {
          const blockingTasks = getBlockingTasks(task);
          const dateRange = formatDateRange(task.startWeek, task.duration);
          const isBeingDragged = draggedTask?.id === task.id && !isDraggingTimeline;
          const isDropTarget = draggedOverTask?.id === task.id;
          const isEditing = editingTaskId === task.id;

          return (
            <div
              key={task.id}
              className={`mb-3 transition-all ${isBeingDragged ? 'opacity-50' : ''} ${isDropTarget ? 'border-t-2 border-blue-500' : ''} ${task.done ? 'bg-green-100 rounded-lg -mx-2 px-2 py-1' : ''}`}
              draggable={!isDraggingTimeline && !isResizing && !isEditing}
              onDragStart={(e) => !isDraggingTimeline && !isResizing && !isEditing && handleDragStart(e, task)}
              onDragOver={(e) => !isDraggingTimeline && !isResizing && handleDragOver(e, task)}
              onDrop={(e) => !isDraggingTimeline && !isResizing && handleDrop(e, task, tasks)}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center">
                {/* Task Info */}
                <div className="w-64 flex-shrink-0 pr-4 cursor-move">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className={`font-semibold flex items-center gap-2 ${task.done ? 'text-green-700' : 'text-slate-800'}`}>
                        <span className="text-slate-400">⋮⋮</span>
                        {editingTaskId === task.id ? (
                          <input
                            ref={editInputRef}
                            type="text"
                            draggable="false"
                            value={editingTaskName}
                            onChange={(e) => setEditingTaskName(e.target.value)}
                            onBlur={() => {
                              if (canBlurSaveRef.current) {
                                saveTaskName(task.id);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                canBlurSaveRef.current = true;
                                e.target.blur();
                              } else if (e.key === 'Escape') {
                                canBlurSaveRef.current = false;
                                cancelEditingTask();
                              }
                            }}
                            onDragStart={(e) => e.preventDefault()}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="px-1 py-0.5 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 bg-white"
                            style={{ width: '120px' }}
                          />
                        ) : (
                          <span
                            draggable="false"
                            onDragStart={(e) => e.preventDefault()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startEditingTask(task.id, task.name);
                            }}
                            className="cursor-text hover:text-blue-600 select-none"
                            title="Double-click to rename"
                          >
                            {task.name}
                          </span>
                        )}
                        {task.done && <Check className="w-4 h-4 text-green-600" />}
                      </div>
                      <div className="text-xs text-slate-500">
                        {dateRange}
                      </div>
                      {task.notes && (
                        <div
                          className="text-xs text-slate-500 mt-1 truncate cursor-pointer hover:text-blue-600"
                          title={task.notes}
                          onClick={() => startEditingNotes(task)}
                        >
                          <span className="mr-1">Notes:</span>
                          {task.notes.substring(0, 30)}{task.notes.length > 30 ? '...' : ''}
                        </div>
                      )}
                      {!task.notes && (
                        <button
                          onClick={() => startEditingNotes(task)}
                          className="text-xs text-slate-400 mt-1 hover:text-blue-600 transition"
                        >
                          + Add notes
                        </button>
                      )}
                      {blockingTasks.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-amber-600 group relative">
                          <AlertCircle className="w-3 h-3" />
                          <span className="cursor-help">Blocked by: {blockingTasks.length}</span>
                          <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-slate-800 text-white text-sm rounded-lg px-3 py-2 shadow-lg z-[60] min-w-[150px]">
                            <div className="flex flex-col gap-1">
                              {blockingTasks.map(t => <div key={t.id}>{t.name}</div>)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 items-center flex-shrink-0">
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
                        onClick={() => openColorPicker(task)}
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
                  className="flex flex-1 relative h-12 overflow-hidden"
                >
                  {viewMode === 'weekly' ? (
                    Array.from({ length: totalWeeks }, (_, i) => {
                      const weekNum = i + 1;
                      const currentMonth = getMonthForWeek(startDate, weekNum);
                      const prevMonth = i > 0 ? getMonthForWeek(startDate, weekNum - 1) : -1;
                      const isMonthStart = currentMonth !== prevMonth;

                      return (
                        <div
                          key={i}
                          className={`flex-1 border-l ${
                            isMonthStart ? 'border-l-4 border-l-blue-600' : 'border-slate-200'
                          } ${task.done ? 'bg-transparent' : (currentMonth % 2 === 0 ? 'bg-slate-50' : 'bg-white')}`}
                          style={{ minWidth: '70px' }}
                        ></div>
                      );
                    })
                  ) : (
                    months.map((monthDate, i) => (
                      <div
                        key={i}
                        className={`flex-1 border-l-4 border-blue-600 ${
                          task.done ? 'bg-transparent' : (i % 2 === 0 ? 'bg-slate-50' : 'bg-white')
                        }`}
                        style={{ minWidth: '120px' }}
                      ></div>
                    ))
                  )}
                  <div
                    className={`absolute top-1 z-10 ${task.color} text-white rounded-lg shadow-md flex items-center justify-center text-sm font-medium hover:shadow-lg transition select-none ${
                      isDraggingTimeline && draggedTask?.id === task.id ? 'shadow-2xl ring-2 ring-white' : ''
                    } ${isResizing && draggedTask?.id === task.id ? 'shadow-2xl ring-2 ring-white' : ''}`}
                    style={viewMode === 'weekly' ? {
                      left: `${((task.startWeek - 1) / totalWeeks) * 100}%`,
                      width: `${(task.duration / totalWeeks) * 100}%`,
                      height: '40px',
                    } : {
                      left: `${getMonthlyTaskPosition(task, startDate, totalWeeks).left}%`,
                      width: `${getMonthlyTaskPosition(task, startDate, totalWeeks).width}%`,
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
  );
}
