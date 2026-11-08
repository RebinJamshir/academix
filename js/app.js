/**
 * Academix - Master Application Shell & Client Router
 * Manages Navigation, Modals, Global Search (⌘K), Hotkeys, and Toasts
 */

window.App = {
  currentRoute: "dashboard",
  routeParam: null,
  sidebarCollapsed: false,

  init: function() {
    this.bindGlobalNavigation();
    this.bindKeyboardShortcuts();
    this.bindSearchModal();
    this.bindNotificationsCenter();
    this.bindCloudSyncIndicator();
    this.bindAICopilot();
    this.bindAITopicModal();
    this.handleRoute();

    window.addEventListener("hashchange", () => this.handleRoute());

    // Restore sidebar state
    const savedCollapse = localStorage.getItem("academix_sidebar_collapsed");
    if (savedCollapse === "true") {
      this.setSidebarCollapsed(true);
    }

    // Smart Execution Engine: Reminder loop, Service Worker, and Multi-Tab Sync
    this.startReminderEngine();
    this.registerServiceWorker();
    this.bindMultiTabSync();
  },

  startReminderEngine: function() {
    const runChecks = () => {
      if (window.AcademixNotificationService && window.academicStore) {
        window.AcademixNotificationService.checkAndScheduleReminders(window.academicStore.state);
        this.updateNotificationBadge();
      }
    };
    runChecks();
    this._reminderInterval = setInterval(runChecks, 60000);
  },

  registerServiceWorker: function() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          console.log('[ServiceWorker] Registered with scope:', reg.scope);
        }).catch(err => {
          console.log('[ServiceWorker] Registration failed:', err);
        });
      });
    }
  },

  bindMultiTabSync: function() {
    window.addEventListener('storage', (e) => {
      const store = window.academicStore;
      if (store && e.key === store.STORAGE_KEY && e.newValue) {
        try {
          const freshState = JSON.parse(e.newValue);
          console.log('[MultiTabSync] Detected state change from sibling tab, reconciling...');
          store.state = freshState;
          store.recalculateAll();
          this.handleRoute();
          this.updateNotificationBadge();
        } catch (err) {
          console.warn('[MultiTabSync] Parse error:', err);
        }
      }
    });
  },

  handleRoute: function() {
    const hash = window.location.hash.slice(2) || "dashboard";
    const parts = hash.split("/");
    const route = parts[0] || "dashboard";
    const param = parts[1] || null;

    this.currentRoute = route;
    this.routeParam = param;

    // Update active nav links in sidebar and mobile nav
    this.updateActiveNav(route);

    const mainContainer = document.getElementById("main-content-view");
    if (!mainContainer) return;

    // Route Dispatcher
    switch (route) {
      case "dashboard":
        window.DashboardView.render(mainContainer);
        break;
      case "calendar":
        window.CalendarView.render(mainContainer);
        break;
      case "tasks":
        window.TasksView.render(mainContainer);
        break;
      case "planner":
        window.PlannerView.render(mainContainer);
        break;
      case "subjects":
        window.SubjectsView.render(mainContainer, param);
        break;
      case "examinations":
        window.ExaminationsView.render(mainContainer);
        break;
      case "analytics":
        window.AnalyticsView.render(mainContainer);
        break;
      case "notes":
        window.NotesView.render(mainContainer);
        break;
      case "focus":
        window.FocusView.render(mainContainer);
        break;
      case "settings":
        window.SettingsView.render(mainContainer);
        break;
      default:
        window.DashboardView.render(mainContainer);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  updateActiveNav: function(route) {
    document.querySelectorAll(".nav-link").forEach(link => {
      const linkRoute = link.getAttribute("data-route");
      if (linkRoute === route) {
        link.classList.add("bg-[var(--primary)]", "text-white");
        link.classList.remove("text-[var(--on-surface-variant)]", "hover:bg-[var(--surface-low)]");
      } else {
        link.classList.remove("bg-[var(--primary)]", "text-white");
        link.classList.add("text-[var(--on-surface-variant)]", "hover:bg-[var(--surface-low)]");
      }
    });

    // Mobile nav active
    document.querySelectorAll(".mobile-nav-link").forEach(link => {
      const linkRoute = link.getAttribute("data-route");
      if (linkRoute === route) {
        link.classList.add("text-[var(--primary)]", "font-medium");
        link.classList.remove("text-[var(--on-surface-variant)]");
      } else {
        link.classList.remove("text-[var(--primary)]", "font-medium");
        link.classList.add("text-[var(--on-surface-variant)]");
      }
    });

    // Update Topbar Title & Breadcrumbs
    const pageTitleElem = document.getElementById("topbar-page-title");
    const breadcrumbElem = document.getElementById("topbar-breadcrumb");
    if (pageTitleElem) {
      const titles = {
        dashboard: "Dashboard",
        calendar: "Academic Calendar",
        tasks: "My Tasks",
        planner: "Study Planner",
        subjects: "Subjects & Syllabus",
        examinations: "Examinations",
        analytics: "Progress & Analytics",
        notes: "Notes & Flashcards",
        focus: "Focus Timer",
        settings: "Settings"
      };
      pageTitleElem.textContent = titles[route] || "Dashboard";
      if (breadcrumbElem) {
        breadcrumbElem.textContent = route.charAt(0).toUpperCase() + route.slice(1);
      }
    }
  },

  bindCloudSyncIndicator: function() {
    const dot = document.getElementById("topbar-cloud-dot");
    const text = document.getElementById("topbar-cloud-text");
    if (!dot || !text || !window.SupabaseSync) return;

    const updateIndicator = (syncMgr) => {
      if (syncMgr.status === "connected") {
        dot.className = "w-2 h-2 rounded-full bg-[var(--completed)] transition-colors";
        text.textContent = "Cloud Synced";
      } else if (syncMgr.status === "connecting") {
        dot.className = "w-2 h-2 rounded-full bg-[var(--pending)] transition-colors animate-pulse";
        text.textContent = "Connecting...";
      } else if (syncMgr.status === "table_missing" || syncMgr.status === "error") {
        dot.className = "w-2 h-2 rounded-full bg-[var(--overdue)] transition-colors";
        text.textContent = "Cloud Setup";
      } else {
        dot.className = "w-2 h-2 rounded-full bg-[var(--outline)] transition-colors";
        text.textContent = "Supabase";
      }
    };

    updateIndicator(window.SupabaseSync);
    window.SupabaseSync.subscribe(updateIndicator);
  },

  bindGlobalNavigation: function() {
    const self = this;

    // Sidebar collapse toggle
    const toggleBtn = document.getElementById("sidebar-toggle-btn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        self.setSidebarCollapsed(!self.sidebarCollapsed);
      });
    }

    // Quick Add button in topbar
    const topQuickAdd = document.getElementById("topbar-quick-add-btn");
    if (topQuickAdd) {
      topQuickAdd.addEventListener("click", () => {
        self.openQuickAddModal();
      });
    }

    // Search bar click in topbar
    const topSearch = document.getElementById("topbar-search-trigger");
    if (topSearch) {
      topSearch.addEventListener("click", () => {
        self.openSearchModal();
      });
    }
  },

  setSidebarCollapsed: function(collapsed) {
    this.sidebarCollapsed = collapsed;
    localStorage.setItem("academix_sidebar_collapsed", collapsed ? "true" : "false");

    const sidebar = document.getElementById("app-sidebar");
    const mainWrap = document.getElementById("main-layout-wrapper");

    if (collapsed) {
      if (sidebar) sidebar.classList.add("w-16");
      if (sidebar) sidebar.classList.remove("w-60");
      if (mainWrap) mainWrap.classList.add("md:pl-16");
      if (mainWrap) mainWrap.classList.remove("md:pl-60");
      document.querySelectorAll(".sidebar-label").forEach(el => el.classList.add("hidden"));
    } else {
      if (sidebar) sidebar.classList.remove("w-16");
      if (sidebar) sidebar.classList.add("w-60");
      if (mainWrap) mainWrap.classList.remove("md:pl-16");
      if (mainWrap) mainWrap.classList.add("md:pl-60");
      document.querySelectorAll(".sidebar-label").forEach(el => el.classList.remove("hidden"));
    }
  },

  /* ------------------- GLOBAL SEARCH (⌘K / Ctrl+K) ------------------- */

  bindKeyboardShortcuts: function() {
    const self = this;
    window.addEventListener("keydown", (e) => {
      // ⌘K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        self.openSearchModal();
      }
      // ⌘J or Ctrl+J to toggle AI Copilot
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        const drawer = document.getElementById("ai-copilot-drawer");
        if (drawer) {
          const isHidden = drawer.classList.contains("hidden");
          if (isHidden) {
            drawer.classList.remove("hidden");
            const inp = document.getElementById("ai-chat-input");
            if (inp) setTimeout(() => inp.focus(), 150);
          } else {
            drawer.classList.add("hidden");
          }
        }
      }
      // N for new task
      if (!["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          self.openQuickAddModal("task");
        } else if (e.key === "t" || e.key === "T") {
          e.preventDefault();
          window.location.hash = "#/focus";
        }
      }
      // Escape to close modals
      if (e.key === "Escape") {
        self.closeAllModals();
        const drawer = document.getElementById("ai-copilot-drawer");
        if (drawer) drawer.classList.add("hidden");
      }
    });
  },

  bindSearchModal: function() {
    const modal = document.getElementById("global-search-modal");
    const input = document.getElementById("global-search-input");
    const results = document.getElementById("global-search-results");
    const closeBtn = document.getElementById("global-search-close");

    if (!modal || !input) return;

    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeAllModals());
    }

    modal.addEventListener("click", (e) => {
      if (e.target === modal) this.closeAllModals();
    });

    input.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      if (!q) {
        results.innerHTML = `<div class="p-6 text-center text-xs text-[var(--on-surface-variant)]">Type to search subjects, topics, tasks, notes...</div>`;
        return;
      }

      const store = window.academicStore;
      const state = store.state;

      const subMatches = state.subjects.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
      const taskMatches = state.tasks.filter(t => t.title.toLowerCase().includes(q) || (t.topic && t.topic.toLowerCase().includes(q)));
      const noteMatches = state.notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
      const examMatches = state.examinations.filter(ex => ex.subjectName.toLowerCase().includes(q) || ex.subjectCode.toLowerCase().includes(q));

      let html = "";

      if (subMatches.length > 0) {
        html += `<div class="p-1 font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-wider">Subjects</div>`;
        subMatches.forEach(s => {
          html += `
            <div class="p-2 rounded hover:bg-[var(--surface-low)] cursor-pointer flex items-center justify-between text-xs" onclick="window.App.jumpTo('#/subjects/${s.id}')">
              <span class="font-semibold text-[var(--on-surface)]">[${s.code}] ${s.name}</span>
              <span class="badge badge-neutral text-[10px]">${s.semester}</span>
            </div>
          `;
        });
      }

      if (taskMatches.length > 0) {
        html += `<div class="p-1 mt-2 font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-wider">Tasks & Deliverables</div>`;
        taskMatches.forEach(t => {
          html += `
            <div class="p-2 rounded hover:bg-[var(--surface-low)] cursor-pointer flex items-center justify-between text-xs" onclick="window.App.jumpTo('#/tasks')">
              <span class="text-[var(--on-surface)]">${t.title}</span>
              <span class="badge badge-neutral text-[10px]">${t.dueDate}</span>
            </div>
          `;
        });
      }

      if (examMatches.length > 0) {
        html += `<div class="p-1 mt-2 font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-wider">Examinations</div>`;
        examMatches.forEach(ex => {
          html += `
            <div class="p-2 rounded hover:bg-[var(--surface-low)] cursor-pointer flex items-center justify-between text-xs" onclick="window.App.jumpTo('#/examinations')">
              <span class="font-semibold text-[var(--error)]">${ex.subjectName} (${ex.subjectCode})</span>
              <span class="badge badge-urgent text-[10px]">${ex.examDate || 'TBD'}</span>
            </div>
          `;
        });
      }

      if (noteMatches.length > 0) {
        html += `<div class="p-1 mt-2 font-mono text-[10px] text-[var(--on-surface-variant)] uppercase tracking-wider">Notes</div>`;
        noteMatches.forEach(n => {
          html += `
            <div class="p-2 rounded hover:bg-[var(--surface-low)] cursor-pointer flex items-center justify-between text-xs" onclick="window.App.jumpTo('#/notes')">
              <span class="text-[var(--on-surface)]">${n.title}</span>
              <span class="text-[10px] text-[var(--on-surface-variant)] font-mono">${n.tags ? n.tags.join(', ') : ''}</span>
            </div>
          `;
        });
      }

      if (!html) {
        html = `<div class="p-6 text-center text-xs text-[var(--on-surface-variant)]">No results found for "${q}"</div>`;
      }

      results.innerHTML = html;
    });
  },

  openSearchModal: function() {
    const modal = document.getElementById("global-search-modal");
    const input = document.getElementById("global-search-input");
    if (modal && input) {
      modal.classList.remove("hidden");
      input.value = "";
      input.focus();
      document.getElementById("global-search-results").innerHTML = `
        <div class="p-6 text-center text-xs text-[var(--on-surface-variant)]">Type to search subjects, topics, tasks, notes...</div>
      `;
    }
  },

  /* ------------------- NOTIFICATIONS CENTER ------------------- */

  bindNotificationsCenter: function() {
    const bellBtn = document.getElementById("topbar-notif-btn");
    const flyout = document.getElementById("notif-flyout-panel");
    const closeBtn = document.getElementById("notif-flyout-close");
    const markAllBtn = document.getElementById("notif-mark-all-read");

    if (!bellBtn || !flyout) return;

    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      flyout.classList.toggle("hidden");
      this.renderNotificationList();
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", () => flyout.classList.add("hidden"));
    }

    if (markAllBtn) {
      markAllBtn.addEventListener("click", () => {
        window.academicStore.markAllNotificationsAsRead();
        this.renderNotificationList();
        this.showToast("All notifications marked as read.");
      });
    }

    document.addEventListener("click", (e) => {
      if (!flyout.contains(e.target) && !bellBtn.contains(e.target)) {
        flyout.classList.add("hidden");
      }
    });

    this.updateNotificationBadge();
  },

  updateNotificationBadge: function() {
    const badge = document.getElementById("notif-badge-indicator");
    const store = window.academicStore;
    const unread = (store.state.notifications || []).filter(n => !n.isRead).length;

    if (badge) {
      if (unread > 0) {
        badge.classList.remove("hidden");
        badge.textContent = unread;
      } else {
        badge.classList.add("hidden");
      }
    }
  },

  renderNotificationList: function() {
    const list = document.getElementById("notif-list-container");
    if (!list) return;

    const store = window.academicStore;
    const notifs = store.state.notifications || [];

    if (notifs.length === 0) {
      list.innerHTML = `<div class="p-6 text-center text-xs text-[var(--on-surface-variant)]">No notifications.</div>`;
      this.updateNotificationBadge();
      return;
    }

    list.innerHTML = notifs.map(n => `
      <div class="p-2.5 rounded border border-[var(--border-subtle)] flex items-start justify-between gap-2 ${n.isRead ? 'bg-white opacity-80' : 'bg-[#F0F6F3] border-[var(--primary)]/30'}">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full ${n.isRead ? 'bg-[var(--outline)]' : 'bg-[var(--primary)]'}"></span>
            <span class="text-xs font-semibold text-[var(--on-surface)]">${n.title}</span>
          </div>
          <p class="text-[11px] text-[var(--on-surface-variant)] mt-0.5 leading-snug">${n.message}</p>
          <span class="text-[10px] text-[var(--outline)] font-mono mt-1 block">${n.createdAt ? n.createdAt.slice(0, 16).replace("T", " ") : ''}</span>
        </div>
        <button class="w-6 h-6 flex items-center justify-center text-[var(--outline)] hover:text-[var(--error)] flex-shrink-0" onclick="window.App.clearNotif('${n.id}')">
          <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>
    `).join("");

    this.updateNotificationBadge();
  },

  clearNotif: function(id) {
    window.academicStore.clearNotification(id);
    this.renderNotificationList();
  },

  /* ------------------- QUICK ADD MODAL ------------------- */

  openQuickAddModal: function(defaultTab = "task", defaultSubjectId = "sub-cn") {
    const modal = document.getElementById("quick-add-modal");
    if (!modal) return;

    const store = window.academicStore;
    const subjects = store.state.subjects;

    modal.innerHTML = `
      <div class="layer-modal w-full max-w-lg rounded-xl p-5 flex flex-col gap-4 animate-fade-in" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[var(--primary)]">add_circle</span>
            <h3 class="text-base font-semibold text-[var(--on-surface)]">Create New Item</h3>
          </div>
          <button class="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]" onclick="window.App.closeAllModals()">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Segmented Tab: Task | Study Block | Note -->
        <div class="flex items-center bg-[var(--surface-low)] p-1 rounded-md border border-[var(--border-subtle)]">
          <button id="qa-tab-task" class="qa-type-tab flex-1 py-1 text-xs font-mono rounded font-medium ${defaultTab === 'task' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-type="task">Task</button>
          <button id="qa-tab-session" class="qa-type-tab flex-1 py-1 text-xs font-mono rounded font-medium ${defaultTab === 'session' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-type="session">Study Block</button>
          <button id="qa-tab-note" class="qa-type-tab flex-1 py-1 text-xs font-mono rounded font-medium ${defaultTab === 'note' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-type="note">Note</button>
        </div>

        <!-- Dynamic Form Body -->
        <div id="qa-form-body" class="flex flex-col gap-3">
          <!-- Populated by renderQuickAddForm() -->
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button class="btn-secondary h-8 px-3 text-xs" onclick="window.App.closeAllModals()">Cancel</button>
          <button id="qa-submit-btn" class="btn-primary h-8 px-4 text-xs font-semibold">Save Item</button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    this.renderQuickAddForm(defaultTab, defaultSubjectId);

    // Bind tab clicks
    modal.querySelectorAll(".qa-type-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        modal.querySelectorAll(".qa-type-tab").forEach(t => {
          t.classList.remove("bg-white", "shadow-xs", "text-[var(--primary)]");
          t.classList.add("text-[var(--on-surface-variant)]");
        });
        tab.classList.add("bg-white", "shadow-xs", "text-[var(--primary)]");
        tab.classList.remove("text-[var(--on-surface-variant)]");
        this.renderQuickAddForm(tab.dataset.type, defaultSubjectId);
      });
    });
  },

  renderQuickAddForm: function(type, defaultSubjectId = "sub-cn") {
    const body = document.getElementById("qa-form-body");
    const submitBtn = document.getElementById("qa-submit-btn");
    if (!body) return;

    const subjects = window.academicStore.state.subjects;
    const subOptions = subjects.map(s => `<option value="${s.id}" ${s.id === defaultSubjectId ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join("");

    if (type === "task") {
      body.innerHTML = `
        <div>
          <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Task Title *</label>
          <input type="text" id="qa-title" placeholder="e.g. Solve 5 Master Theorem exercises" class="input-base w-full h-8 text-xs" required />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Subject</label>
            <select id="qa-subject" class="input-base w-full h-8 text-xs py-0">${subOptions}</select>
          </div>
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Priority</label>
            <select id="qa-priority" class="input-base w-full h-8 text-xs py-0">
              <option value="Critical">Critical</option>
              <option value="High" selected>High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Due Date</label>
            <input type="date" id="qa-date" value="${new Date().toISOString().split("T")[0]}" class="input-base w-full h-8 text-xs font-mono" />
          </div>
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Est. Duration (Minutes)</label>
            <input type="number" id="qa-mins" value="60" min="15" step="15" class="input-base w-full h-8 text-xs font-mono" />
          </div>
        </div>
        <div>
          <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Notes / Description</label>
          <textarea id="qa-desc" placeholder="Deliverable details..." class="input-base w-full h-16 text-xs"></textarea>
        </div>
      `;

      submitBtn.onclick = () => {
        const title = document.getElementById("qa-title").value.trim();
        if (!title) { alert("Please provide a task title."); return; }

        window.academicStore.addTask({
          title: title,
          subjectId: document.getElementById("qa-subject").value,
          priority: document.getElementById("qa-priority").value,
          dueDate: document.getElementById("qa-date").value,
          estimatedMinutes: document.getElementById("qa-mins").value,
          description: document.getElementById("qa-desc").value
        });
        window.App.closeAllModals();
        window.App.showToast("Task created successfully.");
        window.App.handleRoute();
      };

    } else if (type === "session") {
      body.innerHTML = `
        <div>
          <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Block Title *</label>
          <input type="text" id="qa-title" placeholder="e.g. DAA Module 1 Practice Block" class="input-base w-full h-8 text-xs" required />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Subject</label>
            <select id="qa-subject" class="input-base w-full h-8 text-xs py-0">${subOptions}</select>
          </div>
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Activity Type</label>
            <select id="qa-activity" class="input-base w-full h-8 text-xs py-0">
              <option value="Learning">Learning</option>
              <option value="Practice">Practice</option>
              <option value="Revision">Revision</option>
              <option value="Timed Model Paper">Timed Model Paper</option>
              <option value="Error Log">Error Log</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-2">
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Date</label>
            <input type="date" id="qa-date" value="${new Date().toISOString().split("T")[0]}" class="input-base w-full h-8 text-xs font-mono" />
          </div>
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Start Time</label>
            <input type="time" id="qa-start" value="18:30" class="input-base w-full h-8 text-xs font-mono" />
          </div>
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">End Time</label>
            <input type="time" id="qa-end" value="20:00" class="input-base w-full h-8 text-xs font-mono" />
          </div>
        </div>
      `;

      submitBtn.onclick = () => {
        const title = document.getElementById("qa-title").value.trim();
        if (!title) { alert("Please provide a title."); return; }

        window.academicStore.addSession({
          title: title,
          subjectId: document.getElementById("qa-subject").value,
          activityType: document.getElementById("qa-activity").value,
          date: document.getElementById("qa-date").value,
          startTime: document.getElementById("qa-start").value,
          endTime: document.getElementById("qa-end").value,
          plannedMinutes: 90
        });
        window.App.closeAllModals();
        window.App.showToast("Study block scheduled.");
        window.App.handleRoute();
      };

    } else if (type === "note") {
      body.innerHTML = `
        <div>
          <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Note Title *</label>
          <input type="text" id="qa-title" placeholder="e.g. DAA Master Theorem Summary" class="input-base w-full h-8 text-xs" required />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Subject</label>
            <select id="qa-subject" class="input-base w-full h-8 text-xs py-0">${subOptions}</select>
          </div>
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Topic / Chapter</label>
            <input type="text" id="qa-topic" placeholder="e.g. Recurrences" class="input-base w-full h-8 text-xs" />
          </div>
        </div>
        <div>
          <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Content (Markdown / Formula)</label>
          <textarea id="qa-content" placeholder="Key definitions, formulas, or reminders..." class="input-base w-full h-24 text-xs font-mono"></textarea>
        </div>
      `;

      submitBtn.onclick = () => {
        const title = document.getElementById("qa-title").value.trim();
        if (!title) { alert("Please provide a note title."); return; }

        window.academicStore.addNote({
          title: title,
          subjectId: document.getElementById("qa-subject").value,
          topic: document.getElementById("qa-topic").value,
          content: document.getElementById("qa-content").value,
          tags: ["Personal"]
        });
        window.App.closeAllModals();
        window.App.showToast("Note saved to knowledge base.");
        window.App.handleRoute();
      };
    }
  },

  openAddSessionModal: function(dateStr) {
    this.openQuickAddModal("session");
    setTimeout(() => {
      const dateInput = document.getElementById("qa-date");
      if (dateInput && dateStr) dateInput.value = dateStr;
    }, 50);
  },

  /* ------------------- RESCHEDULE MODAL ------------------- */

  openRescheduleModal: function(sessionId) {
    const modal = document.getElementById("reschedule-modal");
    if (!modal) return;

    const store = window.academicStore;
    const session = store.state.studySessions.find(s => s.id === sessionId);
    if (!session) return;

    modal.innerHTML = `
      <div class="layer-modal w-full max-w-md rounded-xl p-5 flex flex-col gap-4 animate-fade-in" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[var(--secondary)]">schedule</span>
            <h3 class="text-base font-semibold text-[var(--on-surface)]">Reschedule Session</h3>
          </div>
          <button class="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]" onclick="window.App.closeAllModals()">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div>
          <span class="text-xs font-semibold text-[var(--on-surface)]">${session.title}</span>
          <span class="text-[11px] text-[var(--on-surface-variant)] block font-mono">Current slot: ${session.date} (${session.startTime} - ${session.endTime})</span>
        </div>

        <div class="flex flex-col gap-3">
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">New Date *</label>
            <input type="date" id="resched-date" value="${session.date}" class="input-base w-full h-8 text-xs font-mono" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Start Time</label>
              <input type="time" id="resched-start" value="${session.startTime}" class="input-base w-full h-8 text-xs font-mono" />
            </div>
            <div>
              <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">End Time</label>
              <input type="time" id="resched-end" value="${session.endTime}" class="input-base w-full h-8 text-xs font-mono" />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button class="btn-secondary h-8 px-3 text-xs" onclick="window.App.closeAllModals()">Cancel</button>
          <button id="resched-save-btn" class="btn-primary h-8 px-4 text-xs font-semibold">Save New Time</button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    document.getElementById("resched-save-btn").onclick = () => {
      const newD = document.getElementById("resched-date").value;
      const newS = document.getElementById("resched-start").value;
      const newE = document.getElementById("resched-end").value;

      // Smart Execution Conflict Checking
      if (store.checkSchedulingConflicts) {
        const conflictCheck = store.checkSchedulingConflicts({
          date: newD,
          startTime: newS,
          endTime: newE,
          excludeSessionId: sessionId
        });
        if (conflictCheck.hasConflict) {
          alert("Scheduling Constraint Violation:\n• " + conflictCheck.conflicts.join("\n• "));
          return;
        }
      }

      store.rescheduleSession(sessionId, newD, newS, newE);
      window.App.closeAllModals();
      window.App.showToast(`Session moved to ${newD}.`);
      window.App.handleRoute();
    };
  },

  /* ------------------- STUDY PLAN REGENERATION PREVIEW MODAL (Part 19) ------------------- */

  openPlanRegenModal: function() {
    const modal = document.getElementById("plan-regen-modal");
    if (!modal) return;

    const store = window.academicStore;
    const proposed = store.generateProposedStudyPlan();

    modal.innerHTML = `
      <div class="layer-modal w-full max-w-xl rounded-xl p-5 flex flex-col gap-4 animate-fade-in" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[var(--primary)]">auto_awesome</span>
            <div>
              <h3 class="text-base font-semibold text-[var(--on-surface)]">Proposed Study Plan Re-alignment</h3>
              <p class="text-xs text-[var(--on-surface-variant)]">Prioritized by upcoming exam countdowns & incomplete modules</p>
            </div>
          </div>
          <button class="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]" onclick="window.App.closeAllModals()">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Proposed Sessions List -->
        <div class="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
          ${proposed.map(item => `
            <div class="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-low)] flex items-start justify-between gap-3 text-xs">
              <div>
                <div class="flex items-center gap-2">
                  <span class="badge badge-neutral font-bold">${item.subjectCode}</span>
                  <span class="font-mono text-[var(--primary)] font-semibold">${item.date} (${item.startTime}-${item.endTime})</span>
                </div>
                <div class="font-semibold text-[var(--on-surface)] mt-1">${item.subjectName}: ${item.moduleTitle}</div>
                <div class="text-[11px] text-[var(--on-surface-variant)] font-mono mt-0.5">${item.reason}</div>
              </div>
              <span class="badge badge-exam flex-shrink-0">${item.activityType}</span>
            </div>
          `).join("")}
        </div>

        <div class="p-2.5 rounded bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-xs text-[var(--primary)] font-mono">
          <strong>Safe Constraint:</strong> Sleep schedule (22:45) is strictly protected. No overlapping blocks.
        </div>

        <!-- Action buttons -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button class="btn-secondary h-8 px-3 text-xs" onclick="window.App.closeAllModals()">Discard</button>
          <button id="regen-apply-all-btn" class="btn-primary h-8 px-4 text-xs font-semibold">Apply Proposed Schedule</button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    document.getElementById("regen-apply-all-btn").onclick = () => {
      store.applyProposedStudyPlan(proposed);
      window.App.closeAllModals();
      window.App.showToast("Applied re-aligned study plan.");
      window.App.handleRoute();
    };
  },

  /* ------------------- EDIT EXAM DATE MODAL (Part 8.4) ------------------- */

  openEditExamDateModal: function(examId) {
    const modal = document.getElementById("edit-exam-modal");
    if (!modal) return;

    const store = window.academicStore;
    const exam = store.state.examinations.find(e => e.id === examId);
    if (!exam) return;

    modal.innerHTML = `
      <div class="layer-modal w-full max-w-md rounded-xl p-5 flex flex-col gap-4 animate-fade-in" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[var(--error)]">edit_calendar</span>
            <h3 class="text-base font-semibold text-[var(--on-surface)]">Edit Examination Date</h3>
          </div>
          <button class="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]" onclick="window.App.closeAllModals()">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div>
          <span class="text-sm font-semibold text-[var(--on-surface)]">${exam.subjectName} (${exam.subjectCode})</span>
          <span class="text-xs text-[var(--on-surface-variant)] block font-mono">Current: ${exam.examDate || 'TBD'} (${exam.confidenceNote})</span>
        </div>

        <div class="flex flex-col gap-3">
          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">New Examination Date *</label>
            <input type="date" id="exam-new-date" value="${exam.examDate || '2026-11-23'}" class="input-base w-full h-8 text-xs font-mono" />
          </div>

          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Status / Source</label>
            <select id="exam-new-status" class="input-base w-full h-8 text-xs py-0">
              <option value="Confirmed Official Timetable">Confirmed Official Timetable</option>
              <option value="Provisional Notification">Provisional Notification</option>
              <option value="Rescheduled by KTU">Rescheduled by KTU</option>
            </select>
          </div>
        </div>

        <div class="p-2.5 rounded bg-[var(--surface-low)] text-[11px] text-[var(--on-surface-variant)] leading-snug">
          Changing this date updates countdowns everywhere and recalculates revision targets.
        </div>

        <div class="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button class="btn-secondary h-8 px-3 text-xs" onclick="window.App.closeAllModals()">Cancel</button>
          <button id="exam-save-date-btn" class="btn-primary h-8 px-4 text-xs font-semibold">Update Date</button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    document.getElementById("exam-save-date-btn").onclick = () => {
      const newD = document.getElementById("exam-new-date").value;
      const newS = document.getElementById("exam-new-status").value;

      store.updateExamDate(examId, newD, newS);
      window.App.closeAllModals();
      window.App.showToast(`Updated ${exam.subjectCode} exam date to ${newD}.`);
      window.App.handleRoute();
    };
  },

  /* ------------------- TOAST NOTIFICATIONS ------------------- */

  showToast: function(message) {
    const toast = document.getElementById("global-toast");
    const text = document.getElementById("global-toast-text");
    if (!toast || !text) return;

    text.textContent = message;
    toast.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
    toast.classList.add("opacity-100", "translate-y-0");

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
      toast.classList.remove("opacity-100", "translate-y-0");
    }, 2800);
  },

  closeAllModals: function() {
    document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.add("hidden"));
    const flyout = document.getElementById("notif-flyout-panel");
    if (flyout) flyout.classList.add("hidden");
  },

  bindAICopilot: function() {
    const drawer = document.getElementById("ai-copilot-drawer");
    const backdrop = document.getElementById("ai-drawer-backdrop");
    const closeBtn = document.getElementById("ai-drawer-close");
    const topbarBtn = document.getElementById("topbar-ai-btn");
    const sidebarBtn = document.getElementById("sidebar-ai-copilot-btn");
    const form = document.getElementById("ai-chat-form");
    const input = document.getElementById("ai-chat-input");
    const sendBtn = document.getElementById("ai-chat-send-btn");
    const msgContainer = document.getElementById("ai-messages-container");

    this.chatHistory = [];

    const toggleDrawer = (open) => {
      if (!drawer) return;
      if (open) {
        drawer.classList.remove("hidden");
        setTimeout(() => input && input.focus(), 150);
      } else {
        drawer.classList.add("hidden");
      }
    };

    if (topbarBtn) topbarBtn.addEventListener("click", () => toggleDrawer(true));
    if (sidebarBtn) sidebarBtn.addEventListener("click", () => toggleDrawer(true));
    if (closeBtn) closeBtn.addEventListener("click", () => toggleDrawer(false));
    if (backdrop) backdrop.addEventListener("click", () => toggleDrawer(false));

    // Quick pills
    document.querySelectorAll(".ai-quick-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        if (!input) return;
        input.value = pill.getAttribute("data-prompt");
        if (form) form.dispatchEvent(new Event("submit"));
      });
    });

    // Enter without shift submits
    if (input) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (form) form.dispatchEvent(new Event("submit"));
        }
      });
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = (input.value || "").trim();
        if (!text || !window.AIService || window.AIService.isGenerating) return;

        // Append user bubble
        const userBubble = document.createElement("div");
        userBubble.className = "self-end max-w-[85%] rounded-lg p-3 bg-[var(--primary)] text-white text-xs leading-relaxed";
        userBubble.textContent = text;
        msgContainer.appendChild(userBubble);
        input.value = "";
        msgContainer.scrollTop = msgContainer.scrollHeight;

        // Append AI loading bubble
        const aiBubble = document.createElement("div");
        aiBubble.className = "self-start max-w-[95%] rounded-lg p-3 bg-[var(--surface-low)] border border-[var(--border-subtle)] text-xs text-[var(--on-surface)] flex flex-col gap-2";
        aiBubble.innerHTML = `
          <div class="flex items-center gap-2 text-[var(--primary)] font-medium">
            <span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
            <span>Gemini is thinking...</span>
          </div>
        `;
        msgContainer.appendChild(aiBubble);
        msgContainer.scrollTop = msgContainer.scrollHeight;

        if (sendBtn) sendBtn.disabled = true;

        try {
          const res = await window.AIService.askCopilot(text, this.chatHistory);
          const formattedHtml = window.AIService.renderMarkdown(res.text);

          aiBubble.innerHTML = `
            <div class="flex items-center justify-between pb-1.5 border-b border-[var(--border-subtle)]/60 text-[10px] font-mono text-[var(--on-surface-variant)]">
              <span class="flex items-center gap-1 text-[var(--primary)] font-semibold">
                <span class="material-symbols-outlined text-[13px]">auto_awesome</span>
                <span>Academix AI (${res.source === 'offline-engine' ? 'Offline Engine' : 'Gemini 3.5'})</span>
              </span>
              <div class="flex items-center gap-1.5">
                <button class="ai-copy-btn hover:text-[var(--on-surface)]" title="Copy text">
                  <span class="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
                <button class="ai-save-note-btn text-[var(--primary)] hover:underline flex items-center gap-0.5" title="Save to Notes Vault">
                  <span class="material-symbols-outlined text-[13px]">bookmark_add</span>
                  <span>Save Note</span>
                </button>
              </div>
            </div>
            <div class="ai-rendered-content leading-relaxed pt-1">
              ${formattedHtml}
            </div>
            ${(text.toLowerCase().includes("recovery") || text.toLowerCase().includes("overdue") || text.toLowerCase().includes("backlog") || text.toLowerCase().includes("reschedule")) ? `
              <div class="pt-2 border-t border-[var(--border-subtle)]/50 mt-1">
                <button class="btn-primary h-7 px-3 text-xs font-mono flex items-center gap-1.5" onclick="window.TasksView.openRecoveryModal()">
                  <span class="material-symbols-outlined text-[14px]">auto_fix_high</span>
                  <span>Review & Approve Recovery Proposals</span>
                </button>
              </div>
            ` : ''}
          `;

          // Bind copy button
          const copyBtn = aiBubble.querySelector(".ai-copy-btn");
          if (copyBtn) {
            copyBtn.onclick = () => {
              navigator.clipboard.writeText(res.text).then(() => window.App.showToast("Copied to clipboard!"));
            };
          }

          // Bind save note button
          const saveNoteBtn = aiBubble.querySelector(".ai-save-note-btn");
          if (saveNoteBtn) {
            saveNoteBtn.onclick = () => {
              window.academicStore.state.notes.unshift({
                id: "note-ai-" + Date.now(),
                title: "AI Study Note: " + text.slice(0, 30) + "...",
                subjectId: "CS301",
                content: res.text,
                pinned: true,
                updatedAt: new Date().toISOString()
              });
              window.academicStore.saveState();
              window.App.showToast("Saved to Notes Vault (#/notes)!");
            };
          }

          this.chatHistory.push({ role: "user", text });
          this.chatHistory.push({ role: "model", text: res.text });
        } catch (err) {
          aiBubble.innerHTML = `<span class="text-[var(--error)]">Error: ${err.message || 'Could not reach AI service.'}</span>`;
        } finally {
          if (sendBtn) sendBtn.disabled = false;
          msgContainer.scrollTop = msgContainer.scrollHeight;
        }
      });
    }
  },

  bindAITopicModal: function() {
    const modal = document.getElementById("ai-topic-modal");
    if (!modal) return;
    const closeBtn = document.getElementById("ai-topic-modal-close");
    const copyBtn = document.getElementById("ai-topic-copy-btn");
    const saveNoteBtn = document.getElementById("ai-topic-save-notes-btn");
    const tabs = document.querySelectorAll(".ai-mode-tab");

    if (closeBtn) closeBtn.onclick = () => modal.classList.add("hidden");
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    };

    let currentSubject = "";
    let currentTopic = "";
    let currentMode = "exam";
    let lastGeneratedText = "";

    window.openAITopicAssistant = async (subjectName, topicTitle) => {
      currentSubject = subjectName;
      currentTopic = topicTitle;
      currentMode = "exam";

      document.getElementById("ai-topic-modal-title").textContent = topicTitle;
      document.getElementById("ai-topic-modal-subject").textContent = subjectName;
      modal.classList.remove("hidden");

      // Reset tabs
      tabs.forEach(t => {
        if (t.dataset.mode === "exam") {
          t.className = "ai-mode-tab active px-3 py-1 rounded bg-[var(--primary)] text-white font-medium";
        } else {
          t.className = "ai-mode-tab px-3 py-1 rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]";
        }
      });

      loadContent();
    };

    const loadContent = async () => {
      const container = document.getElementById("ai-topic-content");
      const status = document.getElementById("ai-topic-status");
      container.innerHTML = `
        <div class="flex items-center justify-center py-12 text-[var(--on-surface-variant)] gap-2">
          <span class="material-symbols-outlined text-[20px] animate-spin text-[var(--primary)]">progress_activity</span>
          <span>Generating ${currentMode} breakdown via Gemini 3.5...</span>
        </div>
      `;
      status.textContent = "Generating...";

      try {
        let res;
        if (currentMode === "quiz") {
          res = await window.AIService.generateQuiz(currentSubject, currentTopic, 3);
        } else if (currentMode === "flashcards") {
          res = await window.AIService.generateFlashcards(currentSubject, currentTopic);
        } else {
          res = await window.AIService.explainTopic(currentSubject, currentTopic, currentMode);
        }

        lastGeneratedText = res.text;
        container.innerHTML = window.AIService.renderMarkdown(res.text);
        status.textContent = `Generated via ${res.source === 'offline-engine' ? 'Academic Engine' : 'Gemini 3.5 Flash'}`;
      } catch (e) {
        container.innerHTML = `<span class="text-[var(--error)]">Failed to generate: ${e.message}</span>`;
        status.textContent = "Error";
      }
    };

    tabs.forEach(tab => {
      tab.onclick = () => {
        tabs.forEach(t => t.className = "ai-mode-tab px-3 py-1 rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]");
        tab.className = "ai-mode-tab active px-3 py-1 rounded bg-[var(--primary)] text-white font-medium";
        currentMode = tab.dataset.mode;
        loadContent();
      };
    });

    if (copyBtn) {
      copyBtn.onclick = () => {
        if (!lastGeneratedText) return;
        navigator.clipboard.writeText(lastGeneratedText).then(() => window.App.showToast("Copied to clipboard!"));
      };
    }

    if (saveNoteBtn) {
      saveNoteBtn.onclick = () => {
        if (!lastGeneratedText) return;
        window.academicStore.state.notes.unshift({
          id: "note-ai-" + Date.now(),
          title: `${currentSubject}: ${currentTopic}`,
          subjectId: "CS301",
          content: lastGeneratedText,
          pinned: true,
          updatedAt: new Date().toISOString()
        });
        window.academicStore.saveState();
        window.App.showToast("Saved to Notes Vault (#/notes)!");
      };
    }
  },

  jumpTo: function(hash) {
    this.closeAllModals();
    window.location.hash = hash;
  }
};

// Initialize on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  window.App.init();
});

