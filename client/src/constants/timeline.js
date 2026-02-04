// Timeline constants

export const COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
];

// Dimensions
export const NODE_WIDTH = 160;
export const NODE_HEIGHT = 60;
export const WEEK_WIDTH = 70;
export const MONTH_WIDTH = 120;
export const HORIZONTAL_SPACING = 40;
export const VERTICAL_SPACING = 100;
export const PADDING = 20;
export const DIAGRAM_PADDING = 50;

// Default new task state
export const getDefaultNewTask = () => ({
  name: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  color: 'bg-blue-500',
  blockedBy: [],
  notes: '',
});
