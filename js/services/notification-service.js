/**
 * Academix Smart Execution Engine - Notification & Reminder Service
 * Deduplicated in-app & browser notification dispatch.
 * Deduplication Key: `${taskId}_${reminderType}_${scheduledOccurrence}`
 * Dual runtime: Browser (window.AcademixNotificationService) & Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateService = require('./date-service');
    module.exports = factory(DateService);
  } else {
    root.AcademixNotificationService = factory(root.AcademixDateService);
  }
}(typeof self !== 'undefined' ? self : this, function (DateService) {
  'use strict';

  const NotificationService = {
    DEFAULT_LEAD_TIME_MINUTES: 15,
    QUIET_HOURS_START: 23, // 11:00 PM
    QUIET_HOURS_END: 6,    // 06:00 AM

    /**
     * Generate unique deduplication key
     */
    generateDedupKey: function(taskId, reminderType, scheduledOccurrence) {
      return `${taskId}_${reminderType}_${scheduledOccurrence}`;
    },

    /**
     * Check if current time falls within quiet hours
     */
    isQuietHours: function(date = new Date()) {
      const hour = date.getHours();
      return hour >= this.QUIET_HOURS_START || hour < this.QUIET_HOURS_END;
    },

    /**
     * Request browser Notification permission safely
     */
    requestPermission: async function() {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          return await Notification.requestPermission();
        }
        return Notification.permission;
      }
      return 'unsupported';
    },

    /**
     * Dispatch an in-app & optional browser notification
     */
    dispatch: function(state, payload = {}) {
      if (!state) return null;
      if (!state.notifications) state.notifications = [];

      const {
        taskId = 'general',
        reminderType = 'study_reminder',
        scheduledOccurrence = DateService.todayString(),
        title = 'Academix Study Reminder',
        message = '',
        category = 'study',
        priority = 'normal'
      } = payload;

      const dedupKey = this.generateDedupKey(taskId, reminderType, scheduledOccurrence);

      // Check for duplicate notification
      const exists = state.notifications.some(n => n.dedupKey === dedupKey);
      if (exists) {
        return { dispatched: false, reason: 'Duplicate notification suppressed' };
      }

      const notifItem = {
        id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        dedupKey,
        taskId,
        reminderType,
        title,
        message,
        category,
        priority,
        isRead: false,
        timestamp: new Date().toISOString()
      };

      state.notifications.unshift(notifItem);

      // Cap notifications list at 50 items
      if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
      }

      // Browser Notification if supported and not quiet hours
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        if (!this.isQuietHours()) {
          try {
            new Notification(title, {
              body: message,
              icon: 'logo.svg',
              tag: dedupKey
            });
          } catch (e) {
            console.warn('[NotificationService] Browser notification error:', e);
          }
        }
      }

      return { dispatched: true, notification: notifItem };
    },

    /**
     * Invalidate pending notifications for a completed or rescheduled task
     */
    invalidateTaskNotifications: function(state, taskId) {
      if (!state || !state.notifications || !taskId) return;
      state.notifications.forEach(n => {
        if (n.taskId === taskId) {
          n.isRead = true;
          n.cancelled = true;
        }
      });
    },

    /**
     * Check active state and dispatch reminders for upcoming blocks, bedtime & backlog
     */
    checkAndScheduleReminders: function(state) {
      if (!state) return;
      const today = DateService.todayString();
      const currentMin = DateService.timeToMinutes(DateService.currentTimeString());

      // 1. Upcoming study sessions for today (within 15 minutes of start time)
      const todaySessions = (state.studySessions || []).filter(s => s.date === today && s.status !== 'completed' && s.status !== 'missed');
      todaySessions.forEach(sess => {
        if (sess.startTime) {
          const sessStart = DateService.timeToMinutes(sess.startTime);
          const diff = sessStart - currentMin;
          if (diff > 0 && diff <= this.DEFAULT_LEAD_TIME_MINUTES) {
            this.dispatch(state, {
              taskId: sess.id,
              reminderType: 'study_session_upcoming',
              scheduledOccurrence: `${today}_${sess.startTime}`,
              title: `Upcoming Session in ${diff}m`,
              message: `${sess.title} (${sess.timeSlot}) starts soon. Prepare your study workspace.`,
              category: 'study'
            });
          }
        }
      });

      // 2. Bedtime warning at 22:30 (1350 minutes)
      if (currentMin >= 1350 && currentMin < 1365) {
        this.dispatch(state, {
          taskId: 'bedtime_alert',
          reminderType: 'sleep_protection',
          scheduledOccurrence: `${today}_bedtime`,
          title: '🌙 Bedtime in 15 Minutes (22:45)',
          message: 'Wind down your study session. Sleep schedule is strictly protected for memory consolidation.',
          category: 'health',
          priority: 'high'
        });
      }

      // 3. Spaced Revisions due today
      const dueRevs = (state.tasks || []).filter(t => t.isRevision && t.status !== 'completed' && (t.scheduledDate || t.dueDate) <= today);
      if (dueRevs.length > 0) {
        this.dispatch(state, {
          taskId: 'revisions_due',
          reminderType: 'revision_daily',
          scheduledOccurrence: `${today}_revs`,
          title: `🎯 ${dueRevs.length} Spaced Revisions Due Today`,
          message: `Active recall reviews pending for ${dueRevs.map(r => r.topic || r.title).slice(0, 2).join(', ')}...`,
          category: 'revision'
        });
      }

      // 4. Overdue carry-forward backlog reminder
      const overdueTasks = (state.tasks || []).filter(t => t.status === 'overdue');
      if (overdueTasks.length > 0) {
        this.dispatch(state, {
          taskId: 'carry_forward_alert',
          reminderType: 'carry_forward_daily',
          scheduledOccurrence: `${today}_carryforward`,
          title: `⚠️ ${overdueTasks.length} Carry-Forward Tasks Need Recovery`,
          message: 'Review recovery proposals to schedule missed work into sleep-safe slots.',
          category: 'recovery',
          priority: 'high'
        });
      }
    }
  };

  return NotificationService;
}));

