/**
 * Academix - Subject Management & Module Workspace
 * Conforms to Part 6 of Master Product Specification & Stitch Screen
 */

window.SubjectsView = {
  currentFilter: "all", // "all" | "S5" | "S3" | "S1" | "S2" | "S4"
  searchQuery: "",
  activeSubjectId: null,
  activeModuleNum: 1,

  render: function(container, subjectId = null) {
    if (subjectId) {
      this.activeSubjectId = subjectId;
      this.renderSubjectWorkspace(container, subjectId);
    } else {
      this.activeSubjectId = null;
      this.renderSubjectLibrary(container);
    }
  },

  /* ------------------- SUBJECT LIBRARY VIEW ------------------- */

  renderSubjectLibrary: function(container) {
    const store = window.academicStore;
    const state = store.state;

    // Filter subjects
    let filtered = state.subjects.filter(s => {
      if (this.currentFilter !== "all" && s.semester !== this.currentFilter) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.code.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });

    container.innerHTML = `
      <div class="flex flex-col w-full gap-4 animate-fade-in">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">University Curriculum</span>
              <span class="badge badge-neutral">14 Courses Enrolled</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1">Subjects & Syllabus</h1>
            <p class="text-xs text-[var(--on-surface-variant)]">B.Tech CSE KTU 2024 Scheme • S5 Core + 9 Backlogs</p>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn-primary h-9 px-3.5 text-xs" onclick="window.App.openQuickAddModal('subject')">
              <span class="material-symbols-outlined text-[18px]">library_add</span>
              <span>Add Subject</span>
            </button>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="layer-card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <span class="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-[var(--on-surface-variant)]">search</span>
            <input type="text" id="sub-search-input" value="${this.searchQuery}" placeholder="Search course by code or keyword..." class="input-base w-full pl-8 h-8 text-xs" />
          </div>

          <!-- Category Filter Pills -->
          <div class="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button class="sub-filter-btn px-2.5 py-1 text-xs font-mono rounded ${this.currentFilter === 'all' ? 'bg-[var(--primary)] text-white font-medium' : 'bg-[var(--surface-low)] text-[var(--on-surface-variant)] hover:bg-white'}" data-filter="all">All (14)</button>
            <button class="sub-filter-btn px-2.5 py-1 text-xs font-mono rounded ${this.currentFilter === 'S5' ? 'bg-[var(--primary)] text-white font-medium' : 'bg-[var(--surface-low)] text-[var(--on-surface-variant)] hover:bg-white'}" data-filter="S5">S5 Core (5)</button>
            <button class="sub-filter-btn px-2.5 py-1 text-xs font-mono rounded ${this.currentFilter === 'S3' ? 'bg-[var(--primary)] text-white font-medium' : 'bg-[var(--surface-low)] text-[var(--on-surface-variant)] hover:bg-white'}" data-filter="S3">S3 Backlogs (3)</button>
            <button class="sub-filter-btn px-2.5 py-1 text-xs font-mono rounded ${this.currentFilter === 'S1' ? 'bg-[var(--primary)] text-white font-medium' : 'bg-[var(--surface-low)] text-[var(--on-surface-variant)] hover:bg-white'}" data-filter="S1">S1 Backlogs (4)</button>
            <button class="sub-filter-btn px-2.5 py-1 text-xs font-mono rounded ${this.currentFilter === 'S2' ? 'bg-[var(--primary)] text-white font-medium' : 'bg-[var(--surface-low)] text-[var(--on-surface-variant)] hover:bg-white'}" data-filter="S2">S2 Chem</button>
            <button class="sub-filter-btn px-2.5 py-1 text-xs font-mono rounded ${this.currentFilter === 'S4' ? 'bg-[var(--primary)] text-white font-medium' : 'bg-[var(--surface-low)] text-[var(--on-surface-variant)] hover:bg-white'}" data-filter="S4">S4 Software</button>
          </div>
        </div>

        <!-- Subjects Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${filtered.map(sub => this.renderSubjectCard(sub)).join("")}
        </div>

      </div>
    `;

    this.bindLibraryEvents(container);
  },

  renderSubjectCard: function(sub) {
    const store = window.academicStore;
    const exam = store.state.examinations.find(e => e.subjectId === sub.id);
    const daysBadge = exam && exam.daysLeft !== null
      ? `<span class="badge badge-exam text-[10px]">T-${exam.daysLeft}D</span>`
      : `<span class="badge badge-neutral text-[10px]">Date TBD</span>`;

    const subColor = sub.color || 'var(--primary)';
    const subBg = sub.colorBg || '#F5F3F5';
    const subBorder = sub.colorBorder || '#E5E3DC';
    const subText = sub.colorText || sub.color || 'var(--on-surface)';

    return `
      <div class="layer-card p-4 flex flex-col justify-between hover:border-[var(--primary)] cursor-pointer transition-all group border-l-4" style="border-left-color: ${subColor}" onclick="window.location.hash = '#/subjects/${sub.id}'">
        <div>
          <div class="flex items-start justify-between gap-2 pb-2">
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border font-mono" style="background-color: ${subBg}; border-color: ${subBorder}; color: ${subText};">${sub.code}</span>
            ${daysBadge}
          </div>
          
          <h3 class="text-sm font-semibold text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors">
            ${sub.name}
          </h3>
          <span class="text-[11px] text-[var(--on-surface-variant)] font-mono block mt-0.5">${sub.category} • ${sub.credits} Credits</span>
          
          <p class="text-xs text-[var(--on-surface-variant)] line-clamp-2 mt-2 leading-relaxed">
            ${sub.description}
          </p>
        </div>

        <div class="pt-3 mt-3 border-t border-[var(--border-subtle)] flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-[var(--on-surface-variant)]">Syllabus Progress</span>
            <span class="font-bold" style="color: ${subColor};">${sub.syllabusProgress || 0}%</span>
          </div>
          <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full" style="width: ${sub.syllabusProgress || 0}%; background-color: ${subColor};"></div>
          </div>
          <div class="flex items-center justify-between text-[11px] text-[var(--on-surface-variant)] font-mono pt-1">
            <span>${sub.completedModulesCount || 0} of 4 Modules Done</span>
            <span class="font-medium" style="color: ${subColor};">Open Workspace →</span>
          </div>
        </div>
      </div>
    `;
  },

  bindLibraryEvents: function(container) {
    const self = this;
    container.querySelectorAll(".sub-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        self.currentFilter = btn.dataset.filter;
        self.renderSubjectLibrary(container);
      });
    });

    const searchInput = container.querySelector("#sub-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        self.searchQuery = e.target.value;
        self.renderSubjectLibrary(container);
      });
    }
  },

  /* ------------------- DETAILED SUBJECT WORKSPACE ------------------- */

  renderSubjectWorkspace: function(container, subjectId) {
    const store = window.academicStore;
    const state = store.state;
    const sub = state.subjects.find(s => s.id === subjectId) || state.subjects[0];
    const exam = state.examinations.find(e => e.subjectId === sub.id);
    const modules = state.modules.filter(m => m.subjectId === sub.id).sort((a, b) => a.moduleNumber - b.moduleNumber);

    // Active module
    const currentMod = modules.find(m => m.moduleNumber === this.activeModuleNum) || modules[0];

    container.innerHTML = `
      <div class="flex flex-col w-full gap-4 animate-fade-in">
        
        <!-- Breadcrumbs & Navigation -->
        <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2 text-xs font-mono">
            <a href="#/subjects" class="text-[var(--primary)] hover:underline flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Subjects Library</span>
            </a>
            <span class="text-[var(--outline-variant)]">/</span>
            <span class="text-[var(--on-surface-variant)]">${sub.code}</span>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn-secondary h-8 px-2.5 text-xs font-mono" onclick="window.App.openQuickAddModal('task', '${sub.id}')">
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Add Task</span>
            </button>
            <button class="btn-primary h-8 px-3 text-xs" onclick="window.DashboardView.startFocusForSession('sub-${sub.id}')">
              <span class="material-symbols-outlined text-[16px]">play_circle</span>
              <span>Start Study Session</span>
            </button>
          </div>
        </div>

        <!-- Workspace Header Banner -->
        <div class="layer-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4" style="border-left-color: ${sub.color || 'var(--primary)'}">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold px-2 py-0.5 rounded border font-mono" style="background-color: ${sub.colorBg || '#F5F3F5'}; border-color: ${sub.colorBorder || '#E5E3DC'}; color: ${sub.colorText || sub.color || 'var(--on-surface)'};">${sub.code}</span>
              <span class="badge badge-neutral">${sub.semester} Course</span>
              <span class="badge badge-neutral">${sub.credits} Credits</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1.5">${sub.name}</h1>
            <p class="text-xs text-[var(--on-surface-variant)] mt-1 max-w-2xl">${sub.description}</p>
          </div>

          <!-- Exam Countdown Pill Banner -->
          <div class="p-3 rounded-lg bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col items-end flex-shrink-0 min-w-[200px]">
            <span class="font-mono text-[10px] uppercase text-[var(--on-surface-variant)]">EXAMINATION STATUS</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              ${exam && exam.daysLeft !== null ? `
                <span class="text-2xl font-bold font-mono text-[var(--error)]">${exam.daysLeft}</span>
                <span class="text-xs font-semibold text-[var(--error)]">Days Left</span>
              ` : `
                <span class="text-sm font-semibold font-mono text-[var(--on-surface)]">Date TBD</span>
              `}
            </div>
            <span class="text-[11px] text-[var(--on-surface-variant)] font-mono mt-0.5">
              Exam: ${sub.examDate || 'Safe Target 5 Jan'}
            </span>
          </div>
        </div>

        <!-- Tri-Phase Mastery Metrics (Learning, Practice, Revision) -->
        <div class="layer-card p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
            <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)] font-semibold">Tri-Phase Syllabus Mastery Metrics</span>
            <span class="font-mono text-xs font-bold text-[var(--primary)]">${sub.syllabusProgress || 0}% Overall Ready</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <!-- Learning Coverage -->
            <div class="p-3 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-[var(--on-surface)] flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[var(--primary)]"></span>
                  Curriculum Learning
                </span>
                <strong class="text-[var(--primary)]">${sub.learningCoverage || 0}%</strong>
              </div>
              <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden mt-2">
                <div class="bg-[var(--primary)] h-full rounded-full" style="width: ${sub.learningCoverage || 0}%;"></div>
              </div>
            </div>

            <!-- Practice Coverage -->
            <div class="p-3 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-[var(--on-surface)] flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[var(--tertiary)]"></span>
                  Question Practice
                </span>
                <strong class="text-[var(--tertiary)]">${sub.practiceCoverage || 0}%</strong>
              </div>
              <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden mt-2">
                <div class="bg-[var(--tertiary)] h-full rounded-full" style="width: ${sub.practiceCoverage || 0}%;"></div>
              </div>
            </div>

            <!-- Revision Coverage -->
            <div class="p-3 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="text-[var(--on-surface)] flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-[var(--secondary)]"></span>
                  Recall Drills
                </span>
                <strong class="text-[var(--secondary)]">${sub.revisionCoverage || 0}%</strong>
              </div>
              <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden mt-2">
                <div class="bg-[var(--secondary)] h-full rounded-full" style="width: ${sub.revisionCoverage || 0}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Module Navigation Tabs -->
        <div class="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-1">
          ${modules.map(mod => `
            <button class="mod-tab-btn px-3 py-1.5 rounded text-xs font-mono font-medium flex items-center gap-2 ${
              mod.moduleNumber === this.activeModuleNum
                ? 'bg-white shadow-xs text-[var(--primary)] border border-[var(--border-subtle)]'
                : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'
            }" data-modnum="${mod.moduleNumber}">
              <span class="w-4 h-4 rounded-full ${mod.isCompleted ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-container)] text-[var(--on-surface-variant)]'} flex items-center justify-center text-[10px]">
                ${mod.isCompleted ? '✓' : mod.moduleNumber}
              </span>
              <span>Module ${mod.moduleNumber}</span>
              <span class="badge ${mod.isCompleted ? 'badge-completed' : 'badge-neutral'} text-[10px]">${mod.progressPercent || 0}%</span>
            </button>
          `).join("")}
        </div>

        <!-- Active Module Workspace Detail -->
        ${this.renderModuleDetail(currentMod, sub)}

      </div>
    `;

    this.bindWorkspaceEvents(container, subjectId);
  },

  renderModuleDetail: function(mod, sub) {
    if (!mod) return `<div class="p-4 text-xs text-[var(--on-surface-variant)]">Module details not found.</div>`;

    return `
      <div class="layer-card p-4 flex flex-col gap-4">
        
        <!-- Module Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div class="flex items-center gap-2">
              <span class="badge badge-neutral font-bold">Module ${mod.moduleNumber}</span>
              <span class="text-xs text-[var(--on-surface-variant)] font-mono">Learning Window: ${mod.learnWindow || 'Self-paced'}</span>
            </div>
            <h2 class="text-base font-semibold text-[var(--on-surface)] mt-1">${mod.title}</h2>
            <p class="text-xs text-[var(--on-surface-variant)] mt-0.5">${mod.description}</p>
          </div>

          <div class="flex items-center gap-2">
            <span class="badge ${mod.isCompleted ? 'badge-completed' : 'badge-pending'} text-xs px-2.5 py-1">
              ${mod.isCompleted ? 'Module Complete' : (mod.progressPercent || 0) + '% Mastery'}
            </span>
          </div>
        </div>

        <!-- Topic Independent Status Checklist (Part 6.3) -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between text-xs font-mono text-[var(--on-surface-variant)] pb-1 border-b border-[var(--border-subtle)]">
            <span>Syllabus Topics & Independent Checkpoints</span>
            <div class="flex items-center gap-6">
              <span class="w-16 text-center">Learned</span>
              <span class="w-16 text-center">Practiced</span>
              <span class="w-16 text-center">Revised</span>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            ${
              (mod.topics || []).map(topic => `
                <div class="p-3 rounded-lg border border-[var(--border-subtle)] bg-white flex items-center justify-between gap-3 hover:border-[var(--border-moderate)] transition-colors">
                  <div class="min-w-0 flex-1">
                    <span class="text-xs font-medium text-[var(--on-surface)] leading-snug block">${topic.title}</span>
                  </div>

                  <div class="flex items-center gap-6 flex-shrink-0">
                    <!-- Learned Checkbox -->
                    <label class="w-16 flex items-center justify-center cursor-pointer">
                      <input type="checkbox" class="topic-chk w-4 h-4 rounded border-[var(--border-moderate)] text-[var(--primary)]" ${topic.learned ? 'checked' : ''} onchange="window.SubjectsView.toggleTopicCheck('${sub.id}', '${mod.id}', '${topic.id}', 'learned', this.checked)" />
                    </label>

                    <!-- Practiced Checkbox -->
                    <label class="w-16 flex items-center justify-center cursor-pointer">
                      <input type="checkbox" class="topic-chk w-4 h-4 rounded border-[var(--border-moderate)] text-[var(--tertiary)]" ${topic.practiced ? 'checked' : ''} onchange="window.SubjectsView.toggleTopicCheck('${sub.id}', '${mod.id}', '${topic.id}', 'practiced', this.checked)" />
                    </label>

                    <!-- Revised Checkbox -->
                    <label class="w-16 flex items-center justify-center cursor-pointer">
                      <input type="checkbox" class="topic-chk w-4 h-4 rounded border-[var(--border-moderate)] text-[var(--secondary)]" ${topic.revised ? 'checked' : ''} onchange="window.SubjectsView.toggleTopicCheck('${sub.id}', '${mod.id}', '${topic.id}', 'revised', this.checked)" />
                    </label>
                  </div>
                </div>
              `).join("")
            }
          </div>
        </div>

        <!-- Quick actions -->
        <div class="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <button class="btn-secondary h-8 px-3 text-xs" onclick="window.SubjectsView.addTopicPrompt('${sub.id}', '${mod.id}')">
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>Add Topic to Module</span>
          </button>
          
          <button class="btn-primary h-8 px-3 text-xs" onclick="window.DashboardView.startFocusForSession('mod-${mod.id}')">
            <span class="material-symbols-outlined text-[16px]">play_circle</span>
            <span>Focus on Module ${mod.moduleNumber}</span>
          </button>
        </div>

      </div>
    `;
  },

  bindWorkspaceEvents: function(container, subjectId) {
    const self = this;
    container.querySelectorAll(".mod-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        self.activeModuleNum = parseInt(btn.dataset.modnum);
        self.renderSubjectWorkspace(container, subjectId);
      });
    });
  },

  toggleTopicCheck: function(subjectId, moduleId, topicId, field, value) {
    window.academicStore.updateTopicStatus(subjectId, moduleId, topicId, field, value);
    window.App.showToast(`Updated topic ${field} status.`);
    this.renderSubjectWorkspace(document.getElementById("main-content-view"), subjectId);
  },

  addTopicPrompt: function(subjectId, moduleId) {
    const title = prompt("Enter new syllabus topic title:");
    if (title && title.trim()) {
      const store = window.academicStore;
      const mod = store.state.modules.find(m => m.id === moduleId);
      if (mod) {
        if (!mod.topics) mod.topics = [];
        mod.topics.push({
          id: "top-" + Date.now(),
          title: title.trim(),
          learned: false,
          practiced: false,
          revised: false
        });
        store.recalculateAll();
        store.saveState();
        window.App.showToast("Topic added.");
        this.renderSubjectWorkspace(document.getElementById("main-content-view"), subjectId);
      }
    }
  }
};

