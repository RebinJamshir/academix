/**
 * Automated Test Suite for Academix Smart Execution Engine
 * Validates all algorithms, status transitions, recovery scoring, and edge cases.
 */

const assert = require('assert');
const Engine = require('../js/services/index');

const {
  DateService,
  TaskStatusService,
  CarryForwardService,
  RecoveryPlannerService,
  RevisionSchedulerService,
  NotificationService,
  SchedulingConflictService,
  ExecutionAnalyticsService
} = Engine;

console.log('====================================================');
console.log(' Running Academix Smart Execution Engine Test Suite');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error('    Error:', err.message);
    failedTests++;
  }
}

// ----------------------------------------------------
// 1. DATE SERVICE TESTS
// ----------------------------------------------------
console.log('[1. Date Service Tests]');

it('calculates Asia/Kolkata date format cleanly', () => {
  const todayStr = DateService.todayString();
  assert.match(todayStr, /^\d{4}-\d{2}-\d{2}$/, 'Date must match YYYY-MM-DD');
});

it('handles addDays and diffInDays correctly without timezone skew', () => {
  const d1 = '2026-11-08';
  const d2 = DateService.addDays(d1, 3);
  assert.strictEqual(d2, '2026-11-11');
  assert.strictEqual(DateService.diffInDays(d2, d1), 3);
  assert.strictEqual(DateService.diffInDays(d1, d2), -3);
});

it('converts time strings to minutes and back accurately', () => {
  assert.strictEqual(DateService.timeToMinutes('22:45'), 1365);
  assert.strictEqual(DateService.timeToMinutes('09:00'), 540);
  assert.strictEqual(DateService.minutesToTime(1365), '22:45');
  assert.strictEqual(DateService.minutesToTime(540), '09:00');
});

// ----------------------------------------------------
// 2. TASK STATUS SERVICE TESTS
// ----------------------------------------------------
console.log('\n[2. Task Status Service Tests]');

const anchorToday = '2026-11-08';

it('marks today unfinished task as pending (not overdue even if scheduled time passed)', () => {
  const task = { id: 't1', dueDate: anchorToday, startTime: '09:00', endTime: '10:00', executionState: 'not_started' };
  const status = TaskStatusService.getTaskStatus(task, anchorToday);
  assert.strictEqual(status, 'pending');
});

it('marks past unfinished task as overdue', () => {
  const task = { id: 't2', dueDate: '2026-11-06', executionState: 'not_started' };
  const status = TaskStatusService.getTaskStatus(task, anchorToday);
  assert.strictEqual(status, 'overdue');
});

it('marks future task as upcoming', () => {
  const task = { id: 't3', dueDate: '2026-11-15', executionState: 'not_started' };
  const status = TaskStatusService.getTaskStatus(task, anchorToday);
  assert.strictEqual(status, 'upcoming');
});

it('marks completed task as completed regardless of dates', () => {
  const task = { id: 't4', dueDate: '2026-11-01', completedAt: '2026-11-02T10:00:00Z', executionState: 'completed' };
  const status = TaskStatusService.getTaskStatus(task, anchorToday);
  assert.strictEqual(status, 'completed');
});

it('accurately computes partial completion remaining duration', () => {
  const task = { id: 't5', estimatedMinutes: 90, actualMinutes: 40 };
  const remaining = TaskStatusService.getRemainingDuration(task);
  assert.strictEqual(remaining, 50, '90m estimated - 40m actual must equal 50m remaining');
});

it('handles over-logged study time safely (never negative remaining duration)', () => {
  const task = { id: 't6', estimatedMinutes: 60, actualMinutes: 80 };
  const remaining = TaskStatusService.getRemainingDuration(task);
  assert.strictEqual(remaining, 0, 'Remaining duration must cap at 0 minimum');
});

// ----------------------------------------------------
// 3. CARRY-FORWARD SERVICE TESTS
// ----------------------------------------------------
console.log('\n[3. Carry-Forward Service Tests]');

it('detects only past unfinished tasks without duplicating records', () => {
  const tasks = [
    { id: 'task-past-1', dueDate: '2026-11-06', estimatedMinutes: 90, actualMinutes: 30, status: 'pending' },
    { id: 'task-past-2', dueDate: '2026-11-07', estimatedMinutes: 60, actualMinutes: 60, status: 'completed', completedAt: '2026-11-07T12:00:00Z' },
    { id: 'task-today', dueDate: '2026-11-08', estimatedMinutes: 45, actualMinutes: 0, status: 'pending' },
    { id: 'task-future', dueDate: '2026-11-10', estimatedMinutes: 60, actualMinutes: 0, status: 'pending' }
  ];

  const queue = CarryForwardService.detectCarryForwardTasks(tasks, anchorToday);
  assert.strictEqual(queue.length, 1, 'Only unfinished past tasks should be in queue');
  assert.strictEqual(queue[0].taskId, 'task-past-1');
  assert.strictEqual(queue[0].remainingMinutes, 60);
  assert.strictEqual(queue[0].actualMinutes, 30);
});

