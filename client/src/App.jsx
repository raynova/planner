import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import TimelinePage from './pages/TimelinePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/timeline/:id" element={<TimelinePage />} />
    </Routes>
  );
}
