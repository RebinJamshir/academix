/**
 * Academix Smart Execution Engine - Task Status Service
 * Separates Execution State (not_started, in_progress, completed) from
 * Date-derived State (upcoming, today, overdue) to derive exact UI status.
 * Dual runtime: Browser (window.AcademixTaskStatusService) & Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateService = require('./date-service');
    module.exports = factory(DateService);
  } else {
    root.AcademixTaskStatusService = factory(root.AcademixDateService);
  }
}(typeof self !== 'undefined' ? self : this, function (DateService) {
  'use strict';

  const TaskStatusService = {
    /**
     * Compute exact user-facing status string
     * Returns: "completed" | "in-progress" | "overdue" | "upcoming" | "pending"
     */
    getTaskStatus: function(task, customToday = null) {
      if (!task) return 'pending';

      // 1. Completion is absolute
      if (task.completedAt || task.executionState === 'completed' || task.status === 'completed') {
        return 'completed';
      }

      // 2. Execution state in progress
      if (task.executionState === 'in_progress' || task.status === 'in-progress') {
        return 'in-progress';
      }

      // 3. Resolve active scheduled date (approved reschedule overrides original date)
      const scheduledDate = task.scheduledDate || task.dueDate;
      if (!scheduledDate) return 'pending';

      const today = customToday || DateService.todayString();

      // Rule 3: Calendar date has completely elapsed
      if (scheduledDate < today) {
        return 'overdue';
      }

      // Rule 5: Future date
      if (scheduledDate > today) {
        return 'upcoming';
      }

      // Rule 1: Today's unfinished task remains pending, regardless of current time of day
      return 'pending';
    },

    /**
     * Compute remaining duration for a task
     * Formula: max(0, estimatedMinutes - actualMinutes)
     */
    getRemainingDuration: function(task) {
      if (!task) return 0;
      const estimated = task.estimatedMinutes || task.plannedMinutes || 0;
      const actual = task.actualMinutes || 0;
      return Math.max(0, estimated - actual);
    },

    /**
     * Human readable display label & badge style
     */
    getStatusDisplay: function(status) {
      const map = {
        'completed': { label: 'Completed', badgeClass: 'badge-completed', icon: 'check_circle' },
        'in-progress': { label: 'In Progress', badgeClass: 'badge-pending', icon: 'timelapse' },
        'overdue': { label: 'Overdue', badgeClass: 'badge-urgent', icon: 'error' },
        'upcoming': { label: 'Upcoming', badgeClass: 'badge-neutral', icon: 'schedule' },
        'pending': { label: 'Pending', badgeClass: 'badge-neutral', icon: 'radio_button_unchecked' }
      };
      return map[status] || map.pending;
    },

    /**
     * Synchronize task entity properties to guarantee data consistency
     */
    normalizeTask: function(task, customToday = null) {
      if (!task) return null;
      const today = customToday || DateService.todayString();
      const status = this.getTaskStatus(task, today);
      const remainingMinutes = this.getRemainingDuration(task);

      // Preserve original scheduled date if not set
      const scheduledDate = task.scheduledDate || task.dueDate || today;
      const originalScheduledDate = task.originalScheduledDate || scheduledDate;

      let executionState = task.executionState;
      if (!executionState) {
        if (task.completedAt || status === 'completed') executionState = 'completed';
        else if (status === 'in-progress') executionState = 'in_progress';
        else executionState = 'not_started';
      }

      return Object.assign({}, task, {
        status,
        executionState,
        scheduledDate,
        originalScheduledDate,
        dueDate: scheduledDate, // Maintain compatibility with existing UI
        remainingMinutes,
        rescheduleCount: task.rescheduleCount || 0
      });
    }
  };

  return TaskStatusService;
}));

