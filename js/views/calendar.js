/**
 * Academix - Calendar System
 * Conforms to Part 4 of Master Product Specification
 */

window.CalendarView = {
  currentDate: new Date(2026, 10, 8), // Synced to today: November 8, 2026
  selectedDateStr: "2026-11-08",
  viewMode: "month", // "month" | "week" | "day" | "agenda"
  filterCategory: "all",
  filterSubject: "all",
  _userSelectedDate: false,

  getTodayDateStr: function() {
    return window.AcademixDateService ? window.AcademixDateService.todayString() : "2026-11-08";
  },

  render: function(container) {
    const store = window.academicStore;
    const state = store.state;

    if (!this._userSelectedDate) {
      this.selectedDateStr = this.getTodayDateStr();
      this.currentDate = window.AcademixDateService ? window.AcademixDateService.parseDate(this.selectedDateStr) : new Date(2026, 10, 8);
    }

    container.innerHTML = `
      <div class="flex flex-col w-full gap-4 animate-fade-in">
        
        <!-- Top Toolbar & Navigation -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-3">
            <div>
              <span class="font-mono text-[11px] uppercase tracking-wider text-[var(--on-surface-variant)]">Academic Master Schedule</span>
              <h1 class="text-xl font-semibold tracking-tight text-[var(--on-surface)]" id="cal-view-heading">
                ${this.getHeaderTitle()}
              </h1>
            </div>
            <div class="flex items-center gap-1 bg-[var(--surface-low)] p-0.5 rounded border border-[var(--border-subtle)]">
              <button id="cal-prev-btn" class="w-7 h-7 flex items-center justify-center rounded hover:bg-white text-[var(--on-surface-variant)]">
                <span class="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button id="cal-today-btn" class="px-2 h-7 text-xs font-mono font-medium hover:bg-white rounded text-[var(--on-surface)]">Today</button>
              <button id="cal-next-btn" class="w-7 h-7 flex items-center justify-center rounded hover:bg-white text-[var(--on-surface-variant)]">
                <span class="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          <!-- View Switcher & Actions -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- View Tabs -->
            <div class="flex items-center bg-[var(--surface-low)] p-0.5 rounded-md border border-[var(--border-subtle)]">
              <button class="cal-mode-btn px-2.5 py-1 text-xs rounded font-medium ${this.viewMode === 'month' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="month">Month</button>
              <button class="cal-mode-btn px-2.5 py-1 text-xs rounded font-medium ${this.viewMode === 'week' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="week">Week</button>
              <button class="cal-mode-btn px-2.5 py-1 text-xs rounded font-medium ${this.viewMode === 'day' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="day">Day</button>
              <button class="cal-mode-btn px-2.5 py-1 text-xs rounded font-medium ${this.viewMode === 'agenda' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="agenda">Agenda</button>
            </div>

            <!-- Subject Filter -->
            <select id="cal-filter-subject" class="input-base h-8 text-xs py-0">
              <option value="all">All Subjects</option>
              ${state.subjects.map(s => `<option value="${s.id}" ${this.filterSubject === s.id ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join("")}
            </select>

            <!-- Add Event Button -->
            <button id="cal-add-event-btn" class="btn-primary h-8 px-3 text-xs">
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>New Block</span>
            </button>
          </div>
        </div>

        <!-- Main Calendar Viewport + Contextual Right Inspector -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <!-- View Area (8 Cols on LG) -->
          <div class="lg:col-span-8 layer-card p-4 flex flex-col min-h-[560px]" id="cal-main-viewport">
            <!-- Rendered based on viewMode -->
          </div>

          <!-- Contextual Date Inspector (4 Cols on LG) -->
          <div class="lg:col-span-4 layer-card p-4 flex flex-col justify-between" id="cal-inspector-panel">
            <!-- Populated via renderInspector() -->
          </div>

        </div>

      </div>
    `;

    this.bindEvents(container);
    this.renderCurrentView();
    this.renderInspector();
  },

  bindEvents: function(container) {
    const self = this;

    // View mode switching
    container.querySelectorAll(".cal-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        self.viewMode = btn.dataset.mode;
        self.render(container);
      });
    });

    // Subject Filter
    const filterSub = container.querySelector("#cal-filter-subject");
    if (filterSub) {
      filterSub.addEventListener("change", (e) => {
        self.filterSubject = e.target.value;
        self.renderCurrentView();
        self.renderInspector();
      });
    }

    // Previous / Next / Today
    const prevBtn = container.querySelector("#cal-prev-btn");
    const nextBtn = container.querySelector("#cal-next-btn");
    const todayBtn = container.querySelector("#cal-today-btn");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (self.viewMode === "month") self.currentDate.setMonth(self.currentDate.getMonth() - 1);
        else if (self.viewMode === "week") self.currentDate.setDate(self.currentDate.getDate() - 7);
        else self.currentDate.setDate(self.currentDate.getDate() - 1);
        self.render(container);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (self.viewMode === "month") self.currentDate.setMonth(self.currentDate.getMonth() + 1);
        else if (self.viewMode === "week") self.currentDate.setDate(self.currentDate.getDate() + 7);
        else self.currentDate.setDate(self.currentDate.getDate() + 1);
        self.render(container);
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener("click", () => {
        self._userSelectedDate = false;
        self.selectedDateStr = self.getTodayDateStr();
        self.currentDate = window.AcademixDateService ? window.AcademixDateService.parseDate(self.selectedDateStr) : new Date(2026, 10, 8);
        self.render(container);
      });
    }

    // Add Event Modal
    const addBtn = container.querySelector("#cal-add-event-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        window.App.openAddSessionModal(self.selectedDateStr);
      });
    }
  },

  renderCurrentView: function() {
    const viewport = document.getElementById("cal-main-viewport");
    if (!viewport) return;

    if (this.viewMode === "month") {
      this.renderMonthView(viewport);
    } else if (this.viewMode === "week") {
      this.renderWeekView(viewport);
    } else if (this.viewMode === "day") {
      this.renderDayView(viewport);
    } else if (this.viewMode === "agenda") {
      this.renderAgendaView(viewport);
    }
  },

  /* ------------------- MONTH VIEW ------------------- */

  renderMonthView: function(viewport) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const startOffset = (firstDay === 0 ? 6 : firstDay - 1);

    const store = window.academicStore;
    const state = store.state;

    let html = `
      <div class="grid grid-cols-7 gap-1 text-center py-1.5 bg-[var(--surface-low)] rounded font-mono text-[11px] text-[var(--on-surface-variant)] mb-2 font-semibold">
        <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
      </div>
      <div class="grid grid-cols-7 gap-1 flex-1">
    `;

    // Trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      html += `
        <div class="min-h-[76px] p-1.5 rounded bg-[var(--surface-low)]/40 text-[var(--outline-variant)] font-mono text-xs opacity-50">
          ${daysInPrevMonth - i}
        </div>
      `;
    }

    // Active month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSelected = dateStr === this.selectedDateStr;
      const isToday = dateStr === this.getTodayDateStr();

      // Filter events
      let sessions = state.studySessions.filter(s => s.date === dateStr);
      let exams = state.examinations.filter(e => e.examDate === dateStr);

      if (this.filterSubject !== "all") {
        sessions = sessions.filter(s => s.subjectId === this.filterSubject);
        exams = exams.filter(e => e.subjectId === this.filterSubject);
      }

      let badgesHtml = "";
      if (exams.length > 0) {
        badgesHtml += `
          <div class="text-[9px] font-bold w-full truncate px-1 py-0.5 rounded border border-red-300 bg-red-50 text-red-700 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
            <span>EXAM: ${exams[0].subjectCode}</span>
          </div>
        `;
      }
      sessions.slice(0, 2).forEach(s => {
        const sub = state.subjects.find(sub => sub.id === s.subjectId);
        const code = sub ? sub.code : "S5";
        const isDone = s.status === "completed";
        const bg = sub && sub.colorBg ? sub.colorBg : "#F5F3F5";
        const border = sub && sub.colorBorder ? sub.colorBorder : "#E5E3DC";
        const textClr = sub && sub.colorText ? sub.colorText : (sub ? sub.color : "var(--on-surface)");
        badgesHtml += `
          <div class="text-[9px] font-medium w-full truncate px-1 py-0.5 rounded border flex items-center gap-1" style="background-color: ${bg}; border-color: ${border}; color: ${textClr};" title="${code}: ${s.title}">
            <span class="w-1 h-1 rounded-full shrink-0" style="background-color: ${sub ? sub.color : 'var(--primary)'}"></span>
            <span class="truncate">${code}: ${s.title}</span>
          </div>
        `;
      });
      if (sessions.length > 2) {
        badgesHtml += `<span class="text-[9px] font-mono text-[var(--on-surface-variant)] px-0.5">+${sessions.length - 2} more</span>`;
      }

      html += `
        <div class="min-h-[76px] p-1.5 rounded border border-[var(--border-subtle)] cursor-pointer transition-all flex flex-col justify-between ${
          isSelected ? 'bg-[#EBF3EF] border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'bg-white hover:bg-[var(--surface-low)]'
        }" onclick="window.CalendarView.selectDate('${dateStr}')">
          <div class="flex items-center justify-between w-full">
            <span class="font-mono text-xs ${isSelected ? 'font-bold text-[var(--primary)]' : 'text-[var(--on-surface)]'}">${d}</span>
            ${isToday ? `<span class="badge badge-completed text-[9px] px-1 py-0">Today</span>` : ''}
          </div>
          <div class="flex flex-col gap-0.5 mt-1 overflow-hidden">
            ${badgesHtml}
          </div>
        </div>
      `;
    }

    // Remaining days to finish grid
    const totalRendered = startOffset + daysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      html += `
        <div class="min-h-[76px] p-1.5 rounded bg-[var(--surface-low)]/40 text-[var(--outline-variant)] font-mono text-xs opacity-50">
          ${j}
        </div>
      `;
    }

    html += `</div>`;
    viewport.innerHTML = html;
  },

  /* ------------------- WEEK VIEW (Hourly Timeline Grid) ------------------- */

  renderWeekView: function(viewport) {
    const store = window.academicStore;
    const state = store.state;

    // Calculate Week Range (Mon to Sun)
    const base = new Date(this.currentDate);
    const day = base.getDay();
    const diff = base.getDate() - day + (day === 0 ? -6 : 1);
    base.setDate(diff);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      weekDays.push(d);
    }

    let headerHtml = `<div class="grid grid-cols-7 gap-1 text-center py-1.5 bg-[var(--surface-low)] rounded font-mono text-[11px] mb-2 font-semibold">`;
    weekDays.forEach(d => {
      const dateStr = this.formatDateIso(d);
      const isSelected = dateStr === this.selectedDateStr;
      headerHtml += `
        <div class="cursor-pointer ${isSelected ? 'text-[var(--primary)] font-bold' : 'text-[var(--on-surface-variant)]'}" onclick="window.CalendarView.selectDate('${dateStr}')">
          ${d.toLocaleDateString("en-US", { weekday: "short" })} ${d.getDate()}
        </div>
      `;
    });
    headerHtml += `</div>`;

    let columnsHtml = `<div class="grid grid-cols-7 gap-1 flex-1">`;
    weekDays.forEach(d => {
      const dateStr = this.formatDateIso(d);
      const isSelected = dateStr === this.selectedDateStr;

      let sessions = state.studySessions.filter(s => s.date === dateStr);
      let exams = state.examinations.filter(e => e.examDate === dateStr);
      if (this.filterSubject !== "all") {
        sessions = sessions.filter(s => s.subjectId === this.filterSubject);
        exams = exams.filter(e => e.subjectId === this.filterSubject);
      }

      let blocksHtml = "";
      if (exams.length > 0) {
        blocksHtml += `
          <div class="p-1.5 rounded bg-[var(--error-container)]/40 border border-[var(--error)] text-[10px] font-mono text-[var(--error)] font-bold">
            EXAM: ${exams[0].subjectCode}
          </div>
        `;
      }

      sessions.forEach(s => {
        const isDone = s.status === "completed";
        const sub = state.subjects.find(sub => sub.id === s.subjectId);
        blocksHtml += `
          <div class="p-1.5 rounded border border-[var(--border-subtle)] text-[11px] flex flex-col justify-between ${
            isDone ? 'bg-[#E7F2EC] border-[#CFE3D8]' : 'bg-white'
          }">
            <div class="flex items-center justify-between text-[10px] font-mono">
              <span class="font-bold text-[var(--primary)]">${sub ? sub.code : 'S5'}</span>
              <span class="text-[var(--on-surface-variant)]">${s.startTime}</span>
            </div>
            <div class="font-medium text-[var(--on-surface)] truncate mt-0.5 leading-tight">${s.title}</div>
            <div class="text-[10px] text-[var(--on-surface-variant)] font-mono mt-1">${s.plannedMinutes}m plan</div>
          </div>
        `;
      });

      columnsHtml += `
        <div class="min-h-[420px] p-1.5 rounded border border-[var(--border-subtle)] flex flex-col gap-1.5 ${
          isSelected ? 'bg-[#F4F9F6] border-[var(--primary)]' : 'bg-[var(--surface-low)]/50'
        }" onclick="window.CalendarView.selectDate('${dateStr}')">
          ${blocksHtml || `<div class="text-[10px] text-[var(--outline-variant)] text-center py-4 font-mono">No blocks</div>`}
        </div>
      `;
    });
    columnsHtml += `</div>`;

    viewport.innerHTML = headerHtml + columnsHtml;
  },

  /* ------------------- DAY VIEW (Hourly Chronological Blocks) ------------------- */

  renderDayView: function(viewport) {
    const store = window.academicStore;
    const state = store.state;
    const dateStr = this.selectedDateStr;
    const dateObj = new Date(dateStr + "T00:00:00");

    let sessions = state.studySessions.filter(s => s.date === dateStr);
    let exams = state.examinations.filter(e => e.examDate === dateStr);

    if (this.filterSubject !== "all") {
      sessions = sessions.filter(s => s.subjectId === this.filterSubject);
      exams = exams.filter(e => e.subjectId === this.filterSubject);
    }

    let itemsHtml = "";
    if (exams.length > 0) {
      exams.forEach(ex => {
        itemsHtml += `
          <div class="p-3 rounded-lg bg-[var(--error-container)]/30 border border-[var(--error)] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-[var(--error)]">assignment_late</span>
              <div>
                <span class="badge badge-urgent">EXAMINATION DAY</span>
                <div class="font-semibold text-sm text-[var(--on-surface)]">${ex.subjectName} (${ex.subjectCode})</div>
                <div class="text-xs text-[var(--on-surface-variant)] font-mono">${ex.confidenceNote}</div>
              </div>
            </div>
            <button class="btn-secondary h-8 px-2 text-xs font-mono" onclick="window.location.hash = '#/examinations'">Details</button>
          </div>
        `;
      });
    }

    if (sessions.length === 0) {
      itemsHtml += `<div class="p-8 text-center text-xs text-[var(--on-surface-variant)]">No scheduled study blocks on this date.</div>`;
    } else {
      sessions.forEach(sess => {
        const isDone = sess.status === "completed";
        const sub = state.subjects.find(s => s.id === sess.subjectId);

        const subColor = sub ? sub.color : 'var(--primary)';
        const subBg = sub && sub.colorBg ? sub.colorBg : '#F5F3F5';
        const subBorder = sub && sub.colorBorder ? sub.colorBorder : '#E5E3DC';
        const subText = sub && sub.colorText ? sub.colorText : (sub ? sub.color : 'var(--on-surface)');

        itemsHtml += `
          <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-l-4" style="border-left-color: ${subColor}">
            <div class="flex items-start gap-3">
              <div class="flex flex-col items-center justify-center p-2 rounded w-20 flex-shrink-0 text-center font-mono border" style="background-color: ${subBg}; border-color: ${subBorder}; color: ${subText};">
                <span class="text-xs font-bold">${sess.startTime}</span>
                <span class="text-[10px] opacity-80">to ${sess.endTime}</span>
              </div>
              <div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style="background-color: ${subBg}; border-color: ${subBorder}; color: ${subText};">${sub ? sub.code : 'S5'}</span>
                  <span class="badge ${isDone ? 'badge-completed' : 'badge-pending'}">${sess.activityType}</span>
                  ${sess.isRecoveryBlock ? `<span class="badge badge-completed font-mono text-[10px]">⚡ Recovery Block</span>` : ''}
                  <span class="text-xs text-[var(--on-surface-variant)] font-mono">${sess.plannedMinutes} min</span>
                </div>
                <h4 class="text-sm font-semibold text-[var(--on-surface)] mt-1 ${isDone ? 'line-through opacity-70' : ''}">${sess.title}</h4>
                <p class="text-xs text-[var(--on-surface-variant)] mt-0.5">${sess.topic}</p>
                ${sess.notes ? `<div class="text-[11px] text-[var(--primary)] mt-1 font-mono">Note: ${sess.notes}</div>` : ''}
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <button class="btn-secondary h-8 px-2.5 text-xs font-mono" onclick="window.App.openRescheduleModal('${sess.id}')">Reschedule</button>
              <button class="btn-primary h-8 px-3 text-xs" onclick="window.DashboardView.startFocusForSession('${sess.id}')">
                <span class="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>Focus</span>
              </button>
            </div>
          </div>
        `;
      });
    }

    viewport.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <h3 class="text-base font-semibold text-[var(--on-surface)]">${this.formatFullDate(dateObj)}</h3>
          <span class="font-mono text-xs text-[var(--on-surface-variant)]">${sessions.length} Study Blocks</span>
        </div>
        <div class="flex flex-col gap-2.5">
          ${itemsHtml}
        </div>
      </div>
    `;
  },

  /* ------------------- AGENDA VIEW ------------------- */

  renderAgendaView: function(viewport) {
    const store = window.academicStore;
    const state = store.state;

    // Sort upcoming sessions from selected date
    let upcoming = state.studySessions
      .filter(s => s.date >= this.selectedDateStr)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    if (this.filterSubject !== "all") {
      upcoming = upcoming.filter(s => s.subjectId === this.filterSubject);
    }

    let html = `
      <div class="flex flex-col gap-3">
        <div class="pb-2 border-b border-[var(--border-subtle)]">
          <h3 class="text-sm font-semibold text-[var(--on-surface)]">Upcoming Agenda Timeline</h3>
          <p class="text-xs text-[var(--on-surface-variant)]">Chronological schedule starting from ${this.selectedDateStr}</p>
        </div>
        <div class="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
    `;

    if (upcoming.length === 0) {
      html += `<div class="p-6 text-center text-xs text-[var(--on-surface-variant)]">No sessions ahead in current schedule.</div>`;
    } else {
      upcoming.slice(0, 15).forEach(s => {
        const sub = state.subjects.find(sub => sub.id === s.subjectId);
        const isDone = s.status === "completed";

        html += `
          <div class="p-3 rounded border border-[var(--border-subtle)] bg-white flex items-center justify-between gap-3 hover:border-[var(--border-moderate)] transition-colors">
            <div class="flex items-center gap-3 min-w-0">
              <div class="font-mono text-xs text-[var(--primary)] font-semibold w-24 flex-shrink-0">
                ${s.date}
                <div class="text-[10px] text-[var(--on-surface-variant)] font-normal">${s.startTime}</div>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="badge badge-neutral">${sub ? sub.code : 'S5'}</span>
                  <span class="badge ${isDone ? 'badge-completed' : 'badge-pending'}">${s.activityType}</span>
                </div>
                <div class="text-xs font-semibold text-[var(--on-surface)] truncate mt-0.5 ${isDone ? 'line-through opacity-70' : ''}">
                  ${s.title}
                </div>
              </div>
            </div>
            <button class="btn-ghost text-xs text-[var(--primary)] font-mono flex-shrink-0" onclick="window.DashboardView.startFocusForSession('${s.id}')">
              Focus →
            </button>
          </div>
        `;
      });
    }

    html += `</div></div>`;
    viewport.innerHTML = html;
  },

  /* ------------------- CONTEXTUAL INSPECTOR ------------------- */

  renderInspector: function() {
    const panel = document.getElementById("cal-inspector-panel");
    if (!panel) return;

    const store = window.academicStore;
    const state = store.state;
    const dateObj = new Date(this.selectedDateStr + "T00:00:00");

    const sessions = state.studySessions.filter(s => s.date === this.selectedDateStr);
    const exams = state.examinations.filter(e => e.examDate === this.selectedDateStr);

    const plannedMins = sessions.reduce((acc, s) => acc + (s.plannedMinutes || 0), 0);
    const actualMins = sessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

    panel.innerHTML = `
      <div class="flex flex-col gap-3">
        <div class="pb-2 border-b border-[var(--border-subtle)] flex items-start justify-between">
          <div>
            <span class="font-mono text-[11px] uppercase tracking-wider text-[var(--on-surface-variant)]">Inspector</span>
            <h3 class="text-sm font-semibold text-[var(--on-surface)]">${this.formatFullDate(dateObj)}</h3>
          </div>
          <button class="btn-primary h-7 px-2 text-xs" onclick="window.App.openAddSessionModal('${this.selectedDateStr}')">
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Add Event</span>
          </button>
        </div>

        <!-- Metric strip -->
        <div class="grid grid-cols-2 gap-2">
          <div class="p-2 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col">
            <span class="font-mono text-[10px] text-[var(--on-surface-variant)]">PLANNED TIME</span>
            <span class="font-mono text-base font-semibold text-[var(--on-surface)] mt-0.5">${(plannedMins / 60).toFixed(1)}h</span>
            <span class="text-[10px] text-[var(--on-surface-variant)]">${sessions.length} study blocks</span>
          </div>
          <div class="p-2 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col">
            <span class="font-mono text-[10px] text-[var(--on-surface-variant)]">RECORDED TIME</span>
            <span class="font-mono text-base font-semibold text-[var(--primary)] mt-0.5">${(actualMins / 60).toFixed(1)}h</span>
            <span class="text-[10px] text-[var(--on-surface-variant)]">${sessions.filter(s => s.status === 'completed').length} completed</span>
          </div>
        </div>

        <!-- Schedule breakdown -->
        <div class="flex flex-col gap-2 pt-1 max-h-[300px] overflow-y-auto">
          <span class="font-mono text-[11px] uppercase tracking-wider text-[var(--on-surface-variant)]">Timeline Activities</span>
          ${
            sessions.map(s => {
              const sub = state.subjects.find(sub => sub.id === s.subjectId);
              return `
                <div class="p-2 rounded bg-white border border-[var(--border-subtle)] flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1">
                      <span class="badge badge-neutral text-[9px]">${sub ? sub.code : 'S5'}</span>
                      <span class="font-mono text-[10px] text-[var(--on-surface-variant)]">${s.startTime} - ${s.endTime}</span>
                    </div>
                    <div class="text-xs font-medium text-[var(--on-surface)] truncate mt-1">${s.title}</div>
                  </div>
                  <button class="btn-ghost text-[10px] text-[var(--primary)] font-mono p-1" onclick="window.DashboardView.startFocusForSession('${s.id}')">Start</button>
                </div>
              `;
            }).join("") || `<div class="text-xs text-[var(--on-surface-variant)] p-2 bg-[var(--surface-low)] rounded text-center">No events on this day.</div>`
          }
        </div>
      </div>

      <div class="pt-3 border-t border-[var(--border-subtle)]">
        <button class="btn-secondary w-full text-xs font-mono py-1.5" onclick="window.App.openPlanRegenModal()">
          <span class="material-symbols-outlined text-[16px]">sync</span>
          <span>Regenerate Study Plan</span>
        </button>
      </div>
    `;
  },

  selectDate: function(dateStr) {
    this._userSelectedDate = true;
    this.selectedDateStr = dateStr;
    this.renderCurrentView();
    this.renderInspector();
  },

  /* ------------------- HELPERS ------------------- */

  getHeaderTitle: function() {
    if (this.viewMode === "month") {
      return `${this.currentDate.toLocaleString("default", { month: "long" })} ${this.currentDate.getFullYear()}`;
    } else if (this.viewMode === "week") {
      return `Week View: ${this.currentDate.toLocaleString("default", { month: "short" })} ${this.currentDate.getFullYear()}`;
    } else if (this.viewMode === "day") {
      return `Day Schedule: ${this.formatFullDate(new Date(this.selectedDateStr + "T00:00:00"))}`;
    }
    return `Agenda: November 2026`;
  },

  formatFullDate: function(date) {
    return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  },

  formatDateIso: function(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
};

