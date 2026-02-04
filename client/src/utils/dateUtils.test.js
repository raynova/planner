import { describe, it, expect } from 'vitest';
import {
  getWeekDate,
  dateToWeek,
  datesToDuration,
  formatDateDDMMYYYY,
  formatDateRange,
  getMonthForWeek,
  getMonthColumns,
  getMonthlyTaskPosition,
  getMinWeeksNeeded,
  getBaseWeeks,
  getTotalWeeks,
} from './dateUtils';

describe('dateUtils', () => {
  // Use a fixed start date for consistent tests
  const startDate = new Date('2025-01-06'); // A Monday

  describe('getWeekDate', () => {
    it('returns the correct Monday for week 1', () => {
      const result = getWeekDate(startDate, 1);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(6);
      expect(result.getMonth()).toBe(0); // January
    });

    it('returns the correct Monday for week 2', () => {
      const result = getWeekDate(startDate, 2);
      expect(result.getDate()).toBe(13);
    });

    it('handles non-Monday start dates', () => {
      const wednesday = new Date('2025-01-08'); // Wednesday
      const result = getWeekDate(wednesday, 1);
      expect(result.getDay()).toBe(1); // Still returns Monday
    });
  });

  describe('dateToWeek', () => {
    it('returns week 1 for the start date', () => {
      expect(dateToWeek(startDate, '2025-01-06')).toBe(1);
    });

    it('returns week 1 for any day in the first week', () => {
      expect(dateToWeek(startDate, '2025-01-10')).toBe(1);
    });

    it('returns week 2 for the next Monday', () => {
      expect(dateToWeek(startDate, '2025-01-13')).toBe(2);
    });

    it('handles dates before start date', () => {
      expect(dateToWeek(startDate, '2024-12-30')).toBe(0);
    });
  });

  describe('datesToDuration', () => {
    it('returns 1 week for same day', () => {
      expect(datesToDuration('2025-01-06', '2025-01-06')).toBe(1);
    });

    it('returns 1 week for 6 days', () => {
      expect(datesToDuration('2025-01-06', '2025-01-12')).toBe(1);
    });

    it('returns 2 weeks for 8 days', () => {
      expect(datesToDuration('2025-01-06', '2025-01-14')).toBe(2);
    });

    it('returns 4 weeks for a month', () => {
      expect(datesToDuration('2025-01-06', '2025-02-03')).toBe(4);
    });
  });

  describe('formatDateDDMMYYYY', () => {
    it('formats date correctly', () => {
      expect(formatDateDDMMYYYY(new Date('2025-01-06'))).toBe('06/01/2025');
    });

    it('pads single digits', () => {
      expect(formatDateDDMMYYYY(new Date('2025-03-05'))).toBe('05/03/2025');
    });
  });

  describe('formatDateRange', () => {
    it('formats a 1-week range', () => {
      const result = formatDateRange(startDate, 1, 1);
      expect(result).toMatch(/06\/01\/2025 - 12\/01\/2025/);
    });

    it('formats a 2-week range', () => {
      const result = formatDateRange(startDate, 1, 2);
      expect(result).toMatch(/06\/01\/2025 - 19\/01\/2025/);
    });
  });

  describe('getMonthForWeek', () => {
    it('returns January (0) for week 1', () => {
      expect(getMonthForWeek(startDate, 1)).toBe(0);
    });

    it('returns correct month for later weeks', () => {
      // Week 5 would be around early February
      const result = getMonthForWeek(startDate, 5);
      expect(result).toBe(1); // February
    });
  });

  describe('getMonthColumns', () => {
    it('returns array of month dates', () => {
      const result = getMonthColumns(startDate, 16);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].getDate()).toBe(1);
    });

    it('covers all weeks', () => {
      const result = getMonthColumns(startDate, 16);
      const lastMonth = result[result.length - 1];
      expect(lastMonth).toBeDefined();
    });
  });

  describe('getMonthlyTaskPosition', () => {
    const task = { startWeek: 1, duration: 2 };

    it('returns left and width as percentages', () => {
      const result = getMonthlyTaskPosition(task, startDate, 16);
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('width');
      expect(result.left).toBeGreaterThanOrEqual(0);
      expect(result.width).toBeGreaterThanOrEqual(2);
    });

    it('handles task starting later', () => {
      const laterTask = { startWeek: 5, duration: 1 };
      const result = getMonthlyTaskPosition(laterTask, startDate, 16);
      expect(result.left).toBeGreaterThan(0);
    });
  });

  describe('getMinWeeksNeeded', () => {
    it('returns 16 for empty tasks', () => {
      expect(getMinWeeksNeeded([])).toBe(16);
    });

    it('returns task end week + 8', () => {
      const tasks = [{ startWeek: 5, duration: 3 }]; // Ends at week 7
      expect(getMinWeeksNeeded(tasks)).toBe(15); // 7 + 8
    });

    it('uses the latest task end', () => {
      const tasks = [
        { startWeek: 1, duration: 2 },
        { startWeek: 10, duration: 3 }, // Ends at week 12
      ];
      expect(getMinWeeksNeeded(tasks)).toBe(20); // 12 + 8
    });
  });

  describe('getBaseWeeks', () => {
    it('returns 16 for weekly view', () => {
      expect(getBaseWeeks('weekly')).toBe(16);
    });

    it('returns 24 for monthly view', () => {
      expect(getBaseWeeks('monthly')).toBe(24);
    });

    it('returns 16 for unknown view', () => {
      expect(getBaseWeeks('unknown')).toBe(16);
    });
  });

  describe('getTotalWeeks', () => {
    it('returns base weeks for empty tasks', () => {
      expect(getTotalWeeks('weekly', [])).toBe(16);
    });

    it('returns base weeks when tasks fit', () => {
      const tasks = [{ startWeek: 1, duration: 2 }];
      expect(getTotalWeeks('weekly', tasks)).toBe(16);
    });

    it('returns min weeks needed when larger than base', () => {
      const tasks = [{ startWeek: 20, duration: 5 }]; // Ends at week 24, needs 32
      expect(getTotalWeeks('weekly', tasks)).toBe(32);
    });
  });
});
