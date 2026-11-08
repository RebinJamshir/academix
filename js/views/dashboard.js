/**
 * Academix - Dashboard View (Calendar-First Control Centre)
 * Conforms to Part 3 of Master Product Specification
 */

window.DashboardView = {
  currentCalDate: new Date(2026, 10, 6), // November 6, 2026
  selectedDateStr: "2026-11-06",
  calendarMode: "month", // "month" | "week" | "day"

  render: function(container) {
    const store = window.academicStore;
    const state = store.state;
    const kpis = store.getOverallKPIs();

    // Greeting based on current time
    const hour = new Date().getHours();
    let greeting = "Good morning";
    if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17) greeting = "Good evening";

    const nextExamStr = kpis.nextExam
      ? `${kpis.nextExam.subjectName} (${kpis.nextExam.daysLeft}d left)`
      : "No upcoming exams";

    container.innerHTML = `
      <div class="flex flex-col w-full gap-5 animate-fade-in">
        
        <!-- Dashboard Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[var(--primary)] inline-block"></span>
              <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">KTU S5 Academic Session • Scheme 2024</span>
              <span class="badge badge-neutral">Week 01 of Exam Prep</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1">
              ${greeting}, ${state.profile.name}
            </h1>
            <p class="text-xs text-[var(--on-surface-variant)] mt-0.5">
              ${this.formatFullDate(new Date())} • Priority: <strong class="text-[var(--on-surface)]">${nextExamStr}</strong>
            </p>
          </div>
          
          <div class="flex items-center gap-2">
            <button id="dash-quick-add-btn" class="btn-secondary h-9 px-3 text-xs">
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Quick Add Task</span>
            </button>
            <button id="dash-start-focus-btn" class="btn-primary h-9 px-3.5 text-xs">
              <span class="material-symbols-outlined text-[18px]">play_circle</span>
              <span>Start Focus Session</span>
            </button>
          </div>
        </div>

        <!-- Carry-Forward Backlog Banner (if overdue tasks exist) -->
        ${kpis.overdueTasksCount > 0 ? `
          <div class="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-lowest)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-7 h-7 rounded bg-[var(--error)]/10 text-[var(--error)] flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-[17px]">history_toggle_off</span>
              </span>
              <div>
                <span class="font-semibold text-[var(--on-surface)]">Carry-Forward Backlog: ${kpis.overdueTasksCount} unfinished study tasks</span>
                <span class="text-[11px] text-[var(--on-surface-variant)] block">Syllabus work preserved from earlier dates. Propose sleep-safe recovery slots.</span>
              </div>
            </div>
            <a href="#/tasks?filter=overdue" class="btn-primary h-7 px-3 text-xs font-mono flex items-center gap-1 self-start sm:self-center">
              <span>Review Recovery</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </div>
        ` : ''}

        <!-- Metric KPI Cards (4 Cards) -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <!-- Card 1: Overall Preparation -->
          <div class="layer-card p-3.5 flex flex-col justify-between cursor-pointer hover:border-[var(--primary)] transition-colors group" onclick="window.location.hash = '#/subjects'">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase">Overall Prep</span>
              <span class="material-symbols-outlined text-[18px] text-[var(--primary)]">auto_stories</span>
            </div>
            <div class="my-2">
              <div class="text-2xl font-semibold text-[var(--on-surface)] tracking-tight leading-none">${kpis.overallPrep}%</div>
              <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden mt-2">
                <div class="bg-[var(--primary)] h-full rounded-full" style="width: ${kpis.overallPrep}%;"></div>
              </div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-[var(--on-surface-variant)] font-mono">
              <span>${kpis.activeSubjectsCount} Active Subjects</span>
              <span class="text-[var(--primary)] font-medium group-hover:underline">View Subjects →</span>
            </div>
          </div>

          <!-- Card 2: Tasks Completed -->
          <div class="layer-card p-3.5 flex flex-col justify-between cursor-pointer hover:border-[var(--primary)] transition-colors group" onclick="window.location.hash = '#/tasks?filter=completed'">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase">Tasks Completed</span>
              <span class="material-symbols-outlined text-[18px] text-[var(--primary)]">check_circle</span>
            </div>
            <div class="my-2">
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-semibold text-[var(--on-surface)] tracking-tight leading-none">${kpis.completedTasks}</span>
                <span class="text-xs text-[var(--on-surface-variant)] font-mono">/ ${kpis.totalTasks} total</span>
              </div>
              <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden mt-2">
                <div class="bg-[var(--primary)] h-full rounded-full" style="width: ${kpis.taskCompletionRate}%;"></div>
              </div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-[var(--on-surface-variant)] font-mono">
              <span>${kpis.taskCompletionRate}% done</span>
              <span class="text-[var(--primary)] font-medium group-hover:underline">View Tasks →</span>
            </div>
          </div>

          <!-- Card 3: Study Hours -->
          <div class="layer-card p-3.5 flex flex-col justify-between cursor-pointer hover:border-[var(--secondary)] transition-colors group" onclick="window.location.hash = '#/analytics'">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase">Study Hours (Week)</span>
              <span class="material-symbols-outlined text-[18px] text-[var(--secondary)]">timer</span>
            </div>
            <div class="my-2">
              <div class="flex items-baseline gap-1">
                <span class="text-2xl font-semibold text-[var(--on-surface)] tracking-tight leading-none">${kpis.weekActualHours}</span>
                <span class="text-xs font-normal text-[var(--on-surface-variant)]">hrs</span>
              </div>
              <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden mt-2">
                <div class="bg-[var(--secondary)] h-full rounded-full" style="width: ${Math.min(100, Math.round((kpis.weekActualHours / 28) * 100))}%;"></div>
              </div>
            </div>
            <div class="flex items-center justify-between text-[11px] text-[var(--on-surface-variant)] font-mono">
              <span>Target: 28.0h / wk</span>
              <span class="text-[var(--secondary)] font-medium group-hover:underline">Analytics →</span>
            </div>
          </div>

          <!-- Card 4: Upcoming Examination -->
          <div class="layer-card p-3.5 flex flex-col justify-between cursor-pointer hover:border-[var(--error)] transition-colors group" onclick="window.location.hash = '#/examinations'">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase">Next Exam</span>
              <span class="material-symbols-outlined text-[18px] text-[var(--error)]">assignment_late</span>
            </div>
            <div class="my-2">
              ${kpis.nextExam ? `
                <div class="flex items-baseline gap-1.5">
                  <span class="text-2xl font-semibold text-[var(--error)] tracking-tight leading-none">${kpis.nextExam.daysLeft}</span>
                  <span class="text-xs font-semibold text-[var(--error)]">Days</span>
                  <span class="badge badge-urgent ml-1 text-[10px]">T-${kpis.nextExam.daysLeft}D</span>
                </div>
                <div class="text-xs font-medium text-[var(--on-surface)] truncate mt-1">
                  ${kpis.nextExam.subjectName} (${kpis.nextExam.subjectCode})
                </div>
              ` : `
                <div class="text-sm font-medium text-[var(--on-surface-variant)]">No active countdown</div>
              `}
            </div>
            <div class="flex items-center justify-between text-[11px] text-[var(--on-surface-variant)] font-mono">
              <span>${kpis.nextExam ? kpis.nextExam.examDate : 'Dates TBD'}</span>
              <span class="text-[var(--error)] font-medium group-hover:underline">Exam Plan →</span>
            </div>
          </div>
        </div>

        <!-- Main Middle Grid: Large Calendar Widget & Contextual Date Panel -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <!-- Large Interactive Calendar (7 Cols on LG) -->
          <div class="lg:col-span-8 layer-card p-4 flex flex-col">
            <!-- Calendar Navigation Header -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-2 border-b border-[var(--border-subtle)]">
              <div class="flex items-center gap-2">
                <h2 id="dash-cal-title" class="text-base font-semibold text-[var(--on-surface)] tracking-tight">
                  ${this.getMonthName(this.currentCalDate)} ${this.currentCalDate.getFullYear()}
                </h2>
                <span class="badge badge-neutral" id="dash-cal-session-count">S5 Sessions</span>
              </div>

              <!-- Controls: Month/Week/Day & Arrows -->
              <div class="flex items-center gap-2">
                <div class="flex items-center bg-[var(--surface-low)] p-0.5 rounded-md border border-[var(--border-subtle)]">
                  <button class="dash-view-btn px-2.5 py-1 text-xs rounded font-medium ${this.calendarMode === 'month' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="month">Month</button>
                  <button class="dash-view-btn px-2.5 py-1 text-xs rounded font-medium ${this.calendarMode === 'week' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="week">Week</button>
                  <button class="dash-view-btn px-2.5 py-1 text-xs rounded font-medium ${this.calendarMode === 'day' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="day">Agenda</button>
                </div>
                
                <button id="dash-cal-today-btn" class="btn-secondary h-7 px-2.5 text-xs font-mono">Today</button>

                <div class="flex items-center">
                  <button id="dash-cal-prev-btn" class="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]">
                    <span class="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button id="dash-cal-next-btn" class="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]">
                    <span class="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Calendar Container Mounted -->
            <div id="dash-calendar-mount"></div>

            <!-- Calendar Legend -->
            <div class="flex flex-wrap items-center justify-between gap-2 pt-3 mt-2 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--on-surface-variant)]">
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--primary)]"></span> Completed Study</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--secondary)]"></span> Review / Practice</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--tertiary)]"></span> In Progress</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-[var(--error)]"></span> Exam Day</span>
              </div>
              <button class="text-[var(--primary)] hover:underline" onclick="window.location.hash = '#/calendar'">Open Full Calendar →</button>
            </div>
          </div>

          <!-- Contextual Selected Date Agenda Panel (4 Cols on LG) -->
          <div class="lg:col-span-4 layer-card p-4 flex flex-col justify-between" id="dash-selected-date-panel">
            <!-- Populated via renderSelectedDateAgenda() -->
          </div>

        </div>

        <!-- Lower Section: Today's Detailed Schedule & Weekly Progress Chart -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <!-- Today's Chronological Schedule (7 Cols) -->
          <div class="lg:col-span-7 layer-card p-4 flex flex-col">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 class="text-sm font-semibold text-[var(--on-surface)] tracking-tight">Today's Schedule</h3>
                <p class="text-xs text-[var(--on-surface-variant)]">Chronological KTU study blocks & deliverables</p>
              </div>
              <button class="btn-ghost text-xs text-[var(--primary)] font-medium" onclick="window.location.hash = '#/planner'">
                Study Planner →
              </button>
            </div>

            <div class="flex flex-col gap-2 mt-3" id="dash-today-schedule-list">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- Weekly Planned vs Actual Study Hours Chart (5 Cols) -->
          <div class="lg:col-span-5 layer-card p-4 flex flex-col">
            <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div>
                <h3 class="text-sm font-semibold text-[var(--on-surface)] tracking-tight">Study Time: Planned vs Actual</h3>
                <p class="text-xs text-[var(--on-surface-variant)]">Daily study volume in hours</p>
              </div>
              <div class="flex items-center gap-2 font-mono text-[11px] text-[var(--on-surface-variant)]">
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-[var(--primary)]"></span> Actual</span>
                <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-xs bg-[var(--surface-high)]"></span> Plan</span>
              </div>
            </div>

            <div class="flex flex-col flex-1 justify-between pt-3" id="dash-weekly-chart-box">
              <!-- Dynamically rendered bar chart -->
            </div>

            <!-- Micro insight -->
            <div class="p-2.5 bg-[var(--surface-low)] rounded-md border border-[var(--border-subtle)] mt-3 text-xs flex items-center justify-between">
              <span class="text-[var(--on-surface-variant)]">Optimal consistency window:</span>
              <strong class="font-mono text-[var(--primary)]">18:30 – 21:30 Main Block</strong>
            </div>
          </div>

        </div>

        <!-- Bottom Rows: Subject Progress Overview & Upcoming Tasks -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <!-- Subject Progress Overview (7 Cols) -->
          <div class="lg:col-span-7 layer-card p-4 flex flex-col">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 class="text-sm font-semibold text-[var(--on-surface)] tracking-tight">Active Subjects & Modules</h3>
                <p class="text-xs text-[var(--on-surface-variant)]">Syllabus completion calculated from topic checklists</p>
              </div>
              <button class="btn-ghost text-xs text-[var(--primary)] font-medium" onclick="window.location.hash = '#/subjects'">
                All 14 Subjects →
              </button>
            </div>

            <div class="flex flex-col gap-2 mt-3" id="dash-subject-rows">
              <!-- Dynamically populated subject rows -->
            </div>
          </div>

          <!-- Upcoming Next 5 Pending Tasks (5 Cols) -->
          <div class="lg:col-span-5 layer-card p-4 flex flex-col">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 class="text-sm font-semibold text-[var(--on-surface)] tracking-tight">Upcoming Priority Tasks</h3>
                <p class="text-xs text-[var(--on-surface-variant)]">Next practice tasks and deliverables</p>
              </div>
              <button class="btn-ghost text-xs text-[var(--primary)] font-medium" onclick="window.location.hash = '#/tasks'">
                View All Tasks →
              </button>
            </div>

            <div class="flex flex-col gap-2 mt-3" id="dash-upcoming-tasks-list">
              <!-- Dynamically populated -->
            </div>
          </div>

        </div>

      </div>
    `;

    // Attach listeners and mount components
    this.bindEvents(container);
    this.renderCalendarGrid();
    this.renderSelectedDateAgenda();
    this.renderTodaySchedule();
    this.renderWeeklyChart();
    this.renderSubjectRows();
    this.renderUpcomingTasks();
  },

  bindEvents: function(container) {
    const self = this;

    // View toggles (month, week, day)
    container.querySelectorAll(".dash-view-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        self.calendarMode = btn.dataset.mode;
        self.render(container);
      });
    });

    // Month Navigation
    const prevBtn = container.querySelector("#dash-cal-prev-btn");
    const nextBtn = container.querySelector("#dash-cal-next-btn");
    const todayBtn = container.querySelector("#dash-cal-today-btn");

    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        self.currentCalDate.setMonth(self.currentCalDate.getMonth() - 1);
        self.renderCalendarGrid();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        self.currentCalDate.setMonth(self.currentCalDate.getMonth() + 1);
        self.renderCalendarGrid();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener("click", () => {
        self.currentCalDate = new Date();
        self.selectedDateStr = self.formatDateIso(new Date());
        self.renderCalendarGrid();
        self.renderSelectedDateAgenda();
      });
    }

    // Quick Add button
    const quickAddBtn = container.querySelector("#dash-quick-add-btn");
    if (quickAddBtn) {
      quickAddBtn.addEventListener("click", () => {
        if (window.App && window.App.openQuickAddModal) {
          window.App.openQuickAddModal();
        }
      });
    }

    // Start Focus button
    const startFocusBtn = container.querySelector("#dash-start-focus-btn");
    if (startFocusBtn) {
      startFocusBtn.addEventListener("click", () => {
        window.location.hash = "#/focus";
      });
    }
  },

  /* ------------------- CALENDAR RENDERING ------------------- */

  renderCalendarGrid: function() {
    const mount = document.getElementById("dash-calendar-mount");
    const title = document.getElementById("dash-cal-title");
    if (!mount) return;

    if (title) {
      title.textContent = `${this.getMonthName(this.currentCalDate)} ${this.currentCalDate.getFullYear()}`;
    }

    const year = this.currentCalDate.getFullYear();
    const month = this.currentCalDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Monday-first offset (KTU timetable standard)
    const startOffset = (firstDay === 0 ? 6 : firstDay - 1);

    const store = window.academicStore;
    const state = store.state;

    let html = `
      <div class="grid grid-cols-7 gap-1 text-center py-1 bg-[var(--surface-low)] rounded font-mono text-[11px] text-[var(--on-surface-variant)] mb-1">
        <span>MO</span><span>TU</span><span>WE</span><span>TH</span><span>FR</span><span>SA</span><span>SU</span>
      </div>
      <div class="grid grid-cols-7 gap-1" id="dash-cal-grid-cells">
    `;

    // 1. Previous month trailing days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      html += `
        <div class="h-14 p-1 rounded bg-[var(--surface-low)]/40 text-[var(--outline-variant)] font-mono text-xs flex flex-col items-center justify-start opacity-50">
          <span>${dayNum}</span>
        </div>
      `;
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSelected = dateStr === this.selectedDateStr;
      const isToday = dateStr === this.formatDateIso(new Date());

      // Find sessions & exams on this date
      const sessions = state.studySessions.filter(s => s.date === dateStr);
      const exams = state.examinations.filter(e => e.examDate === dateStr);

      let dotsHtml = "";
      if (exams.length > 0) {
        dotsHtml += `<span class="w-2 h-2 rounded-full bg-[var(--error)] ring-1 ring-white" title="Exam: ${exams[0].subjectName} (${exams[0].subjectCode})"></span>`;
      }
      sessions.slice(0, 3).forEach(s => {
        const sub = state.subjects.find(sub => sub.id === s.subjectId);
        const dotBg = sub ? sub.color : 'var(--primary)';
        dotsHtml += `<span class="w-1.5 h-1.5 rounded-full" style="background-color: ${dotBg}" title="${sub ? sub.code : 'S5'}: ${s.title}"></span>`;
      });
      if (sessions.length > 3) {
        dotsHtml += `<span class="text-[9px] font-mono text-[var(--on-surface-variant)]">+${sessions.length - 3}</span>`;
      }

      html += `
        <div class="h-14 p-1 rounded border border-[var(--border-subtle)] cursor-pointer transition-all flex flex-col justify-between ${
          isSelected ? 'bg-[#EBF3EF] border-[var(--primary)] ring-1 ring-[var(--primary)]' : 'bg-white hover:bg-[var(--surface-low)]'
        } ${isToday ? 'font-bold' : ''}" data-date="${dateStr}" onclick="window.DashboardView.onDateClicked('${dateStr}')">
          <div class="flex items-center justify-between w-full">
            <span class="font-mono text-xs ${isSelected ? 'text-[var(--primary)] font-bold' : 'text-[var(--on-surface)]'}">${d}</span>
            ${isToday ? `<span class="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"></span>` : ''}
          </div>
          <div class="flex items-center gap-0.5 flex-wrap mt-auto">
            ${dotsHtml}
          </div>
        </div>
      `;
    }

    // 3. Next month leading days to complete grid
    const totalRendered = startOffset + daysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      html += `
        <div class="h-14 p-1 rounded bg-[var(--surface-low)]/40 text-[var(--outline-variant)] font-mono text-xs flex flex-col items-center justify-start opacity-50">
          <span>${j}</span>
        </div>
      `;
    }

    html += `</div>`;
    mount.innerHTML = html;
  },

  onDateClicked: function(dateStr) {
    this.selectedDateStr = dateStr;
    this.renderCalendarGrid();
    this.renderSelectedDateAgenda();
  },

  /* ------------------- SELECTED DATE AGENDAS ------------------- */

  renderSelectedDateAgenda: function() {
    const panel = document.getElementById("dash-selected-date-panel");
    if (!panel) return;

    const store = window.academicStore;
    const state = store.state;
    const dateObj = new Date(this.selectedDateStr + "T00:00:00");

    const sessions = state.studySessions.filter(s => s.date === this.selectedDateStr);
    const tasks = state.tasks.filter(t => t.dueDate === this.selectedDateStr);
    const exams = state.examinations.filter(e => e.examDate === this.selectedDateStr);

    const totalPlannedMins = sessions.reduce((acc, s) => acc + (s.plannedMinutes || 0), 0);
    const totalActualMins = sessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
    const plannedHrs = (totalPlannedMins / 60).toFixed(1);
    const actualHrs = (totalActualMins / 60).toFixed(1);

    let itemsHtml = "";

    if (exams.length > 0) {
      exams.forEach(ex => {
        itemsHtml += `
          <div class="p-2.5 rounded bg-[var(--error-container)]/30 border border-[var(--error)]/40 flex items-start gap-2">
            <span class="material-symbols-outlined text-[18px] text-[var(--error)] flex-shrink-0 mt-0.5">assignment_late</span>
            <div class="min-w-0">
              <span class="badge badge-urgent text-[10px]">EXAM DAY</span>
              <div class="font-semibold text-xs text-[var(--on-surface)] mt-0.5">${ex.subjectName} (${ex.subjectCode})</div>
              <div class="text-[11px] text-[var(--on-surface-variant)]">${ex.confidenceNote}</div>
            </div>
          </div>
        `;
      });
    }

    if (sessions.length === 0 && tasks.length === 0 && exams.length === 0) {
      itemsHtml += `
        <div class="p-4 text-center text-xs text-[var(--on-surface-variant)] bg-[var(--surface-low)] rounded border border-[var(--border-subtle)]">
          <span class="material-symbols-outlined text-2xl text-[var(--outline)] block mb-1">event_available</span>
          No study blocks or deliverables recorded for this date.
        </div>
      `;
    } else {
      sessions.forEach(sess => {
        const sub = state.subjects.find(s => s.id === sess.subjectId);
        const isDone = sess.status === "completed";
        const isMissed = sess.status === "missed";
        const isExtra = !!sess.isExtra;
        const subColor = sub ? sub.color : 'var(--primary)';
        const subBg = sub && sub.colorBg ? sub.colorBg : '#F5F3F5';
        const subBorder = sub && sub.colorBorder ? sub.colorBorder : '#E5E3DC';
        const subText = sub && sub.colorText ? sub.colorText : (sub ? sub.color : 'var(--on-surface)');

        let statusBadge = `<span class="badge ${isDone ? 'badge-completed' : 'badge-pending'}">${isDone ? 'Done (' + sess.actualMinutes + 'm)' : sess.plannedMinutes + 'm plan'}</span>`;
        if (isMissed) {
          statusBadge = `<span class="badge badge-overdue text-[9px]">Missed</span>`;
        } else if (isExtra) {
          statusBadge = `<span class="badge badge-urgent text-[9px]">⚡ Catch-Up</span>`;
        }

        itemsHtml += `
          <div class="p-2.5 rounded border border-[var(--border-subtle)] bg-white flex flex-col gap-1.5 transition-all hover:border-[var(--border-moderate)] border-l-4" style="border-left-color: ${subColor}">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style="background-color: ${subBg}; border-color: ${subBorder}; color: ${subText};">${sub ? sub.code : 'S5'}</span>
                <span class="font-mono text-[11px] text-[var(--on-surface-variant)]">${sess.startTime} - ${sess.endTime}</span>
                ${isExtra ? `<span class="text-[9px] font-bold px-1 py-0.2 rounded bg-[var(--error-container)]/30 text-[var(--error)] font-mono">EXTRA</span>` : ''}
              </div>
              ${statusBadge}
            </div>
            <div class="text-xs font-medium text-[var(--on-surface)] leading-snug ${isDone ? 'line-through opacity-70' : ''}">
              ${sess.title}
            </div>
            ${sess.missedReason ? `<div class="text-[10px] text-[var(--error)] font-mono">${sess.missedReason}</div>` : ''}
            <div class="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]/40 text-[11px]">
              <span class="text-[var(--on-surface-variant)] truncate">${sess.activityType}</span>
              ${!isMissed ? `
                <button class="text-[var(--primary)] font-mono hover:underline font-semibold" onclick="window.DashboardView.startFocusForSession('${sess.id}')">
                  ${isDone ? 'Review' : 'Start Focus →'}
                </button>
              ` : `
                <span class="text-[10px] text-[var(--outline)] font-mono">Rescheduled to 8-13 Nov</span>
              `}
            </div>
          </div>
        `;
      });
    }

    panel.innerHTML = `
      <div class="flex flex-col gap-3">
        <!-- Date Header -->
        <div class="flex items-start justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div>
            <span class="font-mono text-[11px] uppercase tracking-wider text-[var(--on-surface-variant)]">Selected Agenda</span>
            <h3 class="text-sm font-semibold text-[var(--on-surface)]">${this.formatFullDate(dateObj)}</h3>
            <span class="text-xs text-[var(--on-surface-variant)] font-mono">Planned: ${plannedHrs}h • Logged: ${actualHrs}h</span>
          </div>
          <button class="btn-primary h-7 px-2 text-xs" onclick="window.App.openAddSessionModal('${this.selectedDateStr}')">
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Add</span>
          </button>
        </div>

        <!-- Agenda Items Scroll Area -->
        <div class="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
          ${itemsHtml}
        </div>
      </div>

      <div class="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
        <span class="text-[var(--on-surface-variant)]">KTU S5 Calendar</span>
        <button class="text-[var(--primary)] hover:underline" onclick="window.location.hash = '#/planner'">Go to Study Planner →</button>
      </div>
    `;
  },

  /* ------------------- TODAY'S CHRONOLOGICAL SCHEDULE ------------------- */

  renderTodaySchedule: function() {
    const list = document.getElementById("dash-today-schedule-list");
    if (!list) return;

    const store = window.academicStore;
    const todayStr = "2026-11-06"; // Defaulting to first timetable plan date for rich view
    const sessions = store.state.studySessions.filter(s => s.date === todayStr);

    if (sessions.length === 0) {
      list.innerHTML = `<div class="p-4 text-center text-xs text-[var(--on-surface-variant)]">No sessions scheduled for today.</div>`;
      return;
    }

    let html = "";
    sessions.forEach(sess => {
      const isDone = sess.status === "completed";
      const sub = store.state.subjects.find(s => s.id === sess.subjectId);

      const subColor = sub ? sub.color : 'var(--primary)';
      const subBg = sub && sub.colorBg ? sub.colorBg : '#F5F3F5';
      const subBorder = sub && sub.colorBorder ? sub.colorBorder : '#E5E3DC';
      const subText = sub && sub.colorText ? sub.colorText : (sub ? sub.color : 'var(--on-surface)');

      html += `
        <div class="p-3 rounded-lg border border-[var(--border-subtle)] bg-white flex items-center justify-between gap-3 hover:border-[var(--border-moderate)] transition-colors border-l-4" style="border-left-color: ${subColor}">
          <div class="flex items-center gap-3 min-w-0">
            <button class="w-5 h-5 rounded border ${isDone ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--border-moderate)] bg-white hover:border-[var(--primary)]'} flex items-center justify-center flex-shrink-0 cursor-pointer" onclick="window.DashboardView.toggleSessionDone('${sess.id}')">
              <span class="material-symbols-outlined text-[14px] ${isDone ? 'opacity-100' : 'opacity-0'}">check</span>
            </button>
            
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style="background-color: ${subBg}; border-color: ${subBorder}; color: ${subText};">${sub ? sub.code : 'S5'}</span>
                <span class="font-mono text-xs text-[var(--on-surface-variant)]">${sess.startTime} - ${sess.endTime} (${sess.plannedMinutes}m)</span>
                <span class="badge ${sess.activityType.includes('Practice') ? 'badge-pending' : 'badge-neutral'}">${sess.activityType}</span>
              </div>
              <div class="text-xs font-semibold text-[var(--on-surface)] truncate mt-1 ${isDone ? 'line-through opacity-70' : ''}">
                ${sess.title}
              </div>
              <div class="text-[11px] text-[var(--on-surface-variant)] truncate mt-0.5">
                ${sess.topic}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <button class="btn-ghost h-7 px-2 text-xs text-[var(--primary)] font-mono" onclick="window.DashboardView.startFocusForSession('${sess.id}')">
              <span class="material-symbols-outlined text-[16px]">play_arrow</span>
              <span>Focus</span>
            </button>
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  },

  /* ------------------- WEEKLY STUDY HOURS BAR CHART ------------------- */

  renderWeeklyChart: function() {
    const box = document.getElementById("dash-weekly-chart-box");
    if (!box) return;

    // Days Mon-Sun study data for Week 1 (from PDF timetable)
    const weekData = [
      { day: "Mon", planned: 3.5, actual: 3.2, date: "2026-11-02" },
      { day: "Tue", planned: 3.5, actual: 3.5, date: "2026-11-03" },
      { day: "Wed", planned: 3.5, actual: 3.0, date: "2026-11-04" },
      { day: "Thu", planned: 3.5, actual: 2.8, date: "2026-11-05" },
      { day: "Fri", planned: 3.5, actual: 3.6, date: "2026-11-06", active: true },
      { day: "Sat", planned: 6.5, actual: 6.5, date: "2026-11-07" },
      { day: "Sun", planned: 5.5, actual: 5.5, date: "2026-11-08" }
    ];

    const maxHours = 7.0;

    let barsHtml = `
      <div class="h-32 w-full flex items-end justify-between px-2 gap-2 pt-4 pb-1 border-b border-[var(--border-subtle)]">
    `;

    weekData.forEach(item => {
      const plannedHeight = Math.round((item.planned / maxHours) * 100);
      const actualHeight = Math.round((item.actual / maxHours) * 100);

      barsHtml += `
        <div class="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer" title="${item.day}: ${item.actual}h actual / ${item.planned}h planned">
          <div class="w-full flex items-end justify-center gap-1 h-full">
            <div class="w-2.5 rounded-t bg-[var(--surface-high)]" style="height: ${plannedHeight}%;"></div>
            <div class="w-2.5 rounded-t bg-[var(--primary)] ${item.active ? 'ring-1 ring-[var(--primary-container)]' : ''}" style="height: ${actualHeight}%;"></div>
          </div>
          <span class="font-mono text-[11px] mt-2 ${item.active ? 'text-[var(--primary)] font-bold' : 'text-[var(--on-surface-variant)]'}">${item.day}</span>
        </div>
      `;
    });

    barsHtml += `</div>`;
    box.innerHTML = barsHtml;
  },

  /* ------------------- SUBJECT PROGRESS OVERVIEW ------------------- */

  renderSubjectRows: function() {
    const container = document.getElementById("dash-subject-rows");
    if (!container) return;

    const store = window.academicStore;
    const subjects = store.state.subjects.slice(0, 5); // Show first 5 S5 priorities

    let html = "";
    subjects.forEach(sub => {
      const exam = store.state.examinations.find(e => e.subjectId === sub.id);
      const daysBadge = exam && exam.daysLeft !== null
        ? `<span class="badge badge-exam text-[10px]">T-${exam.daysLeft}D</span>`
        : `<span class="badge badge-neutral text-[10px]">TBD</span>`;

      html += `
        <div class="p-2.5 rounded border border-[var(--border-subtle)] bg-white flex items-center justify-between gap-3 hover:border-[var(--primary)] cursor-pointer transition-colors" onclick="window.location.hash = '#/subjects/${sub.id}'">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-2 h-2 rounded-full" style="background-color: ${sub.color};"></span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="badge badge-neutral text-[10px]">${sub.code}</span>
                <span class="text-xs font-semibold text-[var(--on-surface)] truncate">${sub.name}</span>
              </div>
              <span class="text-[11px] text-[var(--on-surface-variant)] font-mono">${sub.category} • ${sub.completedModulesCount || 0} / 4 Modules complete</span>
            </div>
          </div>

          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="hidden sm:flex flex-col items-end w-24">
              <span class="font-mono text-xs font-semibold text-[var(--primary)]">${sub.syllabusProgress || 0}%</span>
              <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden mt-1">
                <div class="bg-[var(--primary)] h-full rounded-full" style="width: ${sub.syllabusProgress || 0}%;"></div>
              </div>
            </div>
            ${daysBadge}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /* ------------------- UPCOMING TASKS ------------------- */

  renderUpcomingTasks: function() {
    const container = document.getElementById("dash-upcoming-tasks-list");
    if (!container) return;

    const store = window.academicStore;
    const pendingTasks = store.state.tasks.filter(t => t.status !== "completed").slice(0, 5);

    if (pendingTasks.length === 0) {
      container.innerHTML = `<div class="p-3 text-center text-xs text-[var(--on-surface-variant)]">No pending tasks. Great job!</div>`;
      return;
    }

    let html = "";
    pendingTasks.forEach(task => {
      const sub = store.state.subjects.find(s => s.id === task.subjectId);
      const isOverdue = task.status === "overdue";

      html += `
        <div class="p-2.5 rounded border border-[var(--border-subtle)] bg-white flex items-center justify-between gap-2 hover:border-[var(--border-moderate)] transition-colors">
          <div class="flex items-center gap-2.5 min-w-0">
            <input type="checkbox" class="w-4 h-4 rounded border-[var(--border-moderate)] text-[var(--primary)] cursor-pointer" onclick="window.DashboardView.toggleTaskDone('${task.id}')" />
            <div class="min-w-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="badge ${isOverdue ? 'badge-urgent' : 'badge-neutral'} text-[10px]">${isOverdue ? 'OVERDUE' : (sub ? sub.code : 'TASK')}</span>
                <span class="text-xs font-medium text-[var(--on-surface)] truncate">${task.title}</span>
              </div>
              <span class="text-[11px] text-[var(--on-surface-variant)] font-mono">Due: ${task.dueDate} • ${task.priority} Priority</span>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  /* ------------------- ACTION HANDLERS ------------------- */

  toggleSessionDone: function(sessionId) {
    const store = window.academicStore;
    const sess = store.state.studySessions.find(s => s.id === sessionId);
    if (!sess) return;

    if (sess.status === "completed") {
      sess.status = "scheduled";
      sess.actualMinutes = 0;
      store.saveState();
      window.App.showToast("Study block marked pending.");
    } else {
      store.completeStudySession(sessionId, sess.plannedMinutes, "Logged from Dashboard");
      window.App.showToast(`Completed! Logged ${sess.plannedMinutes}m study time.`);
    }
    this.render(document.getElementById("main-content-view"));
  },

  toggleTaskDone: function(taskId) {
    window.academicStore.toggleTaskCompleted(taskId);
    window.App.showToast("Task completed (+study progress updated)");
    this.render(document.getElementById("main-content-view"));
  },

  startFocusForSession: function(sessionId) {
    const sess = window.academicStore.state.studySessions.find(s => s.id === sessionId);
    if (sess && window.FocusView) {
      window.FocusView.loadSession(sess);
    }
    window.location.hash = "#/focus";
  },

  /* ------------------- HELPERS ------------------- */

  getMonthName: function(date) {
    return date.toLocaleString("default", { month: "long" });
  },

  formatFullDate: function(date) {
    return date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  },

  formatDateIso: function(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
};

