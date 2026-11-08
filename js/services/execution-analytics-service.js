/**
 * Academix Smart Execution Engine - Execution Analytics Service
 * Provides telemetry for execution adherence, recovery success rate,
 * and spaced revision velocity without conflating with syllabus progress.
 * Dual runtime: Browser (window.AcademixExecutionAnalyticsService) & Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateService = require('./date-service');
    const TaskStatusService = require('./task-status-service');
    const CarryForwardService = require('./carry-forward-service');
    module.exports = factory(DateService, TaskStatusService, CarryForwardService);
  } else {
    root.AcademixExecutionAnalyticsService = factory(
      root.AcademixDateService,
      root.AcademixTaskStatusService,
      root.AcademixCarryForwardService
    );
  }
}(typeof self !== 'undefined' ? self : this, function (DateService, TaskStatusService, CarryForwardService) {
  'use strict';

  const ExecutionAnalyticsService = {
    /**
     * Compute comprehensive execution telemetry
     */
    getExecutionMetrics: function(state, customToday = null) {
      const today = customToday || DateService.todayString();
      const tasks = state?.tasks || [];
      const studySessions = state?.studySessions || [];
      const revisionRecords = state?.revisionRecords || [];

      // 1. Today's Task Execution
      const todayTasks = tasks.filter(t => (t.scheduledDate || t.dueDate) === today);
      const todayCompleted = todayTasks.filter(t => t.status === 'completed' || t.executionState === 'completed').length;
      const todayCompletionRate = todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 100;

      // 2. Study Session Time Telemetry (Actual vs Planned)
      const allCompletedSessions = studySessions.filter(s => s.status === 'completed' && s.actualMinutes > 0);
      const totalActualMinutes = allCompletedSessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
      const totalPlannedMinutes = studySessions.reduce((acc, s) => acc + (s.plannedMinutes || 0), 0);
      const overallAdherenceRate = totalPlannedMinutes > 0 ? Math.round((totalActualMinutes / totalPlannedMinutes) * 100) : 0;

      // 3. Recovery Success Rate
      const recoverySessions = studySessions.filter(s => s.isRecoveryBlock);
      const completedRecovery = recoverySessions.filter(s => s.status === 'completed').length;
      const recoverySuccessRate = recoverySessions.length > 0 ? Math.round((completedRecovery / recoverySessions.length) * 100) : 100;

      // 4. Spaced Revision Velocity
      const completedRevisions = revisionRecords.filter(r => r.status === 'completed').length;
      const totalRevisions = revisionRecords.length;
      const revisionCompletionRate = totalRevisions > 0 ? Math.round((completedRevisions / totalRevisions) * 100) : 100;

      // 5. Carry Forward Backlog Summary
      const backlog = CarryForwardService.getBacklogSummary(tasks, today);

      return {
        todayTotalTasks: todayTasks.length,
        todayCompletedTasks: todayCompleted,
        todayCompletionRate,
        totalActualHours: (totalActualMinutes / 60).toFixed(1),
        overallAdherenceRate,
        recoverySessionsCount: recoverySessions.length,
        completedRecoveryCount: completedRecovery,
        recoverySuccessRate,
        completedRevisionsCount: completedRevisions,
        totalRevisionsCount: totalRevisions,
        revisionCompletionRate,
        carryForwardCount: backlog.totalCount,
        carryForwardHours: backlog.totalRemainingHours
      };
    }
  };

  return ExecutionAnalyticsService;
}));

