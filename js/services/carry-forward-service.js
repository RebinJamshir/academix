/**
 * Academix Smart Execution Engine - Carry-Forward Service
 * Detection and aggregation engine for unfinished academic work from past dates.
 * Invariance Rule: Never duplicates task records; preserves historical execution.
 * Dual runtime: Browser (window.AcademixCarryForwardService) & Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateService = require('./date-service');
    const TaskStatusService = require('./task-status-service');
    module.exports = factory(DateService, TaskStatusService);
  } else {
    root.AcademixCarryForwardService = factory(root.AcademixDateService, root.AcademixTaskStatusService);
  }
}(typeof self !== 'undefined' ? self : this, function (DateService, TaskStatusService) {
  'use strict';

  const CarryForwardService = {
    /**
     * Inspect all tasks and return the active carry-forward queue
     */
    detectCarryForwardTasks: function(tasks = [], customToday = null) {
      const today = customToday || DateService.todayString();
      const carryForwardQueue = [];
      const seenTaskIds = new Set();

      for (const rawTask of tasks) {
        if (!rawTask || seenTaskIds.has(rawTask.id)) continue;

        const task = TaskStatusService.normalizeTask(rawTask, today);

        // Exclude completed tasks
        if (task.status === 'completed' || task.executionState === 'completed' || task.completedAt) {
          continue;
        }

        // Active scheduled date must be strictly prior to today
        const activeDate = task.scheduledDate || task.dueDate;
        if (activeDate && activeDate < today) {
          seenTaskIds.add(task.id);

          const daysOverdue = DateService.diffInDays(today, activeDate);
          const remainingMinutes = TaskStatusService.getRemainingDuration(task);

          carryForwardQueue.push({
            taskId: task.id,
            task,
            originalDate: task.originalScheduledDate || activeDate,
            lastScheduledDate: activeDate,
            daysOverdue: Math.max(1, daysOverdue),
            estimatedMinutes: task.estimatedMinutes || task.plannedMinutes || 0,
            actualMinutes: task.actualMinutes || 0,
            remainingMinutes,
            priority: task.priority || 'Medium',
            subjectId: task.subjectId || '',
            topic: task.topic || task.title || '',
            rescheduleCount: task.rescheduleCount || 0
          });
        }
      }

      // Sort by days overdue descending, then priority
      const pWeights = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      carryForwardQueue.sort((a, b) => {
        if (b.daysOverdue !== a.daysOverdue) {
          return b.daysOverdue - a.daysOverdue;
        }
        return (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0);
      });

      return carryForwardQueue;
    },

    /**
     * Aggregated summary of carry-forward backlog
     */
    getBacklogSummary: function(tasks = [], customToday = null) {
      const queue = this.detectCarryForwardTasks(tasks, customToday);
      const totalRemainingMinutes = queue.reduce((sum, item) => sum + item.remainingMinutes, 0);
      const subjectsMap = {};

      queue.forEach(item => {
        const sub = item.subjectId || 'general';
        subjectsMap[sub] = (subjectsMap[sub] || 0) + 1;
      });

      return {
        totalCount: queue.length,
        totalRemainingMinutes,
        totalRemainingHours: (totalRemainingMinutes / 60).toFixed(1),
        affectedSubjectsCount: Object.keys(subjectsMap).length,
        subjectsBreakdown: subjectsMap,
        items: queue
      };
    }
  };

  return CarryForwardService;
}));
