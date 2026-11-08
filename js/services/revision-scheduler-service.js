/**
 * Academix Smart Execution Engine - Spaced Revision Scheduler Service
 * Spaced repetition engine (R1: Day 1, R2: Day 3, R3: Day 7, R4: Day 14, Final: Pre-Exam)
 * Responsive to student active recall ratings (Easy, Moderate, Difficult).
 * Dual runtime: Browser (window.AcademixRevisionSchedulerService) & Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateService = require('./date-service');
    module.exports = factory(DateService);
  } else {
    root.AcademixRevisionSchedulerService = factory(root.AcademixDateService);
  }
}(typeof self !== 'undefined' ? self : this, function (DateService) {
  'use strict';

  const DEFAULT_INTERVALS = {
    1: 1,   // R1: Day +1
    2: 3,   // R2: Day +3
    3: 7,   // R3: Day +7
    4: 14   // R4: Day +14
  };

  const RevisionSchedulerService = {
    /**
     * Generate or schedule next revision for a topic
     */
    scheduleRevision: function(topic, subject, state, options = {}) {
      if (!topic || !subject) return null;

      const stage = options.stage || 1;
      const baseDate = options.baseDate || DateService.todayString();
      const intervalDays = DEFAULT_INTERVALS[stage] || 3;
      const scheduledDate = DateService.addDays(baseDate, intervalDays);

      // Prevent duplicate active revision tasks for the same topic & stage
      if (!state.tasks) state.tasks = [];
      const duplicate = state.tasks.find(t => 
        t.isRevision && 
        t.topicId === topic.id && 
        t.revisionStage === stage && 
        t.status !== 'completed'
      );
      if (duplicate) {
        return { created: false, message: 'Revision task already scheduled', task: duplicate };
      }

      const revisionTask = {
        id: `rev-${topic.id || Date.now().toString(36)}-r${stage}`,
        title: `R${stage} Spaced Revision: ${topic.title || topic.name || 'Topic Revision'}`,
        description: `Spaced active recall review (Stage ${stage} of 4) for ${subject.name || subject.code}.`,
        subjectId: subject.id || subject.code,
        moduleId: topic.moduleId || null,
        topicId: topic.id || null,
        topic: topic.title || topic.name,
        category: 'Revision',
        isRevision: true,
        revisionStage: stage,
        priority: stage >= 3 ? 'High' : 'Medium',
        status: 'pending',
        executionState: 'not_started',
        scheduledDate,
        dueDate: scheduledDate,
        estimatedMinutes: stage === 1 ? 30 : (stage === 4 ? 60 : 45),
        actualMinutes: 0,
        createdAt: new Date().toISOString()
      };

      state.tasks.push(revisionTask);

      // Also record in revisionRecords
      if (!state.revisionRecords) state.revisionRecords = [];
      state.revisionRecords.push({
        id: `rec-${revisionTask.id}`,
        topicId: topic.id,
        subjectId: subject.id,
        revisionStage: stage,
        scheduledDate,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      });

      return { created: true, task: revisionTask, scheduledDate };
    },

    /**
     * Record recall feedback after a completed revision and compute next step
     * recallRating: "easy" | "moderate" | "difficult"
     */
    recordRecallFeedback: function(taskId, recallRating, state) {
      if (!state || !state.tasks) return null;

      const task = state.tasks.find(t => t.id === taskId);
      if (!task || !task.isRevision) return null;

      const currentStage = task.revisionStage || 1;
      const today = DateService.todayString();

      // Mark current task completed
      task.status = 'completed';
      task.executionState = 'completed';
      task.completedAt = new Date().toISOString();
      task.recallRating = recallRating;

      // Update revision history record
      if (!state.revisionRecords) state.revisionRecords = [];
      const record = state.revisionRecords.find(r => r.topicId === task.topicId && r.revisionStage === currentStage);
      if (record) {
        record.status = 'completed';
        record.completedAt = task.completedAt;
        record.recallRating = recallRating;
      }

      // Check if another stage should be scheduled
      if (currentStage < 4) {
        const nextStage = currentStage + 1;
        let baseInterval = DEFAULT_INTERVALS[nextStage] || 7;

        // Apply recall multipliers
        if (recallRating === 'easy') {
          baseInterval = Math.round(baseInterval * 1.5);
        } else if (recallRating === 'difficult') {
          baseInterval = Math.max(1, Math.round(baseInterval * 0.5));
        }

        const nextDate = DateService.addDays(today, baseInterval);

        const nextTask = {
          id: `rev-${task.topicId || Date.now().toString(36)}-r${nextStage}`,
          title: `R${nextStage} Spaced Revision: ${task.topic}`,
          description: `Spaced active recall review (Stage ${nextStage} of 4) • Adjusted interval (${baseInterval}d) based on '${recallRating}' recall.`,
          subjectId: task.subjectId,
          moduleId: task.moduleId,
          topicId: task.topicId,
          topic: task.topic,
          category: 'Revision',
          isRevision: true,
          revisionStage: nextStage,
          priority: nextStage >= 3 ? 'High' : 'Medium',
          status: 'pending',
          executionState: 'not_started',
          scheduledDate: nextDate,
          dueDate: nextDate,
          estimatedMinutes: 45,
          actualMinutes: 0,
          createdAt: new Date().toISOString()
        };

        state.tasks.push(nextTask);

        state.revisionRecords.push({
          id: `rec-${nextTask.id}`,
          topicId: task.topicId,
          subjectId: task.subjectId,
          revisionStage: nextStage,
          scheduledDate: nextDate,
          status: 'scheduled',
          createdAt: new Date().toISOString()
        });

        return { nextStageScheduled: true, nextTask, nextDate, intervalDays: baseInterval };
      }

      return { nextStageScheduled: false, message: 'All 4 spaced revision stages complete!' };
    },

    /**
     * Get all revisions due on or before today
     */
    getDueRevisions: function(state, customToday = null) {
      const today = customToday || DateService.todayString();
      const tasks = state?.tasks || [];
      return tasks.filter(t => t.isRevision && t.status !== 'completed' && (t.scheduledDate || t.dueDate) <= today);
    }
  };

  return RevisionSchedulerService;
}));

