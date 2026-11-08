/**
 * Academix Smart Execution Engine - Scheduling Conflict Service
 * Verifies that proposed study slots do not collide with sleep (22:45),
 * college hours (09:00 - 17:00), or existing timetable sessions.
 * Dual runtime: Browser (window.AcademixSchedulingConflictService) & Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateService = require('./date-service');
    module.exports = factory(DateService);
  } else {
    root.AcademixSchedulingConflictService = factory(root.AcademixDateService);
  }
}(typeof self !== 'undefined' ? self : this, function (DateService) {
  'use strict';

  const BEDTIME_MINUTES = DateService.timeToMinutes('22:45'); // 1365m
  const COLLEGE_START = DateService.timeToMinutes('09:00');    // 540m
  const COLLEGE_END = DateService.timeToMinutes('17:00');      // 1020m

  const SchedulingConflictService = {
    /**
     * Audit a proposed session against all constraints
     */
    checkConflicts: function(proposedSlot, state) {
      const {
        date,
        startTime,
        endTime,
        excludeSessionId = null
      } = proposedSlot;

      const conflicts = [];

      if (!date || !startTime || !endTime) {
        return { hasConflict: true, conflicts: ['Incomplete time parameters'] };
      }

      const startMin = DateService.timeToMinutes(startTime);
      const endMin = DateService.timeToMinutes(endTime);

      if (endMin <= startMin) {
        conflicts.push('End time must be strictly after start time');
      }

      // 1. Bedtime Rule Check (Strict 22:45 limit)
      if (endMin > BEDTIME_MINUTES) {
        conflicts.push(`Violates 22:45 sleep protection (slot ends at ${endTime}, past 22:45).`);
      }

      // 2. Weekday College Hours Check (09:00 - 17:00)
      const isWeekend = DateService.isWeekend(date);
      if (!isWeekend) {
        if (!(endMin <= COLLEGE_START || startMin >= COLLEGE_END)) {
          conflicts.push(`Collides with fixed college hours (09:00 - 17:00 on weekdays).`);
        }
      }

      // 3. Collision with Existing Study Sessions
      const existing = (state?.studySessions || []).filter(s => 
        s.date === date && 
        s.id !== excludeSessionId && 
        s.status !== 'cancelled' && 
        s.status !== 'missed' &&
        s.startTime && s.endTime
      );

      for (const sess of existing) {
        const sessStart = DateService.timeToMinutes(sess.startTime);
        const sessEnd = DateService.timeToMinutes(sess.endTime);

        const overlaps = !(endMin <= sessStart || startMin >= sessEnd);
        if (overlaps) {
          conflicts.push(`Overlaps with existing session "${sess.title}" (${sess.startTime} - ${sess.endTime}).`);
        }
      }

      return {
        hasConflict: conflicts.length > 0,
        conflicts
      };
    }
  };

  return SchedulingConflictService;
}));
