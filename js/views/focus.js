/**
 * Academix - Dedicated Focus Timer & Study Session Engine
 * Conforms to Part 12 of Master Product Specification
 */

window.FocusView = {
  mode: "pomodoro", // "pomodoro" (25m) | "shortBreak" (5m) | "longBreak" (15m) | "custom"
  targetMinutes: 25,
  remainingSeconds: 25 * 60,
  timerInterval: null,
  isRunning: false,
  isPaused: false,
  selectedSubjectId: "sub-cn",
  selectedModuleId: "mod-cn-1",
  sessionGoal: "Solve 3 Past KTU Question Papers on Protocol Layering",
  linkedSessionId: null,
  completedFocusSessionsCount: 4,
  totalFocusMinutes: 105,

  loadSession: function(sess) {
    if (!sess) return;
    this.linkedSessionId = sess.id;
    this.selectedSubjectId = sess.subjectId || "sub-cn";
    this.selectedModuleId = sess.moduleId || "";
    this.sessionGoal = sess.title || sess.topic || "Complete scheduled block";
    this.targetMinutes = sess.plannedMinutes || 25;
    this.remainingSeconds = this.targetMinutes * 60;
  },

  render: function(container) {
    const store = window.academicStore;
    const state = store.state;

    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const progressPercent = Math.round(((this.targetMinutes * 60 - this.remainingSeconds) / (this.targetMinutes * 60)) * 100);

    const sub = state.subjects.find(s => s.id === this.selectedSubjectId);

    container.innerHTML = `
      <div class="flex flex-col w-full max-w-2xl mx-auto gap-5 animate-fade-in py-2">
        
        <!-- Header -->
        <div class="text-center pb-2">
          <div class="flex items-center justify-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full ${this.isRunning ? 'bg-[var(--primary)] animate-pulse' : 'bg-[var(--outline)]'}"></span>
            <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Deep Focus Workspace</span>
            <span class="badge badge-completed">${this.completedFocusSessionsCount} Sessions Today</span>
          </div>
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1">Study Session Focus Timer</h1>
          <p class="text-xs text-[var(--on-surface-variant)]">Spaced learning loop with real telemetry logging into your analytics</p>
        </div>

        <!-- Mode Tabs -->
        <div class="flex items-center justify-center bg-[var(--surface-low)] p-1 rounded-lg border border-[var(--border-subtle)] max-w-sm mx-auto">
          <button class="focus-mode-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.mode === 'pomodoro' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="pomodoro" data-mins="25">
            Pomodoro (25m)
          </button>
          <button class="focus-mode-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.mode === 'shortBreak' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="shortBreak" data-mins="5">
            Short Break (5m)
          </button>
          <button class="focus-mode-btn px-3 py-1.5 text-xs font-mono rounded font-medium ${this.mode === 'longBreak' ? 'bg-white shadow-xs text-[var(--primary)]' : 'text-[var(--on-surface-variant)]'}" data-mode="longBreak" data-mins="15">
            Long Break (15m)
          </button>
        </div>

        <!-- Main Timer Card -->
        <div class="layer-card p-6 flex flex-col items-center justify-center gap-5 text-center">
          
          <!-- Subject & Goal -->
          <div class="flex flex-col items-center gap-1">
            <span class="badge badge-neutral text-xs font-bold">${sub ? sub.code + " • " + sub.name : 'Computer Networks'}</span>
            <h3 class="text-sm font-semibold text-[var(--on-surface)] mt-1 max-w-md">${this.sessionGoal}</h3>
          </div>

          <!-- Digital Clock Display -->
          <div class="flex flex-col items-center my-3">
            <div class="text-6xl sm:text-7xl font-mono font-bold tracking-tight text-[var(--on-surface)] select-none">
              ${timeFormatted}
            </div>
            
            <!-- Flat Linear Progress Indicator (Part 20) -->
            <div class="w-64 h-2 bg-[var(--surface-low)] rounded-full overflow-hidden mt-4 border border-[var(--border-subtle)]">
              <div class="h-full bg-[var(--primary)] transition-all duration-300" style="width: ${progressPercent}%;"></div>
            </div>
            <span class="font-mono text-xs text-[var(--on-surface-variant)] mt-1.5">${progressPercent}% elapsed</span>
          </div>

          <!-- Control Buttons -->
          <div class="flex items-center gap-3">
            ${!this.isRunning ? `
              <button id="focus-start-btn" class="btn-primary h-11 px-6 text-sm font-semibold">
                <span class="material-symbols-outlined text-[20px]">play_arrow</span>
                <span>Start Session</span>
              </button>
            ` : `
              ${!this.isPaused ? `
                <button id="focus-pause-btn" class="btn-secondary h-11 px-5 text-sm font-semibold">
                  <span class="material-symbols-outlined text-[20px]">pause</span>
                  <span>Pause</span>
                </button>
              ` : `
                <button id="focus-resume-btn" class="btn-primary h-11 px-5 text-sm font-semibold">
                  <span class="material-symbols-outlined text-[20px]">play_arrow</span>
                  <span>Resume</span>
                </button>
              `}
              <button id="focus-stop-btn" class="btn-secondary h-11 px-4 text-sm font-mono text-[var(--error)]">
                <span class="material-symbols-outlined text-[18px]">stop</span>
                <span>Stop</span>
              </button>
            `}
            <button id="focus-reset-btn" class="btn-ghost h-11 px-3 text-xs font-mono" title="Reset">
              <span class="material-symbols-outlined text-[18px]">replay</span>
            </button>
          </div>

          <!-- Direct Log Study Session Button -->
          <div class="pt-3 border-t border-[var(--border-subtle)] w-full flex items-center justify-between text-xs font-mono">
            <span class="text-[var(--on-surface-variant)]">Completed Study: ${this.totalFocusMinutes}m Total Logged</span>
            <button id="focus-log-now-btn" class="text-[var(--primary)] font-semibold hover:underline flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Finish & Log ${this.targetMinutes}m Study Time</span>
            </button>
          </div>
        </div>

        <!-- Session Config Form -->
        <div class="layer-card p-4 flex flex-col gap-3">
          <div class="pb-1 border-b border-[var(--border-subtle)]">
            <h4 class="text-xs font-semibold text-[var(--on-surface)] uppercase font-mono">Target Subject & Outcome</h4>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Subject</label>
              <select id="focus-select-subject" class="input-base w-full h-8 text-xs py-0">
                ${state.subjects.map(s => `<option value="${s.id}" ${this.selectedSubjectId === s.id ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join("")}
              </select>
            </div>

            <div>
              <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Custom Duration (Minutes)</label>
              <input type="number" id="focus-custom-mins" value="${this.targetMinutes}" min="5" max="180" class="input-base w-full h-8 text-xs font-mono" />
            </div>
          </div>

          <div>
            <label class="text-[11px] font-mono text-[var(--on-surface-variant)] block mb-1">Session Measurable Goal</label>
            <input type="text" id="focus-goal-input" value="${this.sessionGoal}" placeholder="e.g. Master Theorem proof or 10 past questions..." class="input-base w-full h-8 text-xs" />
          </div>
        </div>

      </div>
    `;

    this.bindEvents(container);
  },

  bindEvents: function(container) {
    const self = this;

    // Mode Buttons
    container.querySelectorAll(".focus-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        self.stopTimer();
        self.mode = btn.dataset.mode;
        self.targetMinutes = parseInt(btn.dataset.mins);
        self.remainingSeconds = self.targetMinutes * 60;
        self.render(container);
      });
    });

    // Start
    const startBtn = container.querySelector("#focus-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        self.startTimer();
        self.render(container);
      });
    }

    // Pause
    const pauseBtn = container.querySelector("#focus-pause-btn");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => {
        self.isPaused = true;
        clearInterval(self.timerInterval);
        self.render(container);
      });
    }

    // Resume
    const resumeBtn = container.querySelector("#focus-resume-btn");
    if (resumeBtn) {
      resumeBtn.addEventListener("click", () => {
        self.isPaused = false;
        self.startTimer();
        self.render(container);
      });
    }

    // Stop
    const stopBtn = container.querySelector("#focus-stop-btn");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => {
        self.stopTimer();
        self.render(container);
      });
    }

    // Reset
    const resetBtn = container.querySelector("#focus-reset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        self.stopTimer();
        self.remainingSeconds = self.targetMinutes * 60;
        self.render(container);
      });
    }

    // Log now
    const logBtn = container.querySelector("#focus-log-now-btn");
    if (logBtn) {
      logBtn.addEventListener("click", () => {
        self.logCompletedSession();
      });
    }

    // Subject select
    const subSelect = container.querySelector("#focus-select-subject");
    if (subSelect) {
      subSelect.addEventListener("change", (e) => {
        self.selectedSubjectId = e.target.value;
      });
    }

    // Custom mins
    const customMins = container.querySelector("#focus-custom-mins");
    if (customMins) {
      customMins.addEventListener("change", (e) => {
        const val = parseInt(e.target.value) || 25;
        self.targetMinutes = val;
        self.remainingSeconds = val * 60;
        self.render(container);
      });
    }

    // Goal input
    const goalInput = container.querySelector("#focus-goal-input");
    if (goalInput) {
      goalInput.addEventListener("input", (e) => {
        self.sessionGoal = e.target.value;
      });
    }
  },

  startTimer: function() {
    const self = this;
    this.isRunning = true;
    this.isPaused = false;

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (self.remainingSeconds > 0) {
        self.remainingSeconds--;
        self.updateClockDOM();
      } else {
        self.onTimerFinished();
      }
    }, 1000);
  },

  stopTimer: function() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.timerInterval);
  },

  updateClockDOM: function() {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    const clockElem = document.querySelector(".layer-card .text-6xl, .layer-card .text-7xl");
    if (clockElem) {
      clockElem.textContent = timeFormatted;
    }
    const progressBar = document.querySelector(".layer-card .bg-\\[var\\(--primary\\)\\]");
    if (progressBar) {
      const pct = Math.round(((this.targetMinutes * 60 - this.remainingSeconds) / (this.targetMinutes * 60)) * 100);
      progressBar.style.width = pct + "%";
    }
  },

  onTimerFinished: function() {
    this.stopTimer();
    this.playChime();
    this.logCompletedSession();
  },

  logCompletedSession: function() {
    const store = window.academicStore;
    const subject = store.state.subjects.find(s => s.id === this.selectedSubjectId);

    const loggedMinutes = this.targetMinutes;
    this.completedFocusSessionsCount++;
    this.totalFocusMinutes += loggedMinutes;

    // Record study session into store & update linked task/session telemetry
    if (this.linkedSessionId) {
      const existingSess = store.state.studySessions.find(s => s.id === this.linkedSessionId);
      if (existingSess) {
        existingSess.actualMinutes = (existingSess.actualMinutes || 0) + loggedMinutes;
        if (existingSess.actualMinutes >= (existingSess.plannedMinutes || 0)) {
          existingSess.status = "completed";
          existingSess.completedAt = new Date().toISOString();
        }
        if (existingSess.taskId) {
          const linkedTask = store.state.tasks.find(t => t.id === existingSess.taskId);
          if (linkedTask) {
            linkedTask.actualMinutes = (linkedTask.actualMinutes || 0) + loggedMinutes;
            if (linkedTask.actualMinutes >= (linkedTask.estimatedMinutes || 0)) {
              linkedTask.status = "completed";
              linkedTask.executionState = "completed";
              linkedTask.completedAt = new Date().toISOString();
            }
          }
        }
        store.saveState();
      }
    } else {
      store.addSession({
        date: new Date().toISOString().split("T")[0],
        subjectId: this.selectedSubjectId,
        moduleId: this.selectedModuleId,
        title: `${subject ? subject.code : 'S5'} Focus: ${this.sessionGoal}`,
        activityType: "Learning & Practice",
        topic: this.sessionGoal,
        plannedMinutes: loggedMinutes,
        actualMinutes: loggedMinutes,
        status: "completed",
        notes: "Logged directly via Focus Timer session."
      });
    }

    window.App.showToast(`Focus session logged! +${loggedMinutes}m added to study telemetry.`);
    this.remainingSeconds = this.targetMinutes * 60;
    this.render(document.getElementById("main-content-view"));
  },

  playChime: function() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log("Audio chime synthesized.");
    }
  }
};

