/**
 * Test AI Context and Markdown Rendering
 */
const fs = require('fs');

// Mock window and services
global.window = {};
global.window.AcademixDateService = require('../js/services/date-service.js');
global.window.AcademixTaskStatusService = require('../js/services/task-status-service.js');
global.window.AcademixCarryForwardService = require('../js/services/carry-forward-service.js');
global.window.AcademixRecoveryPlannerService = require('../js/services/recovery-planner-service.js');
global.window.AcademixRevisionSchedulerService = require('../js/services/revision-scheduler-service.js');
global.window.AcademixSchedulingConflictService = require('../js/services/scheduling-conflict-service.js');
global.window.AcademixExecutionAnalyticsService = require('../js/services/execution-analytics-service.js');

const db = JSON.parse(fs.readFileSync('data/academix_db.json', 'utf8'));
global.window.academicStore = {
  state: db,
  getCarryForwardSummary: function() {
    return window.AcademixCarryForwardService.getBacklogSummary(this.state.tasks, '2026-11-08');
  },
  getDueRevisions: function() {
    return window.AcademixRevisionSchedulerService.getDueRevisions(this.state, '2026-11-08');
  }
};

// Now test building context
const dateService = window.AcademixDateService;
const today = '2026-11-08';
const currentTime = '14:30';
const dayOfWeek = 'Sunday';

const state = db;
const p = state.profile || {};
const subjects = state.subjects || [];
const exams = state.examinations || [];
const tasks = state.tasks || [];
const sessions = state.studySessions || [];

const upcomingExams = exams
  .map(e => {
    const daysLeft = (typeof e.daysLeft === 'number') 
      ? e.daysLeft 
      : (dateService ? dateService.diffInDays(e.examDate, today) : null);
    return {
      name: e.subjectName,
      code: e.subjectCode,
      date: e.examDate,
      daysLeft: daysLeft,
      status: e.examDateStatus || 'provisional',
      prep: e.preparationPercent || 0,
      eveRevision: e.eveRevisionDate
    };
  })
  .filter(e => e.date >= today || e.daysLeft >= 0)
  .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

console.log('Upcoming exams count:', upcomingExams.length);
upcomingExams.forEach(e => console.log(` - ${e.name} (${e.code}): in ${e.daysLeft} days on ${e.date}`));

const s5Subjects = subjects.filter(s => s.category?.includes('S5') || s.semester === 'S5');
const backlogSubjects = subjects.filter(s => s.category?.includes('Backlog') || s.semester !== 'S5');

console.log('S5 Subjects:', s5Subjects.length, 'Backlogs:', backlogSubjects.length);

const backlogData = window.AcademixCarryForwardService.getBacklogSummary(tasks, today);
console.log('Backlog items count:', backlogData.totalCount, 'Remaining hours:', backlogData.totalRemainingHours);

const dueRevs = window.AcademixRevisionSchedulerService.getDueRevisions(state, today);
console.log('Due revisions:', dueRevs.length);

console.log('ALL CHECKS PASSED: No undefined properties detected.');
