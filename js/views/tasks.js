/**
 * Academix - Task Management System
 * Conforms to Part 5 of Master Product Specification
 * Enhanced with Stitch Task Inspector Slide-over Drawer
 */

window.TasksView = {
  currentTab: "all", // "all" | "today" | "upcoming" | "in-progress" | "completed" | "overdue"
  searchQuery: "",
  selectedPriority: "all",
  selectedSubject: "all",
  sortBy: "dueDate", // "dueDate" | "priority" | "title"
  activeTaskId: null,

  render: function(container) {
    const store = window.academicStore;
    const state = store.state;
    const dateSvc = window.AcademixDateService;
    const todayStr = dateSvc ? dateSvc.todayString() : "2026-11-08";

    // Filter tasks
    let filtered = state.tasks.filter(t => {
      // Search
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchDesc = t.description ? t.description.toLowerCase().includes(q) : false;
        const matchTopic = t.topic ? t.topic.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchDesc && !matchTopic) return false;
      }
      // Subject
      if (this.selectedSubject !== "all" && t.subjectId !== this.selectedSubject) return false;
      // Priority
      if (this.selectedPriority !== "all" && t.priority.toLowerCase() !== this.selectedPriority.toLowerCase()) return false;
      // Tab filtering using Smart Execution Engine rules
      const dateSvc = window.AcademixDateService;
      const todayStr = dateSvc ? dateSvc.todayString() : "2026-11-08";
      const taskDate = t.scheduledDate || t.dueDate || todayStr;

      if (this.currentTab === "today") return taskDate === todayStr && t.status !== "completed";
      if (this.currentTab === "in-progress") return t.status === "in-progress" || t.executionState === "in_progress";
      if (this.currentTab === "completed") return t.status === "completed" || t.executionState === "completed";
      if (this.currentTab === "overdue") return t.status === "overdue";
      if (this.currentTab === "upcoming") return t.status === "upcoming" || (taskDate > todayStr && t.status !== "completed");
      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (this.sortBy === "priority") {
        const pMap = { "Critical": 4, "High": 3, "Medium": 2, "Low": 1 };
        return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
      } else if (this.sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return (a.dueDate || "").localeCompare(b.dueDate || "");
    });

    const totalCount = state.tasks.length;
    const completedCount = state.tasks.filter(t => t.status === "completed").length;
    const overdueCount = state.tasks.filter(t => t.status === "overdue").length;
    const inProgressCount = state.tasks.filter(t => t.status === "in-progress").length;

    const activeTask = this.activeTaskId ? state.tasks.find(t => t.id === this.activeTaskId) : null;

    container.innerHTML = `
      <div class="flex flex-col w-full gap-4 animate-fade-in relative">
        
        <!-- Header & Stats Strip -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Workload & Deliverables</span>
              <span class="badge ${overdueCount > 0 ? 'badge-urgent' : 'badge-neutral'}">${overdueCount} Overdue</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1">My Tasks</h1>
            <p class="text-xs text-[var(--on-surface-variant)]">Deliverables, model papers, and spaced problem sets</p>
          </div>

          <div class="flex items-center gap-2">
            ${overdueCount > 0 ? `
              <button id="task-recovery-btn" class="btn-secondary h-9 px-3 text-xs flex items-center gap-1.5" onclick="window.TasksView.openRecoveryModal()" title="Generate sleep-safe recovery slots for overdue work">
                <span class="material-symbols-outlined text-[16px] text-[var(--primary)]">auto_fix_high</span>
                <span>Smart Recovery (${overdueCount})</span>
              </button>
            ` : ''}
            <button id="task-add-btn" class="btn-primary h-9 px-3.5 text-xs">
              <span class="material-symbols-outlined text-[18px]">add_task</span>
              <span>New Task</span>
            </button>
          </div>
        </div>

        <!-- Metric Indicators -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div class="p-3 rounded-lg border border-[var(--border-subtle)] bg-white flex flex-col">
            <span class="font-mono text-[10px] text-[var(--on-surface-variant)] uppercase">TOTAL ACTIVE</span>
            <span class="font-mono text-xl font-semibold text-[var(--on-surface)] mt-1">${totalCount}</span>
          </div>
          <div class="p-3 rounded-lg border border-[var(--border-subtle)] bg-white flex flex-col">
            <span class="font-mono text-[10px] text-[var(--primary)] uppercase">COMPLETED</span>
            <span class="font-mono text-xl font-semibold text-[var(--primary)] mt-1">${completedCount}</span>
          </div>
          <div class="p-3 rounded-lg border border-[var(--border-subtle)] bg-white flex flex-col">
            <span class="font-mono text-[10px] text-[var(--tertiary)] uppercase">IN PROGRESS</span>
            <span class="font-mono text-xl font-semibold text-[var(--tertiary)] mt-1">${inProgressCount}</span>
          </div>
          <div class="p-3 rounded-lg border border-[var(--border-subtle)] bg-white flex flex-col">
            <span class="font-mono text-[10px] text-[var(--error)] uppercase">OVERDUE</span>
            <span class="font-mono text-xl font-semibold text-[var(--error)] mt-1">${overdueCount}</span>
          </div>
        </div>

        <!-- Carry-Forward Backlog Banner -->
        ${overdueCount > 0 ? `
          <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-lowest)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-lg bg-[var(--error)]/10 text-[var(--error)] flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-[18px]">history_toggle_off</span>
              </span>
              <div>
                <span class="font-semibold text-[var(--on-surface)]">Carry-Forward Backlog: ${overdueCount} unfinished tasks detected from earlier dates.</span>
                <p class="text-[11px] text-[var(--on-surface-variant)] mt-0.5">Execution records preserved. Propose sleep-safe recovery slots (ending before 22:45 bedtime).</p>
              </div>
            </div>
            <button class="btn-primary h-8 px-3 text-xs font-mono flex items-center gap-1.5 flex-shrink-0" onclick="window.TasksView.openRecoveryModal()">
              <span class="material-symbols-outlined text-[16px]">play_circle</span>
              <span>Generate Recovery Plan</span>
            </button>
          </div>
        ` : ''}

        <!-- Filter Controls Row -->
        <div class="layer-card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <!-- Search Box -->
          <div class="relative flex-1">
            <span class="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-[var(--outline)]">search</span>
            <input 
              type="text" 
              id="task-search-input" 
              value="${this.searchQuery}" 
              placeholder="Search tasks, descriptions, or topics..." 
              class="input-base pl-8 pr-3 h-8 text-xs w-full"
            />
          </div>

          <!-- Select Filters -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Subject Filter -->
            <select id="task-filter-subject" class="input-base h-8 text-xs font-mono">
              <option value="all" ${this.selectedSubject === 'all' ? 'selected' : ''}>All Subjects</option>
              ${state.subjects.map(s => `<option value="${s.id}" ${this.selectedSubject === s.id ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join("")}
            </select>

            <!-- Priority Filter -->
            <select id="task-filter-priority" class="input-base h-8 text-xs font-mono">
              <option value="all" ${this.selectedPriority === 'all' ? 'selected' : ''}>All Priorities</option>
              <option value="critical" ${this.selectedPriority === 'critical' ? 'selected' : ''}>Critical</option>
              <option value="high" ${this.selectedPriority === 'high' ? 'selected' : ''}>High</option>
              <option value="medium" ${this.selectedPriority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="low" ${this.selectedPriority === 'low' ? 'selected' : ''}>Low</option>
            </select>

            <!-- Sort By -->
            <select id="task-sort-by" class="input-base h-8 text-xs font-mono">
              <option value="dueDate" ${this.sortBy === 'dueDate' ? 'selected' : ''}>Sort: Due Date</option>
              <option value="priority" ${this.sortBy === 'priority' ? 'selected' : ''}>Sort: Priority</option>
              <option value="title" ${this.sortBy === 'title' ? 'selected' : ''}>Sort: Name</option>
            </select>
          </div>
        </div>

        <!-- Tabs Strip -->
        <div class="flex items-center gap-1 border-b border-[var(--border-subtle)] overflow-x-auto pb-0.5">
          ${[
            { id: "all", label: "All Tasks", count: totalCount },
            { id: "today", label: "Today", count: state.tasks.filter(t => (t.scheduledDate || t.dueDate) === todayStr && t.status !== "completed").length },
            { id: "upcoming", label: "Upcoming", count: state.tasks.filter(t => t.status !== "completed" && t.status !== "overdue").length },
            { id: "in-progress", label: "In Progress", count: inProgressCount },
            { id: "completed", label: "Completed", count: completedCount },
            { id: "overdue", label: "Overdue", count: overdueCount }
          ].map(tab => `
            <button 
              class="task-tab-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${this.currentTab === tab.id ? 'border-[var(--primary)] text-[var(--primary)] font-semibold' : 'border-transparent text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]'}"
              data-tab="${tab.id}"
            >
              <span>${tab.label}</span>
              <span class="font-mono text-[10px] px-1.5 py-0.2 rounded-full ${this.currentTab === tab.id ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-high)] text-[var(--on-surface-variant)]'}">${tab.count}</span>
            </button>
          `).join("")}
        </div>

        <!-- Tasks List Container -->
        <div class="layer-card p-4 flex flex-col gap-2">
          ${this.renderTaskList(filtered)}
        </div>

        <!-- Task Slide-over Inspector Drawer -->
        ${activeTask ? this.renderTaskDrawer(activeTask) : ''}

      </div>
    `;

    this.bindEvents(container);
  },

  renderTaskList: function(tasks) {
    if (tasks.length === 0) {
      return `
        <div class="p-8 text-center text-xs text-[var(--on-surface-variant)] bg-[var(--surface-low)] rounded border border-[var(--border-subtle)]">
          <span class="material-symbols-outlined text-3xl text-[var(--outline)] block mb-1">done_all</span>
          No tasks found matching current filters.
        </div>
      `;
    }

    const store = window.academicStore;
    const state = store.state;

    return tasks.map(task => {
      const isDone = task.status === "completed";
      const isOverdue = task.status === "overdue";
      const sub = state.subjects.find(s => s.id === task.subjectId);

      let priorityBadgeClass = "badge-neutral";
      if (task.priority === "Critical" || task.priority === "High") priorityBadgeClass = "badge-urgent";
      else if (task.priority === "Medium") priorityBadgeClass = "badge-pending";

      const subtasks = task.subtasks || [];
      const doneSubtasks = subtasks.filter(st => st.done).length;

      return `
        <div 
          class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-[var(--primary)] cursor-pointer transition-colors group"
          onclick="window.TasksView.openTaskDetail('${task.id}')"
        >
          <div class="flex items-start gap-3 min-w-0">
            <button 
              class="w-5 h-5 rounded border ${isDone ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--border-moderate)] bg-white hover:border-[var(--primary)]'} flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer" 
              onclick="event.stopPropagation(); window.TasksView.toggleTaskDone('${task.id}')"
              title="${isDone ? 'Mark Incomplete' : 'Mark Complete'}"
            >
              <span class="material-symbols-outlined text-[14px] ${isDone ? 'opacity-100' : 'opacity-0'}">check</span>
            </button>

            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="badge ${isOverdue ? 'badge-urgent' : 'badge-neutral'}">${isOverdue ? 'OVERDUE' : (sub ? sub.code : 'TASK')}</span>
                <span class="badge ${priorityBadgeClass}">${task.priority}</span>
                <span class="badge badge-neutral">${task.category}</span>
                <span class="font-mono text-xs text-[var(--on-surface-variant)]">Due: ${task.dueDate}</span>
                ${task.remainingMinutes !== undefined && task.remainingMinutes > 0 && task.actualMinutes > 0 ? `<span class="badge badge-pending font-mono text-[10px]">⏳ ${task.remainingMinutes}m rem</span>` : ''}
                ${task.rescheduleCount > 0 ? `<span class="badge badge-neutral font-mono text-[10px]">⚡ Rescheduled (${task.rescheduleCount}x)</span>` : ''}
                ${task.isRevision ? `<span class="badge badge-completed font-mono text-[10px]">🎯 R${task.revisionStage || 1} Revision</span>` : ''}
              </div>
              <h3 class="text-sm font-semibold text-[var(--on-surface)] mt-1 ${isDone ? 'line-through opacity-70' : ''}">
                ${task.title}
              </h3>
              ${task.description ? `<p class="text-xs text-[var(--on-surface-variant)] mt-0.5 line-clamp-1">${task.description}</p>` : ''}
              
              <div class="flex items-center gap-3 text-[11px] text-[var(--on-surface-variant)] font-mono mt-1 flex-wrap">
                <span>Est: ${task.estimatedMinutes}m</span>
                ${task.actualMinutes ? `<span>• Logged: ${task.actualMinutes}m</span>` : ''}
                ${subtasks.length > 0 ? `<span>• Sub-tasks: ${doneSubtasks}/${subtasks.length}</span>` : ''}
                ${task.topic ? `<span>• ${task.topic}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0 self-end md:self-center" onclick="event.stopPropagation()">
            <button class="btn-ghost h-8 px-2 text-xs font-mono text-[var(--primary)]" onclick="window.DashboardView.startFocusForSession('task-sess-${task.id}')">
              <span class="material-symbols-outlined text-[16px]">play_arrow</span>
              <span>Focus</span>
            </button>
            <button class="btn-ghost h-8 w-8 text-[var(--error)]" title="Delete Task" onclick="window.TasksView.deleteTask('${task.id}')">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join("");
  },

  renderTaskDrawer: function(task) {
    const store = window.academicStore;
    const sub = store.state.subjects.find(s => s.id === task.subjectId);
    const subtasks = task.subtasks || [
      { id: "st-1", title: "Review theory notes & key formulas", done: false },
      { id: "st-2", title: "Solve 5 KTU previous questions without notes", done: false },
      { id: "st-3", title: "Verify answers & write mistakes to error log", done: false }
    ];

    const isDone = task.status === "completed";

    return `
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/30 z-40 animate-fade-in" onclick="window.TasksView.closeTaskDetail()"></div>

      <!-- Slide-over Drawer -->
      <div class="fixed inset-y-0 right-0 w-full max-w-lg bg-[var(--surface-lowest)] border-l border-[var(--border-subtle)] shadow-2xl z-50 flex flex-col animate-fade-in">
        
        <!-- Drawer Header -->
        <div class="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3 bg-[var(--surface-low)]">
          <div class="flex items-center gap-2">
            <span class="badge ${isDone ? 'badge-completed' : 'badge-pending'} uppercase font-mono">${task.status}</span>
            <span class="badge badge-neutral font-mono">${sub ? sub.code : 'TASK'}</span>
            <span class="badge badge-urgent font-mono">${task.priority}</span>
          </div>

          <button class="w-8 h-8 rounded hover:bg-[var(--surface-container)] flex items-center justify-center text-[var(--on-surface-variant)]" onclick="window.TasksView.closeTaskDetail()">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Drawer Body -->
        <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          
          <!-- Title & Description -->
          <div>
            <h2 class="text-base font-semibold text-[var(--on-surface)] leading-snug">${task.title}</h2>
            <p class="text-xs text-[var(--on-surface-variant)] mt-1.5 leading-relaxed">${task.description || 'No description provided.'}</p>
          </div>

          <!-- Academic Context Pill -->
          <div class="p-3 rounded-lg bg-[var(--surface-low)] border border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <div>
              <span class="text-[10px] font-mono uppercase text-[var(--on-surface-variant)] block">Course & Topic</span>
              <span class="text-xs font-semibold text-[var(--on-surface)]">${sub ? sub.name : 'General Task'}</span>
              ${task.topic ? `<span class="text-[11px] text-[var(--on-surface-variant)] block font-mono mt-0.5">${task.topic}</span>` : ''}
            </div>
            ${sub ? `<a href="#/subjects/${sub.id}" class="btn-ghost h-7 px-2 text-[11px] font-mono text-[var(--primary)]" onclick="window.TasksView.closeTaskDetail()">View Syllabus →</a>` : ''}
          </div>

          <!-- Spaced Study & Focus Section -->
          <div class="layer-card p-3.5 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--on-surface)]">Study Time Telemetry</span>
              <span class="text-xs font-mono text-[var(--primary)] font-semibold">${task.actualMinutes || 0}m logged / ${task.estimatedMinutes}m est</span>
            </div>

            <div class="flex items-center gap-2 pt-1 flex-wrap">
              <button class="btn-primary h-8 px-3 text-xs font-semibold" onclick="window.DashboardView.startFocusForSession('task-sess-${task.id}'); window.TasksView.closeTaskDetail();">
                <span class="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>Launch Focus Timer</span>
              </button>

              <button class="btn-secondary h-8 px-2.5 text-xs font-mono" onclick="window.TasksView.quickLogMinutes('${task.id}', 15)" title="Add 15 minutes to actual study time">
                +15m
              </button>
              <button class="btn-secondary h-8 px-2.5 text-xs font-mono" onclick="window.TasksView.quickLogMinutes('${task.id}', 30)" title="Add 30 minutes to actual study time">
                +30m
              </button>
              <button class="btn-secondary h-8 px-2.5 text-xs font-mono" onclick="window.TasksView.quickLogMinutes('${task.id}', 60)" title="Add 60 minutes to actual study time">
                +60m
              </button>
            </div>
          </div>

          <!-- Spaced Revision Active Recall Section -->
          ${task.isRevision ? `
            <div class="layer-card p-3.5 flex flex-col gap-2.5 border-l-4 border-l-[var(--primary)]">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-[var(--on-surface)] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px] text-[var(--primary)]">psychology</span>
                  Active Recall Feedback (R${task.revisionStage || 1})
                </span>
                <span class="badge badge-completed text-[10px]">Spaced Engine</span>
              </div>
              <p class="text-[11px] text-[var(--on-surface-variant)]">Rate your recall difficulty. Academix automatically adjusts your next spaced revision interval:</p>
              <div class="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
                <button class="p-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-low)] hover:border-[var(--primary)] flex flex-col items-center gap-1" onclick="window.TasksView.handleRecall('${task.id}', 'easy')">
                  <span>🟢 Easy</span>
                  <span class="text-[9px] text-[var(--outline)]">+50% interval</span>
                </button>
                <button class="p-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-low)] hover:border-[var(--tertiary)] flex flex-col items-center gap-1" onclick="window.TasksView.handleRecall('${task.id}', 'moderate')">
                  <span>🟡 Moderate</span>
                  <span class="text-[9px] text-[var(--outline)]">Standard interval</span>
                </button>
                <button class="p-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-low)] hover:border-[var(--error)] flex flex-col items-center gap-1" onclick="window.TasksView.handleRecall('${task.id}', 'difficult')">
                  <span>🔴 Difficult</span>
                  <span class="text-[9px] text-[var(--outline)]">-50% + Practice</span>
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Execution & Reschedule History Audit Trail -->
          ${task.history && task.history.length > 0 ? `
            <div class="layer-card p-3.5 flex flex-col gap-2">
              <span class="text-xs font-semibold text-[var(--on-surface)]">Execution & Reschedule History</span>
              <div class="flex flex-col gap-1.5 pt-1 divide-y divide-[var(--border-subtle)] text-[11px] font-mono">
                ${task.history.map(h => `
                  <div class="pt-1.5 flex flex-col">
                    <div class="flex items-center justify-between text-[var(--on-surface)]">
                      <span class="font-semibold text-[var(--primary)]">${h.action}</span>
                      <span class="text-[10px] text-[var(--outline)]">${h.approvedAt ? new Date(h.approvedAt).toLocaleDateString() : ''}</span>
                    </div>
                    <span class="text-[var(--on-surface-variant)]">${h.fromScheduledDate} → ${h.toScheduledDate} (${h.toStartTime || 'Anytime'})</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Sub-tasks Checklist -->
          <div class="layer-card p-3.5 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-[var(--on-surface)]">Task Breakdown Checklist</span>
              <span class="text-[11px] font-mono text-[var(--on-surface-variant)]">${subtasks.filter(st => st.done).length}/${subtasks.length} completed</span>
            </div>

            <div class="flex flex-col gap-2 pt-1" id="drawer-subtasks-list">
              ${subtasks.map((st, idx) => `
                <div class="flex items-center gap-2 text-xs">
                  <input 
                    type="checkbox" 
                    id="st-chk-${idx}" 
                    ${st.done ? 'checked' : ''} 
                    class="w-4 h-4 rounded text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
                    onchange="window.TasksView.toggleSubtask('${task.id}', ${idx})"
                  />
                  <label for="st-chk-${idx}" class="cursor-pointer ${st.done ? 'line-through text-[var(--on-surface-variant)]' : 'text-[var(--on-surface)]'}">
                    ${st.title}
                  </label>
                </div>
              `).join("")}
            </div>

            <!-- Add Subtask Input -->
            <div class="flex items-center gap-2 pt-1">
              <input 
                type="text" 
                id="drawer-new-subtask" 
                placeholder="Add sub-task..." 
                class="input-base h-7 text-xs flex-1"
                onkeydown="if (event.key === 'Enter') window.TasksView.addSubtask('${task.id}')"
              />
              <button class="btn-secondary h-7 px-2.5 text-xs" onclick="window.TasksView.addSubtask('${task.id}')">
                Add
              </button>
            </div>
          </div>

          <!-- Schedule & Metadata -->
          <div class="layer-card p-3.5 flex flex-col gap-2.5 text-xs">
            <span class="font-semibold text-[var(--on-surface)]">Deliverable Target</span>
            
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] font-mono uppercase text-[var(--on-surface-variant)] block mb-1">Due Date</label>
                <input 
                  type="date" 
                  id="drawer-due-date" 
                  value="${task.dueDate}" 
                  class="input-base w-full h-8 text-xs font-mono"
                  onchange="window.TasksView.updateDueDate('${task.id}', this.value)"
                />
              </div>

              <div>
                <label class="text-[10px] font-mono uppercase text-[var(--on-surface-variant)] block mb-1">Priority</label>
                <select 
                  class="input-base w-full h-8 text-xs font-mono"
                  onchange="window.TasksView.updatePriority('${task.id}', this.value)"
                >
                  <option value="Critical" ${task.priority === 'Critical' ? 'selected' : ''}>Critical</option>
                  <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
                  <option value="Medium" ${task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
                  <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        <!-- Drawer Footer -->
        <div class="p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-low)] flex items-center justify-between gap-2">
          <button class="btn-ghost text-[var(--error)] h-9 px-3 text-xs font-mono" onclick="window.TasksView.deleteTask('${task.id}')">
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>Delete</span>
          </button>

          <button class="btn-primary h-9 px-4 text-xs font-semibold" onclick="window.TasksView.toggleTaskDone('${task.id}')">
            <span class="material-symbols-outlined text-[16px]">${isDone ? 'undo' : 'check'}</span>
            <span>${isDone ? 'Mark Incomplete' : 'Mark Completed'}</span>
          </button>
        </div>

      </div>
    `;
  },

  bindEvents: function(container) {
    const self = this;

    // Tabs
    container.querySelectorAll(".task-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        self.currentTab = btn.dataset.tab;
        self.render(container);
      });
    });

    // Search
    const searchInput = container.querySelector("#task-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        self.searchQuery = e.target.value;
        const list = container.querySelector(".layer-card.p-4");
        const state = window.academicStore.state;
        let filtered = state.tasks.filter(t => {
          if (self.searchQuery) {
            const q = self.searchQuery.toLowerCase();
            if (!t.title.toLowerCase().includes(q) && !(t.description && t.description.toLowerCase().includes(q))) return false;
          }
          if (self.selectedSubject !== "all" && t.subjectId !== self.selectedSubject) return false;
          if (self.selectedPriority !== "all" && t.priority.toLowerCase() !== self.selectedPriority.toLowerCase()) return false;
          return true;
        });
        if (list) list.innerHTML = self.renderTaskList(filtered);
      });
    }

    // Filter Subject
    const subSelect = container.querySelector("#task-filter-subject");
    if (subSelect) {
      subSelect.addEventListener("change", (e) => {
        self.selectedSubject = e.target.value;
        self.render(container);
      });
    }

    // Filter Priority
    const prioSelect = container.querySelector("#task-filter-priority");
    if (prioSelect) {
      prioSelect.addEventListener("change", (e) => {
        self.selectedPriority = e.target.value;
        self.render(container);
      });
    }

    // Sort By
    const sortSelect = container.querySelector("#task-sort-by");
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        self.sortBy = e.target.value;
        self.render(container);
      });
    }

    // New Task Button
    const addBtn = container.querySelector("#task-add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        window.App.openQuickAddModal("task");
      });
    }
  },

  openTaskDetail: function(taskId) {
    this.activeTaskId = taskId;
    this.render(document.getElementById("main-content-view"));
  },

  closeTaskDetail: function() {
    this.activeTaskId = null;
    this.render(document.getElementById("main-content-view"));
  },

  toggleSubtask: function(taskId, subtaskIdx) {
    const store = window.academicStore;
    const task = store.state.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!task.subtasks) {
      task.subtasks = [
        { id: "st-1", title: "Review theory notes & key formulas", done: false },
        { id: "st-2", title: "Solve 5 KTU previous questions without notes", done: false },
        { id: "st-3", title: "Verify answers & write mistakes to error log", done: false }
      ];
    }
    if (task.subtasks[subtaskIdx]) {
      task.subtasks[subtaskIdx].done = !task.subtasks[subtaskIdx].done;
      store.updateTask(taskId, { subtasks: task.subtasks });
      this.render(document.getElementById("main-content-view"));
    }
  },

  addSubtask: function(taskId) {
    const input = document.getElementById("drawer-new-subtask");
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();

    const store = window.academicStore;
    const task = store.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.subtasks) {
      task.subtasks = [
        { id: "st-1", title: "Review theory notes & key formulas", done: false },
        { id: "st-2", title: "Solve 5 KTU previous questions without notes", done: false },
        { id: "st-3", title: "Verify answers & write mistakes to error log", done: false }
      ];
    }
    task.subtasks.push({ id: "st-" + Date.now(), title: text, done: false });
    store.updateTask(taskId, { subtasks: task.subtasks });
    input.value = "";
    this.render(document.getElementById("main-content-view"));
  },

  quickLogMinutes: function(taskId, minutes) {
    const store = window.academicStore;
    const task = store.state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const current = task.actualMinutes || 0;
    store.updateTask(taskId, { actualMinutes: current + minutes });
    window.App.showToast(`Logged +${minutes} minutes to study telemetry.`);
    this.render(document.getElementById("main-content-view"));
  },

  updateDueDate: function(taskId, newDate) {
    if (!newDate) return;
    window.academicStore.updateTask(taskId, { dueDate: newDate });
    window.App.showToast("Due date rescheduled.");
    this.render(document.getElementById("main-content-view"));
  },

  updatePriority: function(taskId, newPriority) {
    window.academicStore.updateTask(taskId, { priority: newPriority });
    window.App.showToast("Priority updated.");
    this.render(document.getElementById("main-content-view"));
  },

  toggleTaskDone: function(taskId) {
    window.academicStore.toggleTaskCompleted(taskId);
    window.App.showToast("Task state updated.");
    this.render(document.getElementById("main-content-view"));
  },

  deleteTask: function(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      window.academicStore.deleteTask(taskId);
      this.activeTaskId = null;
      window.App.showToast("Task deleted.");
      this.render(document.getElementById("main-content-view"));
    }
  },

  /* ------------------- SMART RECOVERY & SPACED REVISION HANDLERS ------------------- */

  handleRecall: function(taskId, rating) {
    const res = window.academicStore.recordRevisionRecall(taskId, rating);
    if (res) {
      if (res.nextStageScheduled) {
        window.App.showToast(`Active recall recorded (${rating}). R${res.nextTask.revisionStage} scheduled for ${res.nextDate}`);
      } else {
        window.App.showToast(`Revision complete! ${res.message}`);
      }
    }
    this.render(document.getElementById("main-content-view"));
  },

  openRecoveryModal: function() {
    const store = window.academicStore;
    const plan = store.generateRecoveryProposals();
    const modal = document.getElementById("plan-regen-modal");
    if (!modal) return;

    modal.innerHTML = `
      <div class="layer-modal w-full max-w-2xl rounded-xl p-5 flex flex-col gap-4 animate-fade-in shadow-2xl max-h-[85vh] overflow-hidden" onclick="event.stopPropagation()">
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs">
              <span class="material-symbols-outlined text-[18px]">auto_fix_high</span>
            </div>
            <div>
              <h3 class="text-sm font-bold text-[var(--on-surface)]">Smart Recovery Proposals</h3>
              <p class="text-[10px] text-[var(--on-surface-variant)] font-mono">Deterministic priority schedule • Sleep protected (<22:45 bedtime)</p>
            </div>
          </div>
          <button class="w-8 h-8 rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)] flex items-center justify-center" onclick="window.TasksView.closeRecoveryModal()">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Proposals List -->
        <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
          ${plan.proposals.length === 0 ? `
            <div class="p-6 text-center text-xs text-[var(--on-surface-variant)]">
              <span class="material-symbols-outlined text-[32px] text-[var(--primary)] mb-1">task_alt</span>
              <p class="font-semibold text-[var(--on-surface)]">All clear! No carry-forward backlog tasks detected.</p>
              <p class="text-[11px] mt-0.5">Your study schedule is fully on track.</p>
            </div>
          ` : plan.proposals.map(p => `
            <div class="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-lowest)] flex flex-col gap-2 hover:border-[var(--primary)] transition-colors">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="badge badge-urgent font-mono text-[10px]">P-${p.priorityScore}</span>
                    <span class="badge badge-neutral font-mono text-[10px]">${p.subjectId}</span>
                    <span class="text-[11px] text-[var(--outline)] font-mono">Original: ${p.originalDate}</span>
                  </div>
                  <h4 class="text-xs font-bold text-[var(--on-surface)] mt-1">${p.taskTitle}</h4>
                </div>
                <span class="badge badge-completed font-mono text-[10px] whitespace-nowrap">${p.allocatedMinutes}m slot</span>
              </div>

              <!-- Proposed Slot Details -->
              <div class="p-2 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] text-xs font-mono flex items-center justify-between text-[var(--on-surface)]">
                <span class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[15px] text-[var(--primary)]">event_available</span>
                  <strong>${p.proposedDate}</strong> (${p.proposedStartTime} - ${p.proposedEndTime})
                </span>
                <span class="text-[10px] text-[var(--primary)] font-semibold">Sleep-safe (<22:45)</span>
              </div>

              <p class="text-[10px] text-[var(--on-surface-variant)]">${p.reason}</p>

              <!-- Proposal Action Buttons -->
              <div class="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border-subtle)]/50">
                <button class="btn-ghost h-7 px-2.5 text-xs text-[var(--on-surface-variant)]" onclick="window.TasksView.rejectProposal('${p.id}')">Dismiss</button>
                <button class="btn-primary h-7 px-3 text-xs font-semibold flex items-center gap-1" onclick="window.TasksView.approveProposal('${p.id}')">
                  <span class="material-symbols-outlined text-[14px]">check</span>
                  <span>Approve & Schedule</span>
                </button>
              </div>
            </div>
          `).join('')}

          ${plan.unscheduled.length > 0 ? `
            <div class="p-3 rounded-lg bg-[var(--surface-container)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--on-surface-variant)] flex flex-col gap-1">
              <span class="font-bold text-[var(--on-surface)]">⚠️ ${plan.unscheduled.length} tasks remain in unscheduled backlog</span>
              <p>No conflict-free slots found within 7 days without violating sleep (22:45) or college hours. Consider completing earlier sessions faster or adjusting daily workload limits.</p>
            </div>
          ` : ''}
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs">
          <span class="font-mono text-[11px] text-[var(--outline)]">${plan.proposalsCount} proposals generated</span>
          <button class="btn-secondary h-8 px-4 text-xs font-mono" onclick="window.TasksView.closeRecoveryModal()">Close</button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
  },

  closeRecoveryModal: function() {
    const modal = document.getElementById("plan-regen-modal");
    if (modal) modal.classList.add("hidden");
  },

  approveProposal: function(proposalId) {
    const res = window.academicStore.approveRecoveryProposal(proposalId);
    if (res.success) {
      window.App.showToast("Recovery proposal approved and scheduled into timetable.");
      this.openRecoveryModal();
      this.render(document.getElementById("main-content-view"));
    } else {
      window.App.showToast(`Error: ${res.error}`);
    }
  },

  rejectProposal: function(proposalId) {
    window.academicStore.rejectRecoveryProposal(proposalId);
    window.App.showToast("Proposal dismissed.");
    this.openRecoveryModal();
    this.render(document.getElementById("main-content-view"));
  }
};
