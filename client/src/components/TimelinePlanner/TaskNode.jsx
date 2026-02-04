import React from 'react';
import { X, Plus, Check } from 'lucide-react';

/**
 * Individual task node in the dependency diagram
 */
export default function TaskNode({
  task,
  pos,
  isDragging,
  isSelected,
  isConnectionSource,
  isConnectionTarget,
  isHoveredForConnection,
  connectingFrom,
  tasks,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  onStartConnection,
}) {
  const blockingTasksInDiagram = task.blockedBy
    .map(id => tasks.find(t => t.id === id))
    .filter(Boolean);

  return (
    <div
      data-task-node="true"
      data-task-id={task.id}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`absolute ${task.done ? 'bg-green-500' : task.color} text-white rounded-lg shadow-lg p-3 transition select-none ${
        isConnectionSource ? 'ring-4 ring-blue-400 ring-offset-2' : ''
      } ${
        isConnectionTarget
          ? 'cursor-pointer hover:ring-2 hover:ring-white'
          : 'cursor-move hover:shadow-xl'
      } ${
        isHoveredForConnection ? 'ring-4 ring-green-400 ring-offset-2 scale-105' : ''
      } ${isDragging ? 'opacity-70 cursor-grabbing' : ''} ${task.done && !isConnectionSource && !isHoveredForConnection && !isSelected ? 'ring-2 ring-green-300' : ''} ${
        isSelected && !isConnectionSource && !isHoveredForConnection ? 'ring-4 ring-blue-500 ring-offset-2' : ''
      }`}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '160px',
        minHeight: '60px',
        zIndex: isHoveredForConnection ? 20 : 10
      }}
    >
      {/* Delete button */}
      <button
        className="delete-node-btn absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition border-2 border-black text-xs font-bold leading-none"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        title="Remove from diagram"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Add dependency "+" button */}
      {!connectingFrom && (
        <button
          className="connect-btn absolute bottom-1 right-1 w-6 h-6 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white transition border-2 border-white shadow-md text-sm font-bold leading-none z-[70]"
          onClick={(e) => onStartConnection(task.id, e)}
          title="Connect to another task (creates dependency)"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      <div className="font-semibold text-sm flex items-center gap-1 pr-6">
        {task.done && <Check className="w-4 h-4 text-white" />}
        {task.name}
      </div>
      {task.blockedBy.length > 0 && (
        <div className="text-xs mt-1 opacity-90 group relative">
          <span className="cursor-help">Blocked by: {task.blockedBy.length}</span>
          <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-slate-800 text-white text-sm rounded-lg px-3 py-2 shadow-lg z-[60] min-w-[150px]">
            <div className="flex flex-col gap-1">
              {blockingTasksInDiagram.map(t => <div key={t.id}>{t.name}</div>)}
            </div>
          </div>
        </div>
      )}
      {isHoveredForConnection && (
        <div className="text-xs mt-1 bg-white bg-opacity-30 rounded px-1 font-medium">
          Click to connect
        </div>
      )}
    </div>
  );
}
