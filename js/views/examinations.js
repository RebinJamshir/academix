/**
 * Academix - Examination Management System
 * Conforms to Part 8 of Master Product Specification
 */

window.ExaminationsView = {
  currentTab: "upcoming", // "upcoming" | "provisional" | "tbd" | "completed"
  expandedExamId: "exam-cn",

  render: function(container) {
    const store = window.academicStore;
    const state = store.state;
    store.recalculateAll();

    let filtered = state.examinations.filter(ex => {
      if (this.currentTab === "tbd") return ex.examDateStatus === "tbd";
      if (this.currentTab === "completed") return ex.isPast;
      if (this.currentTab === "provisional") return ex.examDateStatus === "provisional";
      return !ex.isPast; // upcoming
    });

    // Sort upcoming by days remaining
    filtered.sort((a, b) => {
      if (a.daysLeft === null) return 1;
      if (b.daysLeft === null) return -1;
      return a.daysLeft - b.daysLeft;
    });

    container.innerHTML = `
      <div class="flex flex-col w-full gap-4 animate-fade-in">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">KTU S5 & Backlog Examinations</span>
              <span class="badge badge-urgent">Nov 23 – Jan 12</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1">Examination Management</h1>
            <p class="text-xs text-[var(--on-surface-variant)]">Dynamic countdowns, 15-point readiness checklists & provisional date tracking</p>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn-primary h-9 px-3 text-xs font-mono" id="exam-ai-audit-btn" onclick="window.ExaminationsView.triggerAIAudit()">
              <span class="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>AI Readiness Audit</span>
            </button>
            <button class="btn-secondary h-9 px-3 text-xs font-mono" onclick="window.App.openPlanRegenModal()">
              <span class="material-symbols-outlined text-[18px]">sync</span>
              <span>Regenerate Study Plan</span>
            </button>
          </div>
        </div>

        <!-- Honest Warning Banner from PDF Page 1 -->
        <div class="p-3.5 rounded-lg border border-[var(--error)]/30 bg-[var(--error-container)]/20 flex items-start gap-3">
          <span class="material-symbols-outlined text-[20px] text-[var(--error)] flex-shrink-0 mt-0.5">warning</span>
          <div class="text-xs text-[var(--on-surface)] leading-relaxed">
            <strong class="text-[var(--error)] font-semibold">High Density Warning (23 Nov - 7 Dec):</strong>
            You have 8 exams in 15 days, and 30 Nov - 5 Dec has six exams in six consecutive days (DSA, ML, Java, MC, DELD, then PE-2 on Dec 7).
            Finish all preparation for these 8 subjects before Sat 28 Nov so only exam-eve revision remains.
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-b border-[var(--border-subtle)]">
          <button class="exam-tab-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.currentTab === 'upcoming' ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border-subtle)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}" data-tab="upcoming">
            Upcoming Exams (${state.examinations.filter(e => !e.isPast).length})
          </button>
          <button class="exam-tab-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.currentTab === 'provisional' ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border-subtle)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}" data-tab="provisional">
            Provisional Dates (${state.examinations.filter(e => e.examDateStatus === 'provisional').length})
          </button>
          <button class="exam-tab-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.currentTab === 'tbd' ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border-subtle)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}" data-tab="tbd">
            Date TBD (1)
          </button>
          <button class="exam-tab-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.currentTab === 'completed' ? 'bg-[var(--primary)] text-white' : 'bg-white border border-[var(--border-subtle)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}" data-tab="completed">
            Completed (0)
          </button>
        </div>

        <!-- Examinations List -->
        <div class="flex flex-col gap-3">
          ${filtered.map(ex => this.renderExamCard(ex)).join("")}
        </div>

      </div>
    `;

    this.bindEvents(container);
  },

  renderExamCard: function(exam) {
    const isExpanded = this.expandedExamId === exam.id;
    const isTBD = exam.examDateStatus === "tbd";
    const prepPercent = exam.preparationPercent || 0;
    const store = window.academicStore;
    const sub = store.state.subjects.find(s => s.id === exam.subjectId);
    const subColor = sub ? sub.color : 'var(--primary)';
    const subBg = sub && sub.colorBg ? sub.colorBg : '#F5F3F5';
    const subBorder = sub && sub.colorBorder ? sub.colorBorder : '#E5E3DC';
    const subText = sub && sub.colorText ? sub.colorText : (sub ? sub.color : 'var(--on-surface)');

    return `
      <div class="layer-card p-4 flex flex-col gap-3 hover:border-[var(--border-moderate)] transition-colors border-l-4" style="border-left-color: ${subColor}">
        
        <!-- Header row -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div class="flex items-start gap-3 min-w-0">
            <div class="flex flex-col items-center justify-center p-2.5 rounded bg-[var(--surface-low)] w-24 text-center font-mono flex-shrink-0">
              ${isTBD ? `
                <span class="text-xs font-bold text-[var(--on-surface-variant)]">DATE TBD</span>
                <span class="text-[10px] text-[var(--on-surface-variant)] mt-0.5">Target: Jan 5</span>
              ` : `
                <span class="text-xs text-[var(--on-surface-variant)]">Countdown</span>
                <span class="text-xl font-bold ${exam.daysLeft <= 20 ? 'text-[var(--error)]' : 'text-[var(--primary)]'}">${exam.daysLeft}d</span>
                <span class="text-[10px] text-[var(--on-surface-variant)] font-bold">T-${exam.daysLeft}D</span>
              `}
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold px-2 py-0.5 rounded border font-mono" style="background-color: ${subBg}; border-color: ${subBorder}; color: ${subText};">${exam.subjectCode}</span>
                <span class="badge badge-neutral">${exam.semester}</span>
                <span class="badge ${isTBD ? 'badge-pending' : 'badge-exam'}">${exam.examDateStatus.toUpperCase()}</span>
                <span class="font-mono text-xs text-[var(--on-surface-variant)]">Date: ${exam.examDate || 'Safe Target Jan 5'}</span>
              </div>
              <h2 class="text-base font-semibold text-[var(--on-surface)] mt-1">${exam.subjectName}</h2>
              <p class="text-xs text-[var(--on-surface-variant)] mt-0.5 font-mono">${exam.confidenceNote}</p>
            </div>
          </div>

          <div class="flex items-center gap-3 flex-shrink-0 self-end md:self-center">
            <div class="flex flex-col items-end">
              <span class="font-mono text-xs font-semibold text-[var(--primary)]">${prepPercent}% Readiness</span>
              <span class="text-[10px] text-[var(--on-surface-variant)] font-mono">${exam.completedChecklistItems || 0} of 15 check items</span>
            </div>

            <button class="btn-secondary h-8 px-2.5 text-xs font-mono" onclick="window.App.openEditExamDateModal('${exam.id}')">
              <span class="material-symbols-outlined text-[16px]">edit_calendar</span>
              <span>Change Date</span>
            </button>
            <button class="btn-ghost h-8 w-8 text-[var(--on-surface)]" onclick="window.ExaminationsView.toggleExpand('${exam.id}')">
              <span class="material-symbols-outlined text-[20px]">${isExpanded ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
        </div>

        <!-- 15-Point Preparation Checklist (Expanded View) -->
        ${isExpanded ? `
          <div class="flex flex-col gap-2 pt-1 animate-fade-in">
            <div class="flex items-center justify-between text-xs font-mono text-[var(--on-surface-variant)] pb-1 border-b border-[var(--border-subtle)]">
              <span>15-Point Comprehensive Examination Preparation Protocol</span>
              <span>${exam.completedChecklistItems} / 15 verified</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              ${exam.checklist.map(item => `
                <label class="p-2.5 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex items-start gap-2.5 cursor-pointer hover:bg-white transition-colors">
                  <input type="checkbox" class="w-4 h-4 rounded border-[var(--border-moderate)] text-[var(--primary)] mt-0.5 cursor-pointer" ${item.done ? 'checked' : ''} onchange="window.ExaminationsView.toggleChecklistItem('${exam.id}', '${item.id}')" />
                  <span class="text-xs text-[var(--on-surface)] leading-snug ${item.done ? 'line-through opacity-70' : ''}">${item.label}</span>
                </label>
              `).join("")}
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs font-mono">
              <span class="text-[var(--on-surface-variant)]">Exam Eve Revision Target: ${exam.eveRevisionDate || 'TBD'}</span>
              <button class="text-[var(--primary)] hover:underline" onclick="window.location.hash = '#/subjects/${exam.subjectId}'">Go to Subject Workspace →</button>
            </div>
          </div>
        ` : `
          <div class="flex items-center justify-between text-xs font-mono text-[var(--on-surface-variant)] cursor-pointer" onclick="window.ExaminationsView.toggleExpand('${exam.id}')">
            <span>Click to inspect 15-point exam preparation checklist...</span>
            <span class="text-[var(--primary)]">Show Details ↓</span>
          </div>
        `}

      </div>
    `;
  },

  bindEvents: function(container) {
    const self = this;
    container.querySelectorAll(".exam-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        self.currentTab = btn.dataset.tab;
        self.render(container);
      });
    });
  },

  toggleExpand: function(examId) {
    this.expandedExamId = this.expandedExamId === examId ? null : examId;
    this.render(document.getElementById("main-content-view"));
  },

  toggleChecklistItem: function(examId, itemId) {
    window.academicStore.toggleExamChecklist(examId, itemId);
    window.App.showToast("Exam prep checklist updated.");
    this.render(document.getElementById("main-content-view"));
  },

  triggerAIAudit: function() {
    const drawer = document.getElementById("ai-copilot-drawer");
    const input = document.getElementById("ai-chat-input");
    const form = document.getElementById("ai-chat-form");
    if (drawer) {
      drawer.classList.remove("hidden");
      if (input && form) {
        input.value = "Audit my exam readiness across all 14 subjects, identify the top 3 high-risk backlogs, and suggest a focused 5-day revision plan respecting my 22:45 bedtime.";
        form.dispatchEvent(new Event("submit"));
      }
    }
  }
};