// ----------------------------------------------------
// 4. RECOVERY PLANNER SERVICE TESTS
// ----------------------------------------------------
console.log('\n[4. Recovery Planner Service Tests]');

it('computes Stage A priority score deterministically between 0 and 100', () => {
  const mockState = {
    subjects: [{ id: 'sub-cn', syllabusProgress: 40 }],
    examinations: [{ subjectId: 'sub-cn', examDate: '2026-11-23', examDateStatus: 'provisional' }]
  };
  const task = { id: 'rec-t1', subjectId: 'sub-cn', scheduledDate: '2026-11-06', priority: 'High', category: 'Practice' };
  const score = RecoveryPlannerService.calculatePriorityScore(task, mockState, anchorToday);
  assert(score >= 0 && score <= 100, `Priority score ${score} must be between 0 and 100`);
});

it('Stage B slot finder strictly protects 22:45 bedtime boundary', () => {
  const mockState = {
    studySessions: [
      { id: 's1', date: '2026-11-09', startTime: '20:00', endTime: '21:30', plannedMinutes: 90, status: 'scheduled' }
    ]
  };
  const slots = RecoveryPlannerService.getFreeSlotsForDate('2026-11-09', mockState);
  slots.forEach(slot => {
    assert(slot.end <= 1365, `Slot end ${slot.endTime} (${slot.end}m) cannot exceed 22:45 (1365m)`);
  });
});

it('generates recovery proposal and requires student approval before updating schedule', () => {
  const mockState = {
    tasks: [
      { id: 't-rec-1', title: 'Solve CN Model Paper', subjectId: 'sub-cn', scheduledDate: '2026-11-06', estimatedMinutes: 60, actualMinutes: 0, status: 'pending' }
    ],
    studySessions: [],
    subjects: [{ id: 'sub-cn', syllabusProgress: 30 }],
    examinations: [{ subjectId: 'sub-cn', examDate: '2026-11-23', examDateStatus: 'provisional' }]
  };

  const plan = RecoveryPlannerService.generateProposals(mockState, anchorToday);
  assert.strictEqual(plan.proposalsCount, 1, 'Must generate 1 proposal');

  const proposal = plan.proposals[0];
  assert.strictEqual(proposal.taskId, 't-rec-1');
  assert.strictEqual(proposal.status, 'pending_review');

  // Verify schedule NOT yet mutated
  assert.strictEqual(mockState.tasks[0].scheduledDate, '2026-11-06', 'Original task date must not change before approval');

  // Apply approval
  const res = RecoveryPlannerService.applyApprovedProposal(proposal, mockState);
  assert.strictEqual(res.success, true);
  assert.strictEqual(mockState.tasks[0].scheduledDate, proposal.proposedDate);
  assert.strictEqual(mockState.tasks[0].rescheduleCount, 1);
  assert.strictEqual(mockState.studySessions.length, 1);
  assert.strictEqual(mockState.studySessions[0].isRecoveryBlock, true);
});

// ----------------------------------------------------
// 5. REVISION SCHEDULER TESTS
// ----------------------------------------------------
console.log('\n[5. Spaced Revision Scheduler Tests]');

it('schedules R1 spaced revision task with duplicate protection', () => {
  const mockState = { tasks: [], revisionRecords: [] };
  const topic = { id: 'top-1', title: 'HTTP & DNS Layer' };
  const subject = { id: 'sub-cn', name: 'Computer Networks' };

  const res1 = RevisionSchedulerService.scheduleRevision(topic, subject, mockState, { stage: 1, baseDate: anchorToday });
  assert.strictEqual(res1.created, true);
  assert.strictEqual(res1.scheduledDate, '2026-11-09', 'R1 should be Day +1');

  // Attempt duplicate
  const res2 = RevisionSchedulerService.scheduleRevision(topic, subject, mockState, { stage: 1, baseDate: anchorToday });
  assert.strictEqual(res2.created, false, 'Must prevent duplicate active revision task');
});

it('responds to recall feedback by adjusting next revision interval', () => {
  const mockState = {
    tasks: [
      { id: 'rev-t1', isRevision: true, revisionStage: 1, topicId: 'top-1', topic: 'HTTP & DNS', subjectId: 'sub-cn', status: 'pending' }
    ],
    revisionRecords: []
  };

  const feedbackRes = RevisionSchedulerService.recordRecallFeedback('rev-t1', 'easy', mockState);
  assert.strictEqual(feedbackRes.nextStageScheduled, true);
  assert.strictEqual(feedbackRes.nextTask.revisionStage, 2);
  // Default R2 interval is 3 days. With 'easy' feedback, 3 * 1.5 = 4.5 -> 5 days
  assert.strictEqual(feedbackRes.intervalDays, 5);
});

// ----------------------------------------------------
// 6. NOTIFICATION DEDUPLICATION TESTS
// ----------------------------------------------------
console.log('\n[6. Notification Deduplication Tests]');

