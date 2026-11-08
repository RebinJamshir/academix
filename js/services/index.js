/**
 * Academix Smart Execution Engine - Unified Module Entry
 * Exports all engine services under window.AcademixEngine & Node.js module.exports
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateService = require('./date-service');
    const TaskStatusService = require('./task-status-service');
    const CarryForwardService = require('./carry-forward-service');
    const RecoveryPlannerService = require('./recovery-planner-service');
    const RevisionSchedulerService = require('./revision-scheduler-service');
    const NotificationService = require('./notification-service');
    const SchedulingConflictService = require('./scheduling-conflict-service');
    const ExecutionAnalyticsService = require('./execution-analytics-service');
    module.exports = factory(
      DateService,
      TaskStatusService,
      CarryForwardService,
      RecoveryPlannerService,
      RevisionSchedulerService,
      NotificationService,
      SchedulingConflictService,
      ExecutionAnalyticsService
    );
  } else {
    root.AcademixEngine = factory(
      root.AcademixDateService,
      root.AcademixTaskStatusService,
      root.AcademixCarryForwardService,
      root.AcademixRecoveryPlannerService,
      root.AcademixRevisionSchedulerService,
      root.AcademixNotificationService,
      root.AcademixSchedulingConflictService,
      root.AcademixExecutionAnalyticsService
    );
  }
}(typeof self !== 'undefined' ? self : this, function (
  DateService,
  TaskStatusService,
  CarryForwardService,
  RecoveryPlannerService,
  RevisionSchedulerService,
  NotificationService,
  SchedulingConflictService,
  ExecutionAnalyticsService
) {
  'use strict';

  return {
    DateService,
    TaskStatusService,
    CarryForwardService,
    RecoveryPlannerService,
    RevisionSchedulerService,
    NotificationService,
    SchedulingConflictService,
    ExecutionAnalyticsService
  };
}));

