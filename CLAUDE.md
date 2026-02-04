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
- `components/TimelinePlanner.jsx` - Main timeline component with task management, dependency visualization, and drag-and-drop
- `pages/DashboardPage.jsx` - Lists all timelines
- `pages/TimelinePage.jsx` - Timeline detail/edit view with socket integration
- `services/api.js` - API client with 5 endpoints (CRUD for timelines)
- `services/socket.js` - Socket.io client for real-time sync
- `hooks/useSocket.js` - React hook for socket lifecycle management

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
- `TimelinePlanner.jsx` calls `onSocketSync(data)` after each `saveData()` call
- Remote updates are detected via `_remoteUpdate` timestamp marker on `initialData`
- Full state sync (last-write-wins) rather than granular operations

### Stale Closure Prevention in Event Handlers

`TimelinePlanner.jsx` uses refs (`tasksRef`, `nodePositionsRef`, `connectingFromRef`) to avoid stale closures in document-level event handlers. When creating handlers inside a function (e.g., `mouseup` inside `mousedown`), closure variables become stale if React state updates. Always use refs for state that needs to be current when the handler fires:

```javascript
const tasksRef = React.useRef(tasks);
React.useEffect(() => { tasksRef.current = tasks; }, [tasks]);

// In mouseup handler:
saveData(tasksRef.current, ...);  // not saveData(tasks, ...)
```

### Interactive Dependency Connection

Dependencies are created via an interactive "+" button on each node:
1. Click "+" on source node → enters connection mode
2. Document-level `mousemove` tracks cursor for preview arrow
3. Hover target node → arrow snaps, node highlights
4. Click target → calls `handleAddDependency(sourceId, targetId)`
5. Escape or click outside → cancels connection mode

The preview arrow uses SVG with conditional styling (dashed blue → solid green when snapped).
