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
    }
  };

  return NotificationService;
}));
