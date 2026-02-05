import React from 'react';
import { Plus, X } from 'lucide-react';
import TaskNode from './TaskNode';
import { NODE_WIDTH, NODE_HEIGHT } from '../../constants/timeline';

/**
 * Dependency diagram with SVG canvas, nodes, and arrows
 */
export default function DependencyDiagram({
  tasks,
  nodePositions,
  // Diagram state
  diagramPan,
  diagramZoom,
  setDiagramZoom,
  isPanningDiagram,
  draggedNode,
  // Selection
  selectedNodeId,
  selectedNodeIds,
  isBoxSelecting,
  boxStart,
  boxEnd,
  // Connection mode
  connectingFrom,
  cursorPosition,
  hoveredNodeForConnection,
  setHoveredNodeForConnection,
  // Context menus
  arrowContextMenu,
  setArrowContextMenu,
  canvasContextMenu,
  setCanvasContextMenu,
  hoveredArrow,
  setHoveredArrow,
  // Handlers
  handleNodeMouseDown,
  handleDiagramMouseDown,
  handleDiagramMouseMove,
  handleDiagramMouseUp,
  handleDiagramContextMenu,
  handleDeleteNodeFromDiagram,
  handleDeleteDependency,
  startConnection,
  autoArrangeNodes,
  zoomIn,
  zoomOut,
  resetView,
  fitToView,
  // New task position
  setNewTaskPosition,
  setShowAddTask,
}) {
  // Calculate SVG size based on maximum node positions
  const calculateSvgSize = () => {
    const padding = 200;
    let maxX = 800;
    let maxY = 500;
    Object.values(nodePositions).forEach(pos => {
      if (pos.x + NODE_WIDTH + padding > maxX) maxX = pos.x + NODE_WIDTH + padding;
      if (pos.y + NODE_HEIGHT + padding > maxY) maxY = pos.y + NODE_HEIGHT + padding;
    });
    return { maxX, maxY };
  };

  // Get edge point for arrow
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

  const { maxX, maxY } = calculateSvgSize();

  return (
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
            onClick={resetView}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition"
          >
            Reset View
          </button>
          <button
            onClick={fitToView}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition"
          >
            Fit to View
          </button>
          <button
            onClick={autoArrangeNodes}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Auto-Arrange
          </button>
        </div>
      </div>

      {/* Connection mode indicator */}
      {connectingFrom && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-blue-700">
            <strong>Creating dependency from:</strong> {tasks.find(t => t.id === connectingFrom)?.name}
            <span className="text-blue-500 ml-2">Click another task to connect, or press Escape to cancel</span>
          </span>
        </div>
      )}

      {/* Diagram area */}
      <div
        id="dependency-diagram"
        className="relative border-2 border-slate-200 rounded-lg bg-slate-50 overflow-hidden"
        style={{ height: '500px', position: 'relative', cursor: isBoxSelecting ? 'crosshair' : (isPanningDiagram ? 'grabbing' : 'default') }}
        onMouseDown={handleDiagramMouseDown}
        onMouseMove={handleDiagramMouseMove}
        onMouseUp={handleDiagramMouseUp}
        onMouseLeave={handleDiagramMouseUp}
        onContextMenu={handleDiagramContextMenu}
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
          {/* Box selection rectangle */}
          {isBoxSelecting && (
            <div
              className="absolute bg-blue-500 bg-opacity-20 border-2 border-blue-500 border-dashed pointer-events-none"
              style={{
                left: `${Math.min(boxStart.x, boxEnd.x)}px`,
                top: `${Math.min(boxStart.y, boxEnd.y)}px`,
                width: `${Math.abs(boxEnd.x - boxStart.x)}px`,
                height: `${Math.abs(boxEnd.y - boxStart.y)}px`,
                zIndex: 50
              }}
            />
          )}

          {/* Task nodes */}
          {tasks.map(task => {
            const pos = nodePositions[task.id];
            if (!pos) return null;

            const isDragging = draggedNode === task.id;
            const isConnectionTarget = connectingFrom && connectingFrom !== task.id;
            const isHoveredForConnectionNode = hoveredNodeForConnection === task.id;
            const isConnectionSource = connectingFrom === task.id;
            const isSelected = selectedNodeId === task.id || selectedNodeIds.has(task.id);

            return (
              <TaskNode
                key={task.id}
                task={task}
                pos={pos}
                isDragging={isDragging}
                isSelected={isSelected}
                isConnectionSource={isConnectionSource}
                isConnectionTarget={isConnectionTarget}
                isHoveredForConnection={isHoveredForConnectionNode}
                connectingFrom={connectingFrom}
                tasks={tasks}
                onMouseDown={(e) => {
                  if (e.target.closest('.delete-node-btn') || e.target.closest('.connect-btn')) return;
                  if (!connectingFrom) {
                    handleNodeMouseDown(e, task.id);
                  }
                }}
                onMouseEnter={() => {
                  if (connectingFrom && connectingFrom !== task.id) {
                    setHoveredNodeForConnection(task.id);
                  }
                }}
                onMouseLeave={() => {
                  if (hoveredNodeForConnection === task.id) {
                    setHoveredNodeForConnection(null);
                  }
                }}
                onDelete={handleDeleteNodeFromDiagram}
                onStartConnection={startConnection}
              />
            );
          })}

          {/* Draw arrows for dependencies */}
          <svg
            className="absolute inset-0"
            style={{ width: `${maxX}px`, height: `${maxY}px`, zIndex: 5, pointerEvents: 'none', overflow: 'visible' }}
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
              <marker
                id="arrowhead-snapped"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#22c55e" />
              </marker>
            </defs>

            {/* Dependency arrows */}
            {tasks.map(task => {
              const toPos = nodePositions[task.id];
              if (!toPos) return null;

              return task.blockedBy.map(fromTaskId => {
                const fromPos = nodePositions[fromTaskId];
                if (!fromPos) return null;

                const fromTask = tasks.find(t => t.id === fromTaskId);
                if (!fromTask) return null;

                const isHovered = hoveredArrow && hoveredArrow.fromTaskId === fromTaskId && hoveredArrow.toTaskId === task.id;

                const fromCenterX = fromPos.x + NODE_WIDTH / 2;
                const fromCenterY = fromPos.y + NODE_HEIGHT / 2;
                const toCenterX = toPos.x + NODE_WIDTH / 2;
                const toCenterY = toPos.y + NODE_HEIGHT / 2;

                const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
                const fromPoint = getEdgePoint(fromCenterX, fromCenterY, angle, NODE_WIDTH, NODE_HEIGHT);
                const toPoint = getEdgePoint(toCenterX, toCenterY, angle + Math.PI, NODE_WIDTH, NODE_HEIGHT);

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

            {/* Preview arrow during connection mode */}
            {connectingFrom && (() => {
              const fromPos = nodePositions[connectingFrom];
              if (!fromPos) return null;

              const fromCenterX = fromPos.x + NODE_WIDTH / 2;
              const fromCenterY = fromPos.y + NODE_HEIGHT / 2;

              let targetX, targetY;
              let isSnapped = false;

              if (hoveredNodeForConnection) {
                const toPos = nodePositions[hoveredNodeForConnection];
                if (toPos) {
                  targetX = toPos.x + NODE_WIDTH / 2;
                  targetY = toPos.y + NODE_HEIGHT / 2;
                  isSnapped = true;
                }
              }

              if (!isSnapped) {
                targetX = cursorPosition.x;
                targetY = cursorPosition.y;
              }

              const angle = Math.atan2(targetY - fromCenterY, targetX - fromCenterX);
              const fromPoint = getEdgePoint(fromCenterX, fromCenterY, angle, NODE_WIDTH, NODE_HEIGHT);

              let toPoint;
              if (isSnapped) {
                toPoint = getEdgePoint(targetX, targetY, angle + Math.PI, NODE_WIDTH, NODE_HEIGHT);
              } else {
                toPoint = { x: targetX, y: targetY };
              }

              return (
                <line
                  x1={fromPoint.x}
                  y1={fromPoint.y}
                  x2={toPoint.x}
                  y2={toPoint.y}
                  stroke={isSnapped ? "#22c55e" : "#3b82f6"}
                  strokeWidth="3"
                  strokeDasharray={isSnapped ? "none" : "8,4"}
                  markerEnd={isSnapped ? "url(#arrowhead-snapped)" : "url(#arrowhead-highlight)"}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })()}
          </svg>

          {tasks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">
              Add tasks to see the dependency diagram
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-slate-600">
        <strong>How to use:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>To move nodes:</strong> Click and drag any node to reposition it in the diagram</li>
          <li><strong>To move with dependencies:</strong> Click a node to select it, then use arrow keys (hold Shift for larger moves) - connected tasks move together</li>
          <li><strong>To select multiple:</strong> Click and drag on empty space to draw a selection box around multiple nodes</li>
          <li><strong>To create task on canvas:</strong> Right-click on empty space and select "Create task here"</li>
          <li><strong>To pan diagram:</strong> Use middle mouse button or right-click and drag</li>
          <li><strong>To zoom:</strong> Use the +/− buttons or hold Ctrl and scroll mouse wheel</li>
          <li><strong>To remove from diagram:</strong> Click the x button (task stays in timeline, only removed from diagram view)</li>
          <li><strong>To add dependencies:</strong> Click the + button on a task, then click another task to connect them (the second task will be blocked by the first)</li>
          <li><strong>To delete a dependency:</strong> Right-click on any arrow and confirm deletion</li>
          <li><strong>Auto-Arrange:</strong> Organizes nodes in a tree layout based on dependencies</li>
        </ul>
      </div>

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

      {/* Canvas Context Menu for creating tasks */}
      {canvasContextMenu && (
        <div
          className="canvas-context-menu fixed bg-white rounded-lg shadow-xl border py-2 z-[100]"
          style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
        >
          <button
            onClick={() => {
              setNewTaskPosition({ x: canvasContextMenu.diagramX, y: canvasContextMenu.diagramY });
              setShowAddTask(true);
              setCanvasContextMenu(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create task here
          </button>
        </div>
      )}
    </div>
  );
}
