/**
 * Academix - Settings & Configuration System
 * Includes Profile, Academic Parameters, Supabase Cloud Sync & Local Persistence
 */

window.SettingsView = {
  render: function(container) {
    const store = window.academicStore;
    const p = store.state.profile || {};
    const subSync = window.SupabaseSync || { status: "unconfigured", url: "", anonKey: "" };

    const getSupabaseBadge = () => {
      if (subSync.status === "connected") {
        return `<span class="badge badge-completed" id="supabase-status-badge">● Connected (${subSync.lastSyncTime ? 'Synced ' + new Date(subSync.lastSyncTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Live'})</span>`;
      } else if (subSync.status === "connecting") {
        return `<span class="badge badge-pending" id="supabase-status-badge">● Connecting...</span>`;
      } else if (subSync.status === "table_missing") {
        return `<span class="badge badge-overdue" id="supabase-status-badge">▲ Schema Setup Required</span>`;
      } else if (subSync.status === "error") {
        return `<span class="badge badge-overdue" id="supabase-status-badge">✕ Connection Error</span>`;
      }
      return `<span class="badge badge-pending" id="supabase-status-badge">○ Ready to Connect</span>`;
    };

    container.innerHTML = `
      <div class="flex flex-col gap-6 max-w-4xl pb-12">
        
        <!-- Header -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="badge badge-neutral font-mono">Preferences</span>
            <span class="badge badge-completed font-mono">KTU 2024 Scheme</span>
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-[var(--on-surface)]">Application Settings</h1>
          <p class="text-xs text-[var(--on-surface-variant)]">Manage student profile, Supabase cloud sync, backup data and examination deadlines.</p>
        </div>

        <!-- Section 1: Supabase Cloud Database Sync -->
        <div class="layer-card p-4 flex flex-col gap-4 border-2 border-[var(--primary)]/20 shadow-xs">
          <div class="pb-2 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  <path d="M12 6L7 11.5L12 17L17 11.5L12 6Z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-[var(--on-surface)] flex items-center gap-2">
                  <span>Supabase Cloud Sync</span>
                  <span class="font-mono text-[10px] text-[var(--primary)] bg-[var(--primary-subtle)] px-2 py-0.5 rounded">Project: lwacsamezwymumwbuteh</span>
                </h3>
                <p class="text-xs text-[var(--on-surface-variant)]">Persist study sessions, syllabus completion & analytics seamlessly across all your devices.</p>
              </div>
            </div>
            ${getSupabaseBadge()}
          </div>

          <!-- Supabase Form Inputs -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-[var(--on-surface)] flex items-center gap-1">
                <span>Supabase Project URL</span>
                <span class="font-mono text-[10px] text-[var(--outline)]">(Read-Only)</span>
              </label>
              <input type="text" id="sb-url" value="${subSync.url || 'https://lwacsamezwymumwbuteh.supabase.co'}" class="input-base font-mono text-xs bg-[var(--surface-inset)]" placeholder="https://lwacsamezwymumwbuteh.supabase.co" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-[var(--on-surface)] flex items-center justify-between">
                <span>Supabase Anon Public API Key</span>
                <a href="https://supabase.com/dashboard/project/lwacsamezwymumwbuteh/settings/api" target="_blank" rel="noopener" class="font-mono text-[10px] text-[var(--primary)] hover:underline flex items-center gap-0.5">
                  <span>Get Anon Key</span>
                  <span class="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>
              </label>
              <div class="relative flex items-center">
                <input type="password" id="sb-anon-key" value="${subSync.anonKey || ''}" class="input-base font-mono text-xs pr-9 w-full" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
                <button type="button" id="sb-toggle-key-visibility" class="absolute right-2 text-[var(--outline)] hover:text-[var(--on-surface)]" title="Toggle visibility">
                  <span class="material-symbols-outlined text-[16px]">visibility</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Auto-Sync Checkbox & Buttons -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label class="flex items-center gap-2 cursor-pointer text-xs select-none">
              <input type="checkbox" id="sb-autosync-toggle" class="rounded accent-[var(--primary)] w-4 h-4" ${subSync.autoSyncEnabled ? 'checked' : ''} />
              <span class="font-medium text-[var(--on-surface)]">Auto-sync on changes</span>
              <span class="text-[var(--on-surface-variant)] text-[11px]">(Realtime debounced cloud persistence)</span>
            </label>

            <div class="flex items-center gap-2">
              <button id="sb-save-connect-btn" class="btn-primary h-8 px-3.5 text-xs font-mono">
                <span class="material-symbols-outlined text-[15px]">cloud_sync</span>
                <span>Connect & Test</span>
              </button>
              <button id="sb-push-btn" class="btn-secondary h-8 px-3 text-xs font-mono" title="Upload local timetable & progress to cloud">
                <span class="material-symbols-outlined text-[15px]">cloud_upload</span>
                <span>Push State</span>
              </button>
              <button id="sb-pull-btn" class="btn-secondary h-8 px-3 text-xs font-mono" title="Download state from Supabase to browser">
                <span class="material-symbols-outlined text-[15px]">cloud_download</span>
                <span>Pull State</span>
              </button>
            </div>
          </div>

          <!-- SQL Schema Accordion for Supabase Dashboard -->
          <details class="text-xs bg-[var(--surface-low)] rounded-lg border border-[var(--border-subtle)] p-3 cursor-pointer group">
            <summary class="font-semibold text-[var(--on-surface)] flex items-center justify-between select-none list-none">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px] text-[var(--primary)]">terminal</span>
                <span>Supabase PostgreSQL Schema Setup (Click to view SQL script)</span>
              </div>
              <span class="material-symbols-outlined text-[16px] text-[var(--outline)] transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div class="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex flex-col gap-2">
              <p class="text-[var(--on-surface-variant)] text-[11px]">
                Paste this into your <a href="https://supabase.com/dashboard/project/lwacsamezwymumwbuteh/sql/new" target="_blank" rel="noopener" class="text-[var(--primary)] underline font-mono">Supabase SQL Editor</a> to initialize the <code class="font-mono bg-[var(--surface-inset)] px-1 py-0.5 rounded">academix_state</code> table with RLS enabled:
              </p>
              <pre class="bg-[var(--surface-lowest)] border border-[var(--border-subtle)] rounded p-2.5 font-mono text-[11px] text-[var(--on-surface)] overflow-x-auto select-all leading-relaxed">
create table if not exists public.academix_state (
  id text primary key,
  user_id text not null default 'rebin',
  state jsonb not null,
  version text default 'v3',
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.academix_state enable row level security;

create policy "Allow all access"
  on public.academix_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.academix_state;</pre>
              <div class="flex items-center justify-end">
                <button type="button" id="sb-copy-sql-btn" class="btn-secondary h-7 px-2.5 text-[11px] font-mono">
                  <span class="material-symbols-outlined text-[14px]">content_copy</span>
                  <span>Copy SQL to Clipboard</span>
                </button>
              </div>
            </div>
          </details>
        </div>

        <!-- Section 2: AI Study Copilot & Gemini Engine -->
        <div class="layer-card p-4 flex flex-col gap-4 border-2 border-[var(--primary)]/20 shadow-xs">
          <div class="pb-2 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <span class="material-symbols-outlined text-[18px]">auto_awesome</span>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-[var(--on-surface)] flex items-center gap-2">
                  <span>AI Study Copilot & Gemini Engine</span>
                  <span class="badge badge-completed text-[9px] font-mono">Gemini 3.5 Flash</span>
                </h3>
                <p class="text-xs text-[var(--on-surface-variant)]">Generates in-syllabus 2-mark/10-mark KTU exam answers, practice quizzes, and study guidance.</p>
              </div>
            </div>
            <span class="badge badge-completed" id="ai-engine-status-badge">● Live API Ready</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-[var(--on-surface)] flex items-center justify-between">
                <span>Google Gemini API Key</span>
                <span class="font-mono text-[10px] text-[var(--completed)]">Active & Connected</span>
              </label>
              <div class="relative flex items-center">
                <input type="password" id="ai-api-key" value="${window.AIService ? window.AIService.getKey() : ''}" class="input-base font-mono text-xs pr-9 w-full" placeholder="Enter your Gemini API key..." />
                <button type="button" id="ai-toggle-key-visibility" class="absolute right-2 text-[var(--outline)] hover:text-[var(--on-surface)]" title="Toggle visibility">
                  <span class="material-symbols-outlined text-[16px]">visibility</span>
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-[var(--on-surface)]">Selected AI Model</label>
              <select id="ai-model-select" class="input-base text-xs font-mono">
                <option value="gemini-3.5-flash" selected>gemini-3.5-flash (Fast, accurate & responsive)</option>
                <option value="gemini-flash-latest">gemini-flash-latest (Dynamic latest flash)</option>
                <option value="gemini-3.6-flash">gemini-3.6-flash (KTU specialized)</option>
                <option value="gemini-3.8-flash">gemini-3.8-flash (High intelligence)</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-between pt-1">
            <span class="text-[11px] text-[var(--on-surface-variant)] font-mono">
              Press <kbd class="px-1.5 py-0.5 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] text-[10px]">Ctrl + J</kbd> or click <strong>AI Copilot</strong> in topbar anytime.
            </span>
            <button id="ai-test-key-btn" class="btn-primary h-8 px-3.5 text-xs font-mono">
              <span class="material-symbols-outlined text-[15px]">verified</span>
              <span>Test AI Connection</span>
            </button>
          </div>
        </div>

        <!-- Section 3: Student Profile -->
        <div class="layer-card p-4 flex flex-col gap-4">
          <div class="pb-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[var(--on-surface)]">Student Profile</h3>
              <p class="text-xs text-[var(--on-surface-variant)]">University and branch credentials for KTU 2024 Scheme</p>
            </div>
            <span class="badge badge-neutral font-mono">ID: ${p.id || 'user-rebin'}</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-[var(--on-surface)]">Full Name</label>
              <input type="text" id="set-name" value="${p.name || 'Rebin'}" class="input-base text-xs" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-[var(--on-surface)]">Student Email</label>
              <input type="email" id="set-email" value="${p.email || 'rebin.student@ktu.edu.in'}" class="input-base text-xs" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-[var(--on-surface)]">Branch / Discipline</label>
              <input type="text" id="set-branch" value="${p.branch || 'Computer Science & Engineering'}" class="input-base text-xs" />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-[var(--on-surface)]">Current Semester & Scheme</label>
              <input type="text" id="set-scheme" value="${p.scheme || '2024 Scheme • S5 + 9 Backlogs'}" class="input-base text-xs" />
            </div>
          </div>
        </div>

        <!-- Section: Smart Execution & Recovery Engine Preferences -->
        <div class="layer-card p-4 flex flex-col gap-4">
          <div class="pb-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-7 h-7 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs">
                <span class="material-symbols-outlined text-[16px]">tune</span>
              </span>
              <div>
                <h3 class="text-sm font-semibold text-[var(--on-surface)]">Smart Execution Engine Preferences</h3>
                <p class="text-xs text-[var(--on-surface-variant)]">Algorithm weights, quiet hours, and sleep protection rules</p>
              </div>
            </div>
            <span class="badge badge-completed font-mono text-[10px]">Active</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div class="p-3 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <div>
                <span class="font-bold text-[var(--on-surface)]">Bedtime Protection Boundary</span>
                <p class="text-[11px] text-[var(--on-surface-variant)] mt-1">Strict hard constraint: zero study sessions permitted past this time.</p>
              </div>
              <div class="mt-2 flex items-center justify-between font-mono">
                <span class="badge badge-completed font-bold">22:45 IST</span>
                <span class="text-[10px] text-[var(--outline)]">Protected</span>
              </div>
            </div>

            <div class="p-3 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <div>
                <span class="font-bold text-[var(--on-surface)]">Quiet Hours Window</span>
                <p class="text-[11px] text-[var(--on-surface-variant)] mt-1">Notifications and alerts are silenced automatically.</p>
              </div>
              <div class="mt-2 flex items-center justify-between font-mono">
                <span class="badge badge-neutral">23:00 - 06:00</span>
                <span class="text-[10px] text-[var(--outline)]">Sleep Safe</span>
              </div>
            </div>

            <div class="p-3 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col justify-between">
              <div>
                <span class="font-bold text-[var(--on-surface)]">Spaced Revision Intervals</span>
                <p class="text-[11px] text-[var(--on-surface-variant)] mt-1">Default review stages: R1, R2, R3, R4, and Final pre-exam.</p>
              </div>
              <div class="mt-2 flex items-center justify-between font-mono">
                <span class="badge badge-neutral">D+1, D+3, D+7, D+14</span>
                <span class="text-[10px] text-[var(--outline)]">Adaptive</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Local Node.js Disk Persistence -->
        <div class="layer-card p-4 flex flex-col gap-3">
          <div class="pb-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[var(--on-surface)]">Local Server Disk Persistence</h3>
              <p class="text-xs text-[var(--on-surface-variant)]">Secondary backup via local Node.js REST server</p>
            </div>
            <span class="badge ${store.backendStatus === 'connected' ? 'badge-completed' : 'badge-pending'}" id="set-backend-badge">
              ${store.backendStatus === 'connected' ? '● Live Server DB Connected' : '○ Offline Mode'}
            </span>
          </div>

          <div class="p-3 rounded bg-[var(--surface-low)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div>
              <div class="font-mono text-[11px] text-[var(--on-surface)] flex items-center gap-1.5 font-semibold">
                <span class="material-symbols-outlined text-[16px] text-[var(--primary)]">dns</span>
                <span>REST API: http://localhost:3000/api/state</span>
              </div>
              <p class="text-[var(--on-surface-variant)] mt-1">
                Data persists automatically to <code class="font-mono px-1 py-0.5 rounded bg-[var(--surface-inset)]">data/academix_db.json</code> whenever you study, tick off topics, or log focus timers.
              </p>
            </div>
            <button id="set-sync-now-btn" class="btn-secondary h-8 px-3 text-xs font-mono shrink-0">
              <span class="material-symbols-outlined text-[15px]">sync</span>
              <span>Sync with Local Disk</span>
            </button>
          </div>
        </div>

        <!-- Section 4: Data Management & Clean Slate -->
        <div class="layer-card p-4 flex flex-col gap-3">
          <div class="pb-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-[var(--on-surface)]">Data Management & Clean Slate</h3>
              <p class="text-xs text-[var(--on-surface-variant)]">Export, restore, or reset progress</p>
            </div>
            <span class="material-symbols-outlined text-[20px] text-[var(--outline)]">database</span>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-1">
            <button id="set-export-btn" class="btn-secondary h-9 px-3.5 text-xs font-mono">
              <span class="material-symbols-outlined text-[16px]">download</span>
              <span>Export State (JSON)</span>
            </button>

            <label class="btn-secondary h-9 px-3.5 text-xs font-mono cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">upload</span>
              <span>Import State (JSON)</span>
              <input type="file" id="set-import-file" accept=".json" class="hidden" />
            </label>

            <button id="set-clean-slate-btn" class="btn-primary h-9 px-3.5 text-xs font-mono ml-auto">
              <span class="material-symbols-outlined text-[16px]">cleaning_services</span>
              <span>Clean Slate (Reset Progress to 0%)</span>
            </button>

            <button id="set-reset-defaults-btn" class="btn-danger h-9 px-3.5 text-xs font-mono">
              <span class="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex items-center justify-end gap-2 pt-2">
          <button id="set-save-btn" class="btn-primary h-10 px-5 text-xs font-semibold">
            <span class="material-symbols-outlined text-[18px]">save</span>
            <span>Save Profile Settings</span>
          </button>
        </div>

      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents: function(container) {
    const store = window.academicStore;
    const subSync = window.SupabaseSync;

    // Toggle password visibility for Supabase anon key
    const toggleKeyBtn = container.querySelector("#sb-toggle-key-visibility");
    const anonKeyInput = container.querySelector("#sb-anon-key");
    if (toggleKeyBtn && anonKeyInput) {
      toggleKeyBtn.addEventListener("click", () => {
        const isPass = anonKeyInput.type === "password";
        anonKeyInput.type = isPass ? "text" : "password";
        toggleKeyBtn.querySelector("span").textContent = isPass ? "visibility_off" : "visibility";
      });
    }

    // Copy SQL to clipboard
    const copySqlBtn = container.querySelector("#sb-copy-sql-btn");
    if (copySqlBtn) {
      copySqlBtn.addEventListener("click", () => {
        const sql = `create table if not exists public.academix_state (
  id text primary key,
  user_id text not null default 'rebin',
  state jsonb not null,
  version text default 'v3',
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.academix_state enable row level security;

create policy "Allow all access"
  on public.academix_state
  for all
  to anon, authenticated
  using (true)
  with check (true);

alter publication supabase_realtime add table public.academix_state;`;
        navigator.clipboard.writeText(sql).then(() => {
          window.App.showToast("SQL snippet copied to clipboard!");
          copySqlBtn.innerHTML = `<span class="material-symbols-outlined text-[14px] text-[var(--completed)]">check</span><span>Copied!</span>`;
          setTimeout(() => {
            copySqlBtn.innerHTML = `<span class="material-symbols-outlined text-[14px]">content_copy</span><span>Copy SQL to Clipboard</span>`;
          }, 2000);
        });
      });
    }

    // Connect & Test Supabase
    const connectBtn = container.querySelector("#sb-save-connect-btn");
    if (connectBtn && subSync) {
      connectBtn.addEventListener("click", async () => {
        const url = container.querySelector("#sb-url").value;
        const key = container.querySelector("#sb-anon-key").value;
        const autoSync = container.querySelector("#sb-autosync-toggle").checked;

        if (!key) {
          alert("Please enter your Supabase Anon Public Key. You can copy it from your Supabase Dashboard under Project Settings > API.");
          return;
        }

        connectBtn.disabled = true;
        connectBtn.innerHTML = `<span class="material-symbols-outlined text-[15px] animate-spin">sync</span><span>Connecting...</span>`;

        subSync.configure(url, key, autoSync);
        const ok = await subSync.testConnection();

        connectBtn.disabled = false;
        connectBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">cloud_sync</span><span>Connect & Test</span>`;

        const badge = container.querySelector("#supabase-status-badge");
        if (ok) {
          window.App.showToast("Connected to Supabase project lwacsamezwymumwbuteh!");
          if (badge) {
            badge.className = "badge badge-completed";
            badge.textContent = "● Connected (Live)";
          }
          // Push current state
          await subSync.pushState(store.state);
        } else {
          if (subSync.status === "table_missing") {
            alert("Connected to Supabase, but table 'academix_state' does not exist yet.\n\nPlease open the 'Supabase PostgreSQL Schema Setup' section below, copy the SQL, and run it in your Supabase SQL Editor!");
          } else {
            alert("Could not connect to Supabase: " + (subSync.lastError || "Check URL and Anon Key"));
          }
        }
      });
    }

    // Push State to Supabase
    const pushBtn = container.querySelector("#sb-push-btn");
    if (pushBtn && subSync) {
      pushBtn.addEventListener("click", async () => {
        if (!subSync.client) {
          alert("Please enter your Supabase Anon Key and click 'Connect & Test' first.");
          return;
        }
        pushBtn.disabled = true;
        pushBtn.innerHTML = `<span class="material-symbols-outlined text-[15px] animate-spin">cloud_upload</span><span>Uploading...</span>`;
        const res = await subSync.pushState(store.state);
        pushBtn.disabled = false;
        pushBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">cloud_upload</span><span>Push State</span>`;
        if (res.success) {
          window.App.showToast("Academix state successfully pushed to Supabase Cloud!");
        } else {
          alert("Push failed: " + (res.error ? res.error.message : res.reason));
        }
      });
    }

    // Pull State from Supabase
    const pullBtn = container.querySelector("#sb-pull-btn");
    if (pullBtn && subSync) {
      pullBtn.addEventListener("click", async () => {
        if (!subSync.client) {
          alert("Please enter your Supabase Anon Key and click 'Connect & Test' first.");
          return;
        }
        pullBtn.disabled = true;
        pullBtn.innerHTML = `<span class="material-symbols-outlined text-[15px] animate-spin">cloud_download</span><span>Downloading...</span>`;
        const res = await subSync.pullState();
        pullBtn.disabled = false;
        pullBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">cloud_download</span><span>Pull State</span>`;
        if (res.success && res.state) {
          if (confirm("Replace local browser state with state from Supabase Cloud?")) {
            store.state = res.state;
            store.recalculateAll();
            store.saveState();
            window.App.showToast("State successfully loaded from Supabase Cloud!");
            window.location.reload();
          }
        } else if (res.empty) {
          alert("Supabase table is currently empty. Click 'Push State' to seed your study data to the cloud!");
        } else {
          alert("Pull failed: " + (res.error ? res.error.message : res.reason));
        }
      });
    }

    // AI Settings: toggle key visibility
    const aiToggleBtn = container.querySelector("#ai-toggle-key-visibility");
    const aiKeyInput = container.querySelector("#ai-api-key");
    if (aiToggleBtn && aiKeyInput) {
      aiToggleBtn.addEventListener("click", () => {
        const isPass = aiKeyInput.type === "password";
        aiKeyInput.type = isPass ? "text" : "password";
        aiToggleBtn.querySelector("span").textContent = isPass ? "visibility_off" : "visibility";
      });
    }

    // AI Settings: Test key
    const aiTestBtn = container.querySelector("#ai-test-key-btn");
    const aiModelSelect = container.querySelector("#ai-model-select");
    if (aiTestBtn && window.AIService) {
      aiTestBtn.addEventListener("click", async () => {
        const key = (aiKeyInput.value || "").trim() || (window.AIService && window.AIService.getKey()) || "";
        const model = aiModelSelect.value;
        if (!key) {
          alert("Please enter a Gemini API Key.");
          return;
        }
        aiKeyInput.value = key;

        aiTestBtn.disabled = true;
        aiTestBtn.innerHTML = `<span class="material-symbols-outlined text-[15px] animate-spin">sync</span><span>Testing Gemini...</span>`;

        window.AIService.setKey(key);
        window.AIService.setModel(model);

        try {
          const res = await window.AIService.generate("Respond with: GEMINI_READY");
          aiTestBtn.disabled = false;
          aiTestBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">verified</span><span>Test AI Connection</span>`;

          if (res.success && res.text) {
            window.App.showToast("Gemini AI API is connected and responding!");
            const badge = container.querySelector("#ai-engine-status-badge");
            if (badge) {
              badge.className = "badge badge-completed";
              badge.textContent = `● Connected (${model})`;
            }
          } else {
            alert("Test response warning: " + res.text);
          }
        } catch (err) {
          aiTestBtn.disabled = false;
          aiTestBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">verified</span><span>Test AI Connection</span>`;
          alert("Could not connect to Gemini: " + err.message);
        }
      });
    }

    // Save profile
    const saveBtn = container.querySelector("#set-save-btn");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        store.state.profile.name = container.querySelector("#set-name").value;
        store.state.profile.email = container.querySelector("#set-email").value;
        store.state.profile.branch = container.querySelector("#set-branch").value;
        store.state.profile.scheme = container.querySelector("#set-scheme").value;
        store.saveState();
        window.App.showToast("Profile settings saved.");
      });
    }

    // Export JSON
    const exportBtn = container.querySelector("#set-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const json = store.exportJSON();
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Academix_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.App.showToast("Backup JSON file downloaded.");
      });
    }

    // Import JSON
    const importFile = container.querySelector("#set-import-file");
    if (importFile) {
      importFile.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const res = store.importJSON(event.target.result);
          if (res.success) {
            window.App.showToast("State successfully imported!");
            window.location.reload();
          } else {
            alert("Import error: " + res.error);
          }
        };
        reader.readAsText(file);
      });
    }

    // Sync with local disk database
    const syncBtn = container.querySelector("#set-sync-now-btn");
    if (syncBtn) {
      syncBtn.addEventListener("click", async () => {
        syncBtn.disabled = true;
        syncBtn.innerHTML = `<span class="material-symbols-outlined text-[15px] animate-spin">sync</span><span>Syncing...</span>`;
        try {
          await store.syncWithBackend();
          window.App.showToast("Database successfully synced with disk.");
          const badge = container.querySelector("#set-backend-badge");
          if (badge) {
            badge.className = "badge badge-completed";
            badge.textContent = "● Live Server DB Connected";
          }
        } catch (err) {
          window.App.showToast("Sync failed: running in local offline mode.");
        } finally {
          syncBtn.disabled = false;
          syncBtn.innerHTML = `<span class="material-symbols-outlined text-[15px]">sync</span><span>Sync with Local Disk</span>`;
        }
      });
    }

    // Clean Slate (Reset progress to 0% while preserving planning markers)
    const cleanSlateBtn = container.querySelector("#set-clean-slate-btn");
    if (cleanSlateBtn) {
      cleanSlateBtn.addEventListener("click", () => {
        if (confirm("Reset all topic progress, completed study sessions, and finished tasks to 0%? All 14 subjects, 4 modules, 182 topics, timetable templates, and exam countdowns will be preserved.")) {
          store.resetToCleanSlate(true);
          window.App.showToast("Clean slate active. Ready for new study sessions!");
          window.location.hash = "#/dashboard";
          window.location.reload();
        }
      });
    }

    // Reset to defaults
    const resetBtn = container.querySelector("#set-reset-defaults-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("Reset all subjects, study sessions, and task progress back to original KTU timetable defaults? This cannot be undone.")) {
          store.resetToCleanSlate(true);
          window.App.showToast("Reset to KTU timetable defaults.");
          window.location.hash = "#/dashboard";
          window.location.reload();
        }
      });
    }
  }
};
