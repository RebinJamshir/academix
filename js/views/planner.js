/**
 * Academix - Study Planner Engine
 * Conforms to Part 7 & Part 19 of Master Product Specification
 */

window.PlannerView = {
  currentPlanDate: "2026-11-06",
  activeTab: "daily", // "daily" | "weekly" | "templates" | "missed"

  render: function(container) {
    const store = window.academicStore;
    const state = store.state;

    container.innerHTML = `
      <div class="flex flex-col w-full gap-4 animate-fade-in">
        
        <!-- Planner Top Bar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">KTU Planning Engine</span>
              <span class="badge badge-completed">S5 Timetable Synced</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1">Study Planner</h1>
            <p class="text-xs text-[var(--on-surface-variant)]">Structured daily loops, spaced recall, and timetable templates</p>
          </div>

          <div class="flex items-center gap-2">
            <button id="planner-regen-btn" class="btn-secondary h-9 px-3 text-xs font-mono">
              <span class="material-symbols-outlined text-[18px] text-[var(--primary)]">sync</span>
              <span>Regenerate Plan</span>
            </button>
            <button id="planner-add-block-btn" class="btn-primary h-9 px-3.5 text-xs">
              <span class="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create Study Block</span>
            </button>
          </div>
        </div>

        <!-- Planner Navigation Tabs -->
        <div class="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1">
          <div class="flex items-center gap-1">
            <button class="planner-tab-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.activeTab === 'daily' ? 'bg-white shadow-xs text-[var(--primary)] border border-[var(--border-subtle)]' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}" data-tab="daily">
              Daily Timeline
            </button>
            <button class="planner-tab-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.activeTab === 'weekly' ? 'bg-white shadow-xs text-[var(--primary)] border border-[var(--border-subtle)]' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}" data-tab="weekly">
              Weekly Overview
            </button>
            <button class="planner-tab-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.activeTab === 'templates' ? 'bg-white shadow-xs text-[var(--primary)] border border-[var(--border-subtle)]' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}" data-tab="templates">
              Timetable Templates
            </button>
            <button class="planner-tab-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.activeTab === 'missed' ? 'bg-white shadow-xs text-[var(--primary)] border border-[var(--border-subtle)]' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}" data-tab="missed">
              Missed Sessions (${this.getMissedSessionsCount()})
            </button>
          </div>

          <!-- Date Navigation for Daily View -->
          ${this.activeTab === 'daily' ? `
            <div class="flex items-center gap-1 text-xs font-mono">
              <button id="planner-prev-day" class="p-1 rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]">
                <span class="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <input type="date" id="planner-date-picker" value="${this.currentPlanDate}" class="input-base h-7 text-xs py-0 font-mono" />
              <button id="planner-next-day" class="p-1 rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]">
                <span class="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Active Tab Content Area -->
        <div id="planner-content-area" class="flex flex-col gap-4">
          ${this.renderActiveTabContent()}
        </div>

      </div>
    `;

    this.bindEvents(container);
  },

  renderActiveTabContent: function() {
    if (this.activeTab === "daily") return this.renderDailyTimeline();
    if (this.activeTab === "weekly") return this.renderWeeklyOverview();
    if (this.activeTab === "templates") return this.renderTimetableTemplates();
    if (this.activeTab === "missed") return this.renderMissedSessions();
    return "";
  },

  /* ------------------- DAILY TIMELINE ------------------- */

  renderDailyTimeline: function() {
    const store = window.academicStore;
    const state = store.state;
    const dateStr = this.currentPlanDate;
    const sessions = state.studySessions.filter(s => s.date === dateStr);

    let bannerHtml = "";
    if (dateStr === "2026-11-06" || dateStr === "2026-11-07") {
      bannerHtml = `
        <div class="p-3.5 rounded-lg border border-[var(--error)]/30 bg-[var(--error-container)]/10 text-xs text-[var(--on-surface)] flex items-start gap-2.5 mb-3">
          <span class="material-symbols-outlined text-[20px] text-[var(--error)] mt-0.5">event_busy</span>
          <div>
            <strong class="text-[var(--error)] font-semibold block mb-0.5">SKIPPED / MISSED SESSIONS (Re-allocated)</strong>
            <p class="text-[var(--on-surface-variant)] leading-relaxed">
              These blocks were skipped. The work has been re-added as <strong>11 EXTRA catch-up blocks</strong> across <strong>Sun 8 Nov to Fri 13 Nov</strong> so no S5 subject or backlog is dropped.
            </p>
          </div>
        </div>
      `;
    }

    let blocksHtml = "";
    if (sessions.length === 0) {
      blocksHtml = `
        <div class="layer-card p-8 text-center text-xs text-[var(--on-surface-variant)]">
          <span class="material-symbols-outlined text-3xl text-[var(--outline)] block mb-1">schedule</span>
          No study blocks scheduled for ${dateStr}.
          <div class="mt-2">
            <button class="btn-primary h-8 px-3 text-xs" onclick="window.App.openAddSessionModal('${dateStr}')">Create Study Block</button>
          </div>
        </div>
      `;
    } else {
      blocksHtml = sessions.map(sess => {
        const isDone = sess.status === "completed";
        const isMissed = sess.status === "missed";
        const isExtra = !!sess.isExtra;
        const sub = state.subjects.find(s => s.id === sess.subjectId);
        const subColor = sub ? sub.color : 'var(--primary)';
        const subBg = sub && sub.colorBg ? sub.colorBg : '#F5F3F5';
        const subBorder = sub && sub.colorBorder ? sub.colorBorder : '#E5E3DC';
        const subText = sub && sub.colorText ? sub.colorText : (sub ? sub.color : 'var(--on-surface)');

        let statusBadge = `<span class="badge ${isDone ? 'badge-completed' : 'badge-neutral'} text-[9px] mt-1">${isDone ? 'Completed' : sess.plannedMinutes + 'm'}</span>`;
        if (isMissed) {
          statusBadge = `<span class="badge badge-overdue text-[9px] mt-1 font-mono">Missed</span>`;
        } else if (isExtra) {
          statusBadge = `<span class="badge badge-urgent text-[9px] mt-1 font-mono">⚡ Extra</span>`;
        }

        return `
          <div class="layer-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-[var(--primary)] transition-all border-l-4" style="border-left-color: ${subColor}">
            <div class="flex items-start gap-3 min-w-0">
              <div class="flex flex-col items-center justify-center p-2 rounded w-24 text-center font-mono flex-shrink-0 border" style="background-color: ${subBg}; border-color: ${subBorder}; color: ${subText};">
                <span class="text-xs font-bold">${sess.startTime}</span>
                <span class="text-[10px] opacity-80">to ${sess.endTime}</span>
                ${statusBadge}
              </div>

              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style="background-color: ${subBg}; border-color: ${subBorder}; color: ${subText};">${sub ? sub.code : 'S5'}</span>
                  <span class="badge ${sess.activityType.includes('Practice') ? 'badge-pending' : 'badge-neutral'}">${sess.activityType}</span>
                  ${isExtra ? `<span class="badge badge-urgent text-[9px] font-mono">⚡ EXTRA Catch-Up (missed 6-7 Nov)</span>` : ''}
                </div>
                <h3 class="text-sm font-semibold text-[var(--on-surface)] mt-1 ${isDone ? 'line-through opacity-70' : ''}">${sess.title}</h3>
                <p class="text-xs text-[var(--on-surface-variant)] mt-0.5">${sess.topic}</p>
                ${sess.missedReason ? `<div class="text-[11px] text-[var(--error)] font-mono mt-1">${sess.missedReason}</div>` : ''}
                ${sess.notes ? `<div class="text-[11px] text-[var(--primary)] font-mono mt-1">Logged notes: ${sess.notes}</div>` : ''}
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
              ${isDone ? `
                <button class="btn-secondary h-8 px-2.5 text-xs font-mono" onclick="window.PlannerView.reopenSession('${sess.id}')">Re-open</button>
              ` : (isMissed ? `
                <span class="text-xs font-mono text-[var(--outline)] px-2 py-1 bg-[var(--surface-low)] rounded">Catch-up active on 8-13 Nov</span>
              ` : `
                <button class="btn-secondary h-8 px-2.5 text-xs font-mono" onclick="window.App.openRescheduleModal('${sess.id}')">Reschedule</button>
                <button class="btn-primary h-8 px-3 text-xs font-semibold" onclick="window.DashboardView.startFocusForSession('${sess.id}')">
                  <span class="material-symbols-outlined text-[16px]">play_arrow</span>
                  <span>Start Focus</span>
                </button>
              `)}
            </div>
          </div>
        `;
      }).join("");
    }

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div class="lg:col-span-8 flex flex-col gap-3">
          ${bannerHtml}
          <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <h3 class="text-sm font-semibold text-[var(--on-surface)]">Schedule for ${dateStr}</h3>
            <span class="font-mono text-xs text-[var(--on-surface-variant)]">${sessions.length} Scheduled Blocks</span>
          </div>
          ${blocksHtml}
        </div>

        <!-- Right Side: Study Block Guidelines (from PDF page 3) -->
        <div class="lg:col-span-4 layer-card p-4 flex flex-col gap-3">
          <div class="pb-2 border-b border-[var(--border-subtle)]">
            <span class="font-mono text-[11px] uppercase tracking-wider text-[var(--on-surface-variant)]">Methodology</span>
            <h3 class="text-sm font-semibold text-[var(--on-surface)]">The Active Study Loop</h3>
          </div>

          <div class="flex flex-col gap-2 text-xs text-[var(--on-surface-variant)] leading-relaxed">
            <div class="p-2 rounded bg-[var(--surface-low)]">
              <strong class="text-[var(--on-surface)] block mb-0.5">1. Pick one syllabus topic</strong>
              Define a measurable learning outcome.
            </div>
            <div class="p-2 rounded bg-[var(--surface-low)]">
              <strong class="text-[var(--on-surface)] block mb-0.5">2. Learn from notes & close</strong>
              Active recall: recall in your own words without reading.
            </div>
            <div class="p-2 rounded bg-[var(--surface-low)]">
              <strong class="text-[var(--on-surface)] block mb-0.5">3. Solve exam-style question</strong>
              Attempt under time without looking at the solutions.
            </div>
            <div class="p-2 rounded bg-[var(--surface-low)]">
              <strong class="text-[var(--on-surface)] block mb-0.5">4. Check, log mistake & retry</strong>
              Add difficult concepts to the Error Log & Flashcard deck.
            </div>
          </div>

          <div class="p-2.5 rounded bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-[var(--primary)] font-mono mt-1">
            <strong>Rule:</strong> Sleep is protected (22:45). Never cut sleep for study.
          </div>
        </div>
      </div>
    `;
  },

  /* ------------------- WEEKLY OVERVIEW ------------------- */

  renderWeeklyOverview: function() {
    const store = window.academicStore;
    const state = store.state;

    // Show 7 days starting from plan start date (6 Nov 2026)
    const dates = ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"];

    let daysHtml = dates.map(dStr => {
      const dObj = new Date(dStr + "T00:00:00");
      const dayName = dObj.toLocaleDateString("en-US", { weekday: "short" });
      const daySessions = state.studySessions.filter(s => s.date === dStr);

      return `
        <div class="layer-card p-3 flex flex-col gap-2">
          <div class="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)]">
            <span class="font-mono text-xs font-bold text-[var(--on-surface)]">${dayName} • ${dStr.slice(5)}</span>
            <span class="badge badge-neutral text-[10px]">${daySessions.length} blocks</span>
          </div>

          <div class="flex flex-col gap-1.5">
            ${
              daySessions.map(s => {
                const isDone = s.status === "completed";
                const sub = state.subjects.find(sub => sub.id === s.subjectId);
                const subColor = sub ? sub.color : 'var(--primary)';
                const subBg = sub && sub.colorBg ? sub.colorBg : '#F5F3F5';
                const subBorder = sub && sub.colorBorder ? sub.colorBorder : '#E5E3DC';
                const subText = sub && sub.colorText ? sub.colorText : (sub ? sub.color : 'var(--on-surface)');

                return `
                  <div class="p-1.5 rounded border text-[11px] border-l-2" style="background-color: ${subBg}; border-color: ${subBorder}; border-left-color: ${subColor};">
                    <div class="flex items-center justify-between text-[10px] font-mono">
                      <span class="font-bold" style="color: ${subText};">${sub ? sub.code : 'S5'}</span>
                      <span class="text-[var(--on-surface-variant)]">${s.startTime}</span>
                    </div>
                    <div class="truncate font-medium mt-0.5 text-[var(--on-surface)]">${s.title}</div>
                  </div>
                `;
              }).join("") || `<div class="text-[11px] text-[var(--on-surface-variant)] text-center py-2">Rest / Free</div>`
            }
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <h3 class="text-sm font-semibold text-[var(--on-surface)]">7-Day Study Cadence (Nov 6 – Nov 12)</h3>
          <span class="font-mono text-xs text-[var(--on-surface-variant)]">All 5 S5 + 3 Backlogs Rotated</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-7 gap-2">
          ${daysHtml}
        </div>
      </div>
    `;
  },

  /* ------------------- TIMETABLE TEMPLATES ------------------- */

  renderTimetableTemplates: function() {
    const templates = window.KTU_DATA.timetableTemplates;

    const renderTemplateCard = (tmpl) => `
      <div class="layer-card p-4 flex flex-col gap-3">
        <div class="pb-2 border-b border-[var(--border-subtle)]">
          <h3 class="text-sm font-semibold text-[var(--on-surface)]">${tmpl.title}</h3>
          <span class="font-mono text-[11px] text-[var(--on-surface-variant)]">${tmpl.note}</span>
        </div>
        <div class="flex flex-col gap-1.5">
          ${tmpl.blocks.map(b => `
            <div class="p-2 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <span class="font-mono text-[var(--primary)] font-semibold w-28">${b.time}</span>
              <span class="text-[var(--on-surface)] flex-1 truncate px-2">${b.activity}</span>
              <span class="badge ${b.type === 'study' ? 'badge-completed' : (b.type === 'rest' ? 'badge-neutral' : 'badge-pending')} text-[10px]">${b.duration}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    return `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        ${renderTemplateCard(templates.weekday)}
        ${renderTemplateCard(templates.saturday)}
        ${renderTemplateCard(templates.sunday)}
      </div>
    `;
  },

  /* ------------------- MISSED SESSIONS ------------------- */

  renderMissedSessions: function() {
    const store = window.academicStore;
    const state = store.state;

    // Filter sessions with date earlier than today that were not completed
    const todayStr = "2026-11-08";
    const missed = state.studySessions.filter(s => s.status === "missed" || (s.date < todayStr && s.status !== "completed"));

    if (missed.length === 0) {
      return `
        <div class="layer-card p-8 text-center text-xs text-[var(--on-surface-variant)]">
          <span class="material-symbols-outlined text-3xl text-[var(--primary)] block mb-1">verified</span>
          No missed sessions! All scheduled study blocks up to ${todayStr} are accounted for.
        </div>
      `;
    }

    return `
      <div class="layer-card p-4 flex flex-col gap-3">
        <div class="pb-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div>
            <h3 class="text-sm font-semibold text-[var(--on-surface)]">Missed / Skipped Study Blocks (6-7 Nov)</h3>
            <p class="text-xs text-[var(--on-surface-variant)]">All missed work is re-scheduled as 11 EXTRA blocks across 8–13 Nov</p>
          </div>
          <span class="badge badge-urgent">${missed.length} Slipped</span>
        </div>

        <div class="p-3 rounded-lg border border-[var(--primary)]/30 bg-[var(--surface-low)] text-xs text-[var(--on-surface)] flex items-center gap-2 mb-1">
          <span class="material-symbols-outlined text-[18px] text-[var(--primary)]">autorenew</span>
          <span><strong>Automatic Recovery Active:</strong> All 9 blocks from Fri 6 & Sat 7 Nov have been inserted as EXTRA blocks on Sun 8 – Fri 13 Nov.</span>
        </div>

        <div class="flex flex-col gap-2">
          ${missed.map(sess => `
            <div class="p-3 rounded border border-[var(--error)]/30 bg-[var(--error-container)]/10 flex items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="badge badge-urgent text-[10px]">Missed: ${sess.date}</span>
                  <span class="text-[10px] text-[var(--on-surface-variant)] font-mono">${sess.timeSlot}</span>
                </div>
                <div class="text-xs font-semibold text-[var(--on-surface)] mt-1">${sess.title}</div>
                <div class="text-[11px] text-[var(--on-surface-variant)] font-mono">${sess.plannedMinutes}m • ${sess.topic}</div>
                ${sess.missedReason ? `<div class="text-[10px] text-[var(--error)] font-mono mt-0.5">${sess.missedReason}</div>` : ''}
              </div>
              <span class="text-xs font-mono text-[var(--primary)] px-2.5 py-1 bg-white border border-[var(--border-subtle)] rounded shadow-xs shrink-0">
                Catch-Up Allocated
              </span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  },

  getMissedSessionsCount: function() {
    const store = window.academicStore;
    const todayStr = "2026-11-08";
    return store.state.studySessions.filter(s => s.status === "missed" || (s.date < todayStr && s.status !== "completed")).length;
  },

  bindEvents: function(container) {
    const self = this;

    // Tabs
    container.querySelectorAll(".planner-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        self.activeTab = btn.dataset.tab;
        self.render(container);
      });
    });

    // Date picker
    const picker = container.querySelector("#planner-date-picker");
    if (picker) {
      picker.addEventListener("change", (e) => {
        self.currentPlanDate = e.target.value;
        self.render(container);
      });
    }

    // Prev / Next day
    const prevDay = container.querySelector("#planner-prev-day");
    const nextDay = container.querySelector("#planner-next-day");
    if (prevDay) {
      prevDay.addEventListener("click", () => {
        const d = new Date(self.currentPlanDate + "T00:00:00");
        d.setDate(d.getDate() - 1);
        self.currentPlanDate = d.toISOString().split("T")[0];
        self.render(container);
      });
    }
    if (nextDay) {
      nextDay.addEventListener("click", () => {
        const d = new Date(self.currentPlanDate + "T00:00:00");
        d.setDate(d.getDate() + 1);
        self.currentPlanDate = d.toISOString().split("T")[0];
        self.render(container);
      });
    }

    // Create block
    const addBlockBtn = container.querySelector("#planner-add-block-btn");
    if (addBlockBtn) {
      addBlockBtn.addEventListener("click", () => {
        window.App.openAddSessionModal(self.currentPlanDate);
      });
    }

    // Regenerate Plan
    const regenBtn = container.querySelector("#planner-regen-btn");
    if (regenBtn) {
      regenBtn.addEventListener("click", () => {
        window.App.openPlanRegenModal();
      });
    }
  },

  reopenSession: function(sessionId) {
    const store = window.academicStore;
    const sess = store.state.studySessions.find(s => s.id === sessionId);
    if (sess) {
      sess.status = "scheduled";
      sess.actualMinutes = 0;
      store.saveState();
      window.App.showToast("Session reopened.");
      this.render(document.getElementById("main-content-view"));
    }
  }
};