it('generates unique dedupKey and suppresses duplicate reminders', () => {
  const mockState = { notifications: [] };
  const payload = {
    taskId: 'task-99',
    reminderType: 'study_block',
    scheduledOccurrence: '2026-11-08-11:30',
    title: 'CN Study Reminder'
  };

  const r1 = NotificationService.dispatch(mockState, payload);
  assert.strictEqual(r1.dispatched, true);
  assert.strictEqual(mockState.notifications.length, 1);

  // Duplicate attempt
  const r2 = NotificationService.dispatch(mockState, payload);
  assert.strictEqual(r2.dispatched, false);
  assert.strictEqual(mockState.notifications.length, 1, 'Notifications count must remain 1');
});

// ----------------------------------------------------
// 7. SCHEDULING CONFLICT TESTS
// ----------------------------------------------------
console.log('\n[7. Scheduling Conflict Tests]');

it('detects bedtime violation when study slot extends past 22:45', () => {
  const mockState = { studySessions: [] };
  const check = SchedulingConflictService.checkConflicts({
    date: '2026-11-09',
    startTime: '22:00',
    endTime: '23:00'
  }, mockState);

  assert.strictEqual(check.hasConflict, true);
  assert(check.conflicts[0].includes('22:45 sleep protection'));
});

it('detects weekday college hour collision (09:00 - 17:00)', () => {
  const mockState = { studySessions: [] };
  const check = SchedulingConflictService.checkConflicts({
    date: '2026-11-09', // Monday
    startTime: '14:00',
    endTime: '15:30'
  }, mockState);

  assert.strictEqual(check.hasConflict, true);
  assert(check.conflicts[0].includes('college hours'));
});

// ----------------------------------------------------
// 8. EDGE CASE & RESILIENCE TESTS (Part 11)
// ----------------------------------------------------
console.log('\n[8. Edge Case & Resilience Tests]');

it('handles multiple consecutive missed days with priority ranking', () => {
  const tasks = [
    { id: 'm1', dueDate: '2026-11-06', status: 'pending', priority: 'Medium', estimatedMinutes: 45 },
    { id: 'm2', dueDate: '2026-11-07', status: 'pending', priority: 'Critical', estimatedMinutes: 60 }
  ];
  const queue = CarryForwardService.detectCarryForwardTasks(tasks, '2026-11-08');
  assert.strictEqual(queue.length, 2);
  // Nov 6 has 2 days overdue; Nov 7 has 1 day overdue. Higher days overdue ranks first
  assert.strictEqual(queue[0].taskId, 'm1');
  assert.strictEqual(queue[0].daysOverdue, 2);
});

it('handles repeatedly rescheduling the same task without losing original date', () => {
  const mockState = {
    tasks: [{ id: 'repeat-task', dueDate: '2026-11-06', scheduledDate: '2026-11-06', status: 'pending' }],
    studySessions: []
  };

  const p1 = { taskId: 'repeat-task', proposedDate: '2026-11-09', proposedStartTime: '18:00', proposedEndTime: '19:00', allocatedMinutes: 60, priorityScore: 80 };
  RecoveryPlannerService.applyApprovedProposal(p1, mockState);

  assert.strictEqual(mockState.tasks[0].scheduledDate, '2026-11-09');
  assert.strictEqual(mockState.tasks[0].originalScheduledDate, '2026-11-06');
  assert.strictEqual(mockState.tasks[0].rescheduleCount, 1);

  const p2 = { taskId: 'repeat-task', proposedDate: '2026-11-10', proposedStartTime: '19:00', proposedEndTime: '20:00', allocatedMinutes: 60, priorityScore: 85 };
  RecoveryPlannerService.applyApprovedProposal(p2, mockState);

  assert.strictEqual(mockState.tasks[0].scheduledDate, '2026-11-10');
  assert.strictEqual(mockState.tasks[0].originalScheduledDate, '2026-11-06', 'Original date MUST be preserved across multiple reschedules');
  assert.strictEqual(mockState.tasks[0].rescheduleCount, 2);
  assert.strictEqual(mockState.tasks[0].history.length, 2);
});

it('verifies quiet hours policy (silenced between 23:00 and 06:00)', () => {
  const dLate = new Date('2026-11-08T23:30:00');
  assert.strictEqual(NotificationService.isQuietHours(dLate), true);

  const dDay = new Date('2026-11-08T14:30:00');
  assert.strictEqual(NotificationService.isQuietHours(dDay), false);
});

it('checkAndScheduleReminders executes safely and triggers deduplicated alerts', () => {
  const mockState = {
    notifications: [],
    studySessions: [],
    tasks: [{ id: 'overdue-1', status: 'overdue' }]
  };
  NotificationService.checkAndScheduleReminders(mockState);
  assert(mockState.notifications.length > 0, 'Should dispatch carry-forward alert');
  const count = mockState.notifications.length;
  // Second run must be suppressed via dedup key
  NotificationService.checkAndScheduleReminders(mockState);
  assert.strictEqual(mockState.notifications.length, count, 'Dedup key must prevent duplicate reminders');
});

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log(` Test Results: ${passedTests} Passed, ${failedTests} Failed`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
}

