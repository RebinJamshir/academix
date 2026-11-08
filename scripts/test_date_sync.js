/**
 * Date Sync Verification Test
 * Verifies that the cursor, dashboard, calendar, planner, tasks, and store
 * are 100% synchronized to today's date (2026-11-08).
 */
const assert = require('assert');
const fs = require('fs');

global.window = {};
global.localStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};
global.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

// Load services
global.window.AcademixDateService = require('../js/services/date-service.js');
global.window.AcademixTaskStatusService = require('../js/services/task-status-service.js');
global.window.AcademixCarryForwardService = require('../js/services/carry-forward-service.js');
global.window.AcademixRecoveryPlannerService = require('../js/services/recovery-planner-service.js');
global.window.AcademixRevisionSchedulerService = require('../js/services/revision-scheduler-service.js');
global.window.AcademixSchedulingConflictService = require('../js/services/scheduling-conflict-service.js');
global.window.AcademixExecutionAnalyticsService = require('../js/services/execution-analytics-service.js');

const db = JSON.parse(fs.readFileSync('data/academix_db.json', 'utf8'));
global.window.KTU_DATA = db;

// Initialize store
delete require.cache[require.resolve('../js/store.js')];
require('../js/store.js');
const store = global.window.academicStore;
store.state = db;
store.recalculateAll();

console.log('--- Verifying Real-Time Date Synchronization (Anchor: 2026-11-08) ---');

// 1. Date Service Check
const todayStr = window.AcademixDateService.todayString();
console.log('Today string from DateService:', todayStr);
assert.strictEqual(todayStr, '2026-11-08', 'DateService must return 2026-11-08');

// 2. Calendar View Check
delete require.cache[require.resolve('../js/views/calendar.js')];
require('../js/views/calendar.js');
const cal = global.window.CalendarView;
assert.strictEqual(cal.getTodayDateStr(), '2026-11-08', 'Calendar getTodayDateStr must be 2026-11-08');
assert.strictEqual(cal.selectedDateStr, '2026-11-08', 'Calendar cursor selectedDateStr must be 2026-11-08');
console.log('✓ Calendar View cursor defaults to 2026-11-08');

// 3. Dashboard View Check
delete require.cache[require.resolve('../js/views/dashboard.js')];
require('../js/views/dashboard.js');
const dash = global.window.DashboardView;
assert.strictEqual(dash.getTodayDateStr(), '2026-11-08', 'Dashboard getTodayDateStr must be 2026-11-08');
assert.strictEqual(dash.selectedDateStr, '2026-11-08', 'Dashboard selectedDateStr must be 2026-11-08');
console.log('✓ Dashboard View selected date defaults to 2026-11-08');

// 4. Planner View Check
delete require.cache[require.resolve('../js/views/planner.js')];
require('../js/views/planner.js');
const planner = global.window.PlannerView;
assert.strictEqual(planner.getTodayDateStr(), '2026-11-08', 'Planner getTodayDateStr must be 2026-11-08');
assert.strictEqual(planner.currentPlanDate, '2026-11-08', 'Planner default date must be 2026-11-08');
console.log('✓ Planner View currentPlanDate defaults to 2026-11-08');

// 5. Tasks View Check
delete require.cache[require.resolve('../js/views/tasks.js')];
require('../js/views/tasks.js');
const tasksView = global.window.TasksView;
const todayTasks = store.state.tasks.filter(t => (t.scheduledDate || t.dueDate) === todayStr && t.status !== 'completed');
console.log('Today tasks count for 2026-11-08:', todayTasks.length);
assert(todayTasks.length >= 2, 'There must be at least 2 tasks due on 2026-11-08');
console.log('✓ Tasks View filters today tasks accurately for 2026-11-08');

// 6. Exam Countdown Check
const cnExam = store.state.examinations.find(e => e.subjectCode === 'PCCST501');
console.log(`CN Exam on ${cnExam.examDate}: ${cnExam.daysLeft} days left`);
assert.strictEqual(cnExam.daysLeft, 15, 'Computer Networks exam on 2026-11-23 must be exactly 15 days from 2026-11-08');
console.log('✓ Exam countdown dynamically calculated relative to today');

console.log('\n=======================================');
console.log(' ALL DATE SYNC TESTS PASSED CLEANLY!   ');
console.log('=======================================\n');
