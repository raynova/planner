# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Timeline Planner - A full-stack application for creating and managing project timelines with task dependencies and visual node diagrams.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Socket.io-client, Lucide React (icons)
- **Backend**: Express.js, Node.js, Socket.io
- **Database**: PostgreSQL (JSONB for tasks/positions)
- **Real-time**: Socket.io for multi-user collaboration
- **Deployment**: Render.com (separate frontend/backend services)

## Development Commands

```bash
# Frontend (client/)
npm install
npm run dev          # Starts dev server at http://localhost:5173

# Backend (server/)
npm install
npm run dev          # Starts with nodemon at http://localhost:3001
npm start            # Production mode
```

Both servers need to run simultaneously. The Vite dev server proxies `/api` requests to the backend.

## Architecture

### Frontend (`client/src/`)
- `main.jsx` - React entry with BrowserRouter
- `App.jsx` - Routes: `/` (dashboard), `/timeline/:id` (editor)
- `pages/DashboardPage.jsx` - Lists all timelines
- `pages/TimelinePage.jsx` - Timeline detail/edit view with socket integration
- `services/api.js` - API client with 5 endpoints (CRUD for timelines)
- `services/socket.js` - Socket.io client for real-time sync

#### Components (`client/src/components/`)
- `TimelinePlanner/` - Main timeline component folder
  - `index.jsx` - Orchestrator (~200 lines) composing hooks and components
  - `TimelineHeader.jsx` - Name editing, view mode switcher, filters
  - `TimelineGrid.jsx` - Calendar grid with task bars (weekly/monthly views)
  - `DependencyDiagram.jsx` - SVG canvas with nodes and dependency arrows
  - `TaskNode.jsx` - Individual node in the dependency diagram
  - `modals/` - Modal components (AddTaskModal, ColorPickerModal, DeleteConfirmModal, NotesEditorModal, DeleteNodeConfirmModal)

#### Hooks (`client/src/hooks/`)
- `useSocket.js` - Socket.io lifecycle management
- `useTimelineData.js` - Core data state (tasks, nodePositions, startDate, timelineName, saveStatus) and saveData function with refs for stale closure prevention
- `useTaskOperations.js` - Task CRUD (addTask, deleteTask, toggleDependency, changeTaskColor, toggleTaskDone, task editing)
- `useDiagramInteraction.js` - Diagram pan/zoom, selection, connection mode, arrow key movement
- `useTimelineBar.js` - Timeline bar drag/resize with stale closure prevention

#### Utils (`client/src/utils/`)
- `dateUtils.js` - Pure date functions (getWeekDate, dateToWeek, datesToDuration, formatDateDDMMYYYY, formatDateRange, getMonthForWeek, getMonthColumns, getMonthlyTaskPosition, getMinWeeksNeeded, getBaseWeeks, getTotalWeeks)

#### Constants (`client/src/constants/`)
- `timeline.js` - COLORS array, dimensions (NODE_WIDTH, NODE_HEIGHT, WEEK_WIDTH, etc.)

### Backend (`server/src/`)
- `index.js` - Express + HTTP server setup with Socket.io, CORS, static file serving
- `db/index.js` - PostgreSQL pool and schema initialization
- `db/schema.sql` - Single `timelines` table with JSONB columns
- `routes/timelines.js` - REST API endpoints
- `socket/index.js` - Socket.io server with room management for real-time sync

### API Endpoints
- `GET /api/timelines` - List all
- `POST /api/timelines` - Create
- `GET /api/timelines/:id` - Get one
- `PUT /api/timelines/:id` - Update
- `DELETE /api/timelines/:id` - Delete
- `GET /health` - Health check

### Database Schema
Single `timelines` table: `id` (UUID), `name`, `start_date`, `tasks` (JSONB), `node_positions` (JSONB), timestamps.

## Environment Variables

Server requires these environment variables (see `server/.env.example`):
- `DATABASE_URL` - PostgreSQL connection string
- `CLIENT_URL` - Frontend URL for CORS (default: `http://localhost:5173`)
- `NODE_ENV` - Environment mode (`development` or `production`)

## Deployment (Render.com)

Deployed as separate services via `render.yaml`:

**Database:**
- `planner-db` - PostgreSQL (Oregon region)

**Backend API (`planner-api`):**
- Runtime: Node.js (free plan)
- Root: `server/`
- Build: `npm install`
- Start: `npm start`
- Health check: `/health`

**Frontend (`planner-client`):**
- Runtime: Static site (free plan)
- Root: `client/`
- Build: `npm install && npm run build`
- Publish: `dist/`
- Routes: `/api/*` rewrites to backend, `/*` serves `index.html`

Live URLs:
- API: `https://planner-api.onrender.com`
- Frontend: `https://planner-client.onrender.com`

## Code Patterns

### Real-Time Sync Architecture

Socket.io enables multi-user collaboration on timelines. Each timeline has a room (`timeline:{id}`):

```
Client A ──┐                    ┌── Client B
           │   WebSocket        │
           ▼                    ▼
        ┌─────────────────────────┐
        │  Socket.io Server       │
        │  Room: timeline:{id}    │
        └─────────────────────────┘
```

**Sync flow:**
1. Client makes a change → saves to DB (existing REST API)
2. After save, emits `timeline:sync` with full state
3. Server broadcasts to all OTHER clients in the room
4. Receiving clients update their local state

**Key patterns:**
- `TimelinePage.jsx` uses `useSocket` hook and passes `onSocketSync` to `TimelinePlanner`
- `useTimelineData.js` hook handles saveData and socket sync
- Remote updates are detected via `_remoteUpdate` timestamp marker on `initialData`
- Full state sync (last-write-wins) rather than granular operations

### Stale Closure Prevention in Event Handlers

Custom hooks use refs to avoid stale closures in document-level event handlers. When creating handlers inside a function (e.g., `mouseup` inside `mousedown`), closure variables become stale if React state updates. Always use refs for state that needs to be current when the handler fires:

```javascript
// In useTimelineData.js
const tasksRef = useRef(tasks);
useEffect(() => { tasksRef.current = tasks; }, [tasks]);

// In event handler (useTimelineBar.js, useDiagramInteraction.js):
saveData(tasksRef.current, ...);  // not saveData(tasks, ...)
```

### Interactive Dependency Connection

Dependencies are created via an interactive "+" button on each node (handled in `useDiagramInteraction.js`):
1. Click "+" on source node → enters connection mode (`startConnection`)
2. Document-level `mousemove` tracks cursor for preview arrow
3. Hover target node → arrow snaps, node highlights
4. Click target → calls `handleAddDependency(sourceId, targetId)`
5. Escape or click outside → cancels connection mode

The preview arrow uses SVG with conditional styling (dashed blue → solid green when snapped).

### Hook Composition Pattern

The `TimelinePlanner/index.jsx` orchestrator composes four custom hooks:
1. `useTimelineData` - Core state and persistence
2. `useTaskOperations` - Task CRUD and editing state
3. `useDiagramInteraction` - Diagram interaction state and handlers
4. `useTimelineBar` - Timeline bar drag/resize

Each hook receives dependencies from other hooks as needed (e.g., `useTaskOperations` receives `saveData` from `useTimelineData`).
