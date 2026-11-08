/**
 * Academix Smart Execution Engine - Date Service
 * Centralized Timezone-Aware Date & Time Operations (Asia/Kolkata)
 * Dual runtime: Browser (window.AcademixDateService) & Node.js (module.exports)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AcademixDateService = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TIMEZONE = 'Asia/Kolkata';

  function getKolkataParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const map = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = p.value;
    }
    return {
      year: parseInt(map.year, 10),
      month: parseInt(map.month, 10),
      day: parseInt(map.day, 10),
      hour: parseInt(map.hour, 10),
      minute: parseInt(map.minute, 10),
      second: parseInt(map.second, 10),
      dateStr: `${map.year}-${map.month}-${map.day}`,
      timeStr: `${map.hour}:${map.minute}`
    };
  }

  const DateService = {
    TIMEZONE,

    now: function() {
      return new Date();
    },

    todayString: function(anchorDate = null) {
      if (anchorDate) {
        if (typeof anchorDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) {
          return anchorDate;
        }
        return getKolkataParts(new Date(anchorDate)).dateStr;
      }
      return getKolkataParts(new Date()).dateStr;
    },

    currentTimeString: function() {
      return getKolkataParts(new Date()).timeStr;
    },

    parseDate: function(dateStr) {
      if (!dateStr) return null;
      const parts = dateStr.split('-');
      if (parts.length !== 3) return new Date(dateStr);
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      return new Date(y, m, d, 12, 0, 0); // Noon to avoid DST/midnight edge-cases
    },

    addDays: function(dateStr, days) {
      const d = this.parseDate(dateStr);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },

    diffInDays: function(dateStrA, dateStrB) {
      const da = this.parseDate(dateStrA);
      const db = this.parseDate(dateStrB);
      if (!da || !db) return 0;
      const msDiff = da.getTime() - db.getTime();
      return Math.round(msDiff / (1000 * 60 * 60 * 24));
    },

    isSameDay: function(dateStrA, dateStrB) {
      return dateStrA === dateStrB;
    },

    isPastDate: function(dateStr, today = null) {
      const todayStr = today || this.todayString();
      return dateStr < todayStr;
    },

    isTodayDate: function(dateStr, today = null) {
      const todayStr = today || this.todayString();
      return dateStr === todayStr;
    },

    isFutureDate: function(dateStr, today = null) {
      const todayStr = today || this.todayString();
      return dateStr > todayStr;
    },

    getDayOfWeek: function(dateStr) {
      const d = this.parseDate(dateStr);
      if (!d) return '';
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[d.getDay()];
    },

    isWeekend: function(dateStr) {
      const dow = this.getDayOfWeek(dateStr);
      return dow === 'Saturday' || dow === 'Sunday';
    },

    formatDisplayDate: function(dateStr) {
      const d = this.parseDate(dateStr);
      if (!d) return dateStr || '';
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    },

    timeToMinutes: function(timeStr) {
      if (!timeStr) return 0;
      const parts = timeStr.split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
    },

    minutesToTime: function(minutes) {
      const h = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  };

  return DateService;
}));

