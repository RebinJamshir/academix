/**
 * Academix Smart Execution Engine - Recovery Planner Service
 * Implements Deterministic 2-Stage Recovery Algorithm & Mandatory Student Approval Workflow.
 * Stage A: Priority Score (0-100) = 0.35E + 0.25O + 0.20R + 0.10I + 0.10V
 * Stage B: Constraint-Satisfying Slot Finder (Sleep <= 22:45, Weekday 09:00-17:00 Protected)
 * Dual runtime: Browser (window.AcademixRecoveryPlannerService) & Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateService = require('./date-service');
    const TaskStatusService = require('./task-status-service');
    const CarryForwardService = require('./carry-forward-service');
    module.exports = factory(DateService, TaskStatusService, CarryForwardService);
  } else {
    root.AcademixRecoveryPlannerService = factory(
      root.AcademixDateService,
      root.AcademixTaskStatusService,
      root.AcademixCarryForwardService
    );
  }
}(typeof self !== 'undefined' ? self : this, function (DateService, TaskStatusService, CarryForwardService) {
  'use strict';

  // Constants & Hard Constraints
  const BEDTIME_MINUTES = DateService.timeToMinutes('22:45'); // 1365 minutes (Strict sleep boundary)
  const EARLIEST_MORNING_MINUTES = DateService.timeToMinutes('06:30'); // 390 minutes
  const COLLEGE_START = DateService.timeToMinutes('09:00'); // 540 minutes
  const COLLEGE_END = DateService.timeToMinutes('17:00'); // 1020 minutes

  const MAX_WEEKDAY_STUDY_MINUTES = 330; // 5.5 hours
  const MAX_WEEKEND_STUDY_MINUTES = 450; // 7.5 hours

  const RecoveryPlannerService = {
    /**
     * Stage A: Calculate Normalized Priority Score (0 - 100)
     * P = 0.35E + 0.25O + 0.20R + 0.10I + 0.10V
     */
    calculatePriorityScore: function(task, state, customToday = null) {
      const today = customToday || DateService.todayString();
      const activeDate = task.scheduledDate || task.dueDate || today;
      const daysOverdue = Math.max(0, DateService.diffInDays(today, activeDate));

      // 1. E: Exam Proximity (0 - 100)
      let E = 0;
      const exams = state?.examinations || [];
      const subExam = exams.find(e => e.subjectId === task.subjectId || e.subjectCode === task.subjectId);
      if (subExam && subExam.examDate && subExam.examDateStatus !== 'tbd') {
        const daysToExam = Math.max(0, DateService.diffInDays(subExam.examDate, today));
        E = Math.max(0, Math.min(100, Math.round(100 - (daysToExam / 30) * 100)));
      }

      // 2. O: Overdue Age (0 - 100) - Caps at 100 after 4 days
      const O = Math.min(100, daysOverdue * 25);

      // 3. R: Subject Preparation Risk (0 - 100)
      let R = 50;
      const subjects = state?.subjects || [];
      const sub = subjects.find(s => s.id === task.subjectId || s.code === task.subjectId);
      if (sub && typeof sub.syllabusProgress === 'number') {
        R = Math.max(0, Math.min(100, 100 - sub.syllabusProgress));
      }

      // 4. I: Task Importance (0 - 100)
      const pMap = { 'Critical': 100, 'High': 75, 'Medium': 50, 'Low': 25 };
      const I = pMap[task.priority] || 50;

      // 5. V: Revision Urgency (0 or 100)
      const V = (task.category === 'Revision' || task.isRevision) ? 100 : 0;

      const score = (0.35 * E) + (0.25 * O) + (0.20 * R) + (0.10 * I) + (0.10 * V);
      return Math.round(score * 10) / 10;
    },

    /**
     * Stage B: Find Candidate Free Slots on a Given Date
     */
    getFreeSlotsForDate: function(dateStr, state) {
      const isWeekend = DateService.isWeekend(dateStr);
      const studySessions = (state?.studySessions || []).filter(s => s.date === dateStr && s.status !== 'cancelled' && s.status !== 'missed');

      // Busy intervals in minutes from midnight
      const busyIntervals = [];

      // 1. College hours on weekdays (09:00 - 17:00)
      if (!isWeekend) {
        busyIntervals.push({ start: COLLEGE_START, end: COLLEGE_END, label: 'College Classes' });
      }

      // 2. Existing study sessions
      studySessions.forEach(s => {
        if (s.startTime && s.endTime) {
          busyIntervals.push({
            start: DateService.timeToMinutes(s.startTime),
            end: DateService.timeToMinutes(s.endTime),
            label: s.title || 'Study Session'
          });
        }
      });

      // 3. Sleep restriction: from 22:45 to midnight (and 00:00 to 06:30)
      busyIntervals.push({ start: 0, end: EARLIEST_MORNING_MINUTES, label: 'Night Rest' });
      busyIntervals.push({ start: BEDTIME_MINUTES, end: 1440, label: 'Protected Sleep' });

      // Sort intervals by start time
      busyIntervals.sort((a, b) => a.start - b.start);

      // Merge overlapping busy intervals
      const merged = [];
      busyIntervals.forEach(curr => {
        if (!merged.length) {
          merged.push({ start: curr.start, end: curr.end });
        } else {
          const prev = merged[merged.length - 1];
          if (curr.start <= prev.end) {
            prev.end = Math.max(prev.end, curr.end);
          } else {
            merged.push({ start: curr.start, end: curr.end });
          }
        }
      });

      // Calculate total existing study minutes on this date
      const totalPlannedMinutes = studySessions.reduce((sum, s) => sum + (s.plannedMinutes || 0), 0);
      const maxAllowed = isWeekend ? MAX_WEEKEND_STUDY_MINUTES : MAX_WEEKDAY_STUDY_MINUTES;
      const remainingQuota = Math.max(0, maxAllowed - totalPlannedMinutes);

      if (remainingQuota <= 0) {
        return []; // Daily workload cap reached
      }

      // Invert merged intervals to find free blocks
      const freeSlots = [];
      for (let i = 0; i < merged.length - 1; i++) {
        const freeStart = merged[i].end;
        const freeEnd = merged[i + 1].start;
        const duration = freeEnd - freeStart;
        if (duration >= 30) { // Minimum practical study block is 30 mins
          freeSlots.push({
            start: freeStart,
            end: freeEnd,
            duration: Math.min(duration, remainingQuota),
            startTime: DateService.minutesToTime(freeStart),
            endTime: DateService.minutesToTime(freeEnd)
          });
        }
      }

      return freeSlots;
    },

    /**
     * Generate Comprehensive Recovery Proposals for all Carry-Forward Tasks
     */
    generateProposals: function(state, customToday = null) {
      const today = customToday || DateService.todayString();
      const carryForwardQueue = CarryForwardService.detectCarryForwardTasks(state?.tasks || [], today);

      // Annotate with priority scores and sort
      carryForwardQueue.forEach(item => {
        item.priorityScore = this.calculatePriorityScore(item.task, state, today);
      });
      carryForwardQueue.sort((a, b) => b.priorityScore - a.priorityScore);

      const proposals = [];
      const unscheduled = [];

      // Search range: Next 7 days starting tomorrow (or today if slots available)
      const candidateDates = [];
      for (let d = 0; d <= 7; d++) {
        candidateDates.push(DateService.addDays(today, d));
      }

      // Clone existing sessions to simulate slot allocations
      const simulatedState = JSON.parse(JSON.stringify(state || {}));
      if (!simulatedState.studySessions) simulatedState.studySessions = [];

      for (const item of carryForwardQueue) {
        const task = item.task;
        let neededMinutes = item.remainingMinutes > 0 ? item.remainingMinutes : 45;
        let allocated = false;

        for (const targetDate of candidateDates) {
          const freeSlots = this.getFreeSlotsForDate(targetDate, simulatedState);

          for (const slot of freeSlots) {
            if (slot.duration >= Math.min(30, neededMinutes)) {
              const allocatedMinutes = Math.min(slot.duration, neededMinutes);
              const slotEndTimeMinutes = slot.start + allocatedMinutes;

              // Absolute verification of bedtime rule
              if (slotEndTimeMinutes > BEDTIME_MINUTES) {
                continue;
              }

              const proposal = {
                id: `rec-prop-${task.id}-${Date.now().toString(36)}`,
                taskId: task.id,
                taskTitle: task.title,
                subjectId: task.subjectId,
                originalDate: item.originalDate,
                proposedDate: targetDate,
                proposedStartTime: DateService.minutesToTime(slot.start),
                proposedEndTime: DateService.minutesToTime(slotEndTimeMinutes),
                allocatedMinutes,
                remainingMinutes: neededMinutes - allocatedMinutes,
                priorityScore: item.priorityScore,
                reason: `Priority Score ${item.priorityScore}/100 • Overdue by ${item.daysOverdue}d • Bedtime strictly protected (<22:45)`,
                status: 'pending_review',
                createdAt: new Date().toISOString()
              };

              proposals.push(proposal);

              // Reserve simulated slot
              simulatedState.studySessions.push({
                id: `sim-${proposal.id}`,
                date: targetDate,
                startTime: proposal.proposedStartTime,
                endTime: proposal.proposedEndTime,
                plannedMinutes: allocatedMinutes,
                status: 'scheduled'
              });

              allocated = true;
              break;
            }
          }

          if (allocated) break;
        }

        if (!allocated) {
          unscheduled.push({
            taskId: task.id,
            taskTitle: task.title,
            remainingMinutes: neededMinutes,
            priorityScore: item.priorityScore,
            reason: 'No constraint-compliant study slot found within 7-day horizon without violating sleep or college hours.'
          });
        }
      }

      return {
        generatedAt: new Date().toISOString(),
        proposals,
        unscheduled,
        totalBacklogTasks: carryForwardQueue.length,
        proposalsCount: proposals.length
      };
    },

    /**
     * Apply an Approved Proposal to the Actual State
     * Mandatory student approval execution: updates task scheduledDate,
     * writes taskHistory, and creates recovery block in studySessions.
     */
    applyApprovedProposal: function(proposal, state) {
      if (!proposal || !state) return { success: false, error: 'Invalid arguments' };

      const task = (state.tasks || []).find(t => t.id === proposal.taskId);
      if (!task) return { success: false, error: 'Task not found' };

      // Ensure original scheduled date is permanently preserved
      if (!task.originalScheduledDate) {
        task.originalScheduledDate = task.scheduledDate || task.dueDate || proposal.originalDate;
      }

      // Initialize history if missing
      if (!task.history) task.history = [];
      task.history.push({
        action: 'RECOVERY_RESCHEDULED',
        fromScheduledDate: task.scheduledDate || task.dueDate,
        toScheduledDate: proposal.proposedDate,
        fromStartTime: task.startTime || null,
        toStartTime: proposal.proposedStartTime,
        approvedAt: new Date().toISOString(),
        priorityScore: proposal.priorityScore
      });

      // Update active task date & time (original date remains intact)
      task.scheduledDate = proposal.proposedDate;
      task.dueDate = proposal.proposedDate;
      task.startTime = proposal.proposedStartTime;
      task.endTime = proposal.proposedEndTime;
      task.rescheduleCount = (task.rescheduleCount || 0) + 1;
      task.status = TaskStatusService.getTaskStatus(task);

      // Create or update recovery study session
      if (!state.studySessions) state.studySessions = [];
      const sessionId = `sess-recovery-${task.id}-${Date.now().toString(36)}`;
      state.studySessions.push({
        id: sessionId,
        taskId: task.id,
        date: proposal.proposedDate,
        startTime: proposal.proposedStartTime,
        endTime: proposal.proposedEndTime,
        timeSlot: `${proposal.proposedStartTime} - ${proposal.proposedEndTime}`,
        subjectId: task.subjectId,
        title: `⚡ Recovery: ${task.title}`,
        activityType: 'Recovery',
        isRecoveryBlock: true,
        plannedMinutes: proposal.allocatedMinutes,
        actualMinutes: 0,
        status: 'scheduled',
        notes: `Approved recovery from ${proposal.originalDate}`
      });

      // Mark proposal approved
      proposal.status = 'approved';
      proposal.approvedAt = new Date().toISOString();

      return { success: true, task, sessionId };
    }
  };

  return RecoveryPlannerService;
}));

