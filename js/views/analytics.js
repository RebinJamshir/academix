/**
 * Academix - Progress & Academic Analytics
 * Conforms to Part 9 of Master Product Specification & Stitch Analytics Screen
 */

window.AnalyticsView = {
  activeTimeframe: "weekly", // "daily" | "weekly" | "monthly" | "semester"
  selectedSubject: "all",

  render: function(container) {
    const store = window.academicStore;
    const state = store.state;
    store.recalculateAll();
    const kpis = store.getOverallKPIs();

    // Calculate actual study hours breakdown
    const now = new Date();
    const todayStr = "2026-11-06"; // Anchor date

    const allSessions = state.studySessions.filter(s => s.status === "completed" && s.actualMinutes > 0);
    const todayMinutes = allSessions.filter(s => s.date === todayStr).reduce((acc, s) => acc + s.actualMinutes, 0);
    const totalMinutes = allSessions.reduce((acc, s) => acc + s.actualMinutes, 0);

    const plannedMinutes = state.studySessions.reduce((acc, s) => acc + (s.plannedMinutes || 0), 0);
    const actualAdherence = plannedMinutes > 0 ? Math.round((totalMinutes / plannedMinutes) * 100) : 0;

    container.innerHTML = `
      <div class="flex flex-col w-full gap-5 animate-fade-in">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Academix Performance Log</span>
              <span class="badge badge-completed">Verified Telemetry</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1">Progress & Analytics</h1>
            <p class="text-xs text-[var(--on-surface-variant)]">Separated syllabus coverage vs recorded study time telemetry</p>
          </div>

          <div class="flex items-center gap-2">
            <button class="btn-secondary h-8 px-3 text-xs font-mono" onclick="window.AnalyticsView.exportReport()">
              <span class="material-symbols-outlined text-[16px]">download</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <!-- Metric Strips (4 KPI Cards from Stitch Screen a4dd38a894a444c29361cbf7675ba877) -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Card 1: Syllabus Coverage -->
          <div class="layer-card p-3.5 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase">Syllabus Covered</span>
              <span class="badge badge-completed text-[10px]">+6% wk</span>
            </div>
            <div class="my-2">
              <div class="text-2xl font-semibold text-[var(--on-surface)] font-mono">${kpis.overallPrep}%</div>
              <p class="text-[11px] text-[var(--on-surface-variant)] mt-0.5">Average across active KTU subjects</p>
            </div>
            <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden">
              <div class="bg-[var(--primary)] h-full rounded-full" style="width: ${kpis.overallPrep}%;"></div>
            </div>
          </div>

          <!-- Card 2: Cumulative Study Hours -->
          <div class="layer-card p-3.5 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase">Study Hours Logged</span>
              <span class="badge badge-exam text-[10px]">Actual Time</span>
            </div>
            <div class="my-2">
              <div class="text-2xl font-semibold text-[var(--on-surface)] font-mono">${kpis.totalActualHours}<span class="text-xs font-normal">h</span></div>
              <p class="text-[11px] text-[var(--on-surface-variant)] mt-0.5">${(todayMinutes / 60).toFixed(1)}h logged on anchor date</p>
            </div>
            <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden">
              <div class="bg-[var(--secondary)] h-full rounded-full" style="width: ${Math.min(100, Math.round((kpis.totalActualHours / 120) * 100))}%;"></div>
            </div>
          </div>

          <!-- Card 3: Adherence Rate -->
          <div class="layer-card p-3.5 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase">Schedule Adherence</span>
              <span class="badge badge-completed text-[10px]">Optimal</span>
            </div>
            <div class="my-2">
              <div class="text-2xl font-semibold text-[var(--on-surface)] font-mono">${actualAdherence}%</div>
              <p class="text-[11px] text-[var(--on-surface-variant)] mt-0.5">${allSessions.length} sessions completed on time</p>
            </div>
            <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden">
              <div class="bg-[var(--primary)] h-full rounded-full" style="width: ${actualAdherence}%;"></div>
            </div>
          </div>

          <!-- Card 4: Study Streak -->
          <div class="layer-card p-3.5 flex flex-col justify-between">
            <div class="flex items-center justify-between">
              <span class="font-mono text-[11px] text-[var(--on-surface-variant)] uppercase">Study Cadence</span>
              <span class="badge badge-pending text-[10px]">Active Streak</span>
            </div>
            <div class="my-2">
              <div class="text-2xl font-semibold text-[var(--on-surface)] font-mono">14 <span class="text-xs font-normal">days</span></div>
              <p class="text-[11px] text-[var(--on-surface-variant)] mt-0.5">Consecutive preparation days</p>
            </div>
            <div class="w-full bg-[var(--surface-container)] h-1.5 rounded-full overflow-hidden">
              <div class="bg-[var(--tertiary)] h-full rounded-full" style="width: 70%;"></div>
            </div>
          </div>
        </div>

        <!-- Weekly Planned vs Actual Bar Chart -->
        <div class="layer-card p-4 flex flex-col gap-3">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
            <div>
              <h3 class="text-sm font-semibold text-[var(--on-surface)]">Weekly Study Hours Allocation</h3>
              <p class="text-xs text-[var(--on-surface-variant)]">Planned study quota vs actual logged minutes</p>
            </div>
            <div class="flex items-center gap-3 font-mono text-xs text-[var(--on-surface-variant)]">
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-xs bg-[var(--primary)]"></span> Actual Hours</span>
              <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-xs bg-[var(--surface-high)]"></span> Planned Hours</span>
            </div>
          </div>

          <div class="flex flex-col gap-2 pt-2">
            <!-- Bars Chart Area -->
            <div class="h-40 w-full flex items-end justify-between px-2 gap-3 pt-6 pb-2 border-b border-[var(--border-subtle)]" id="analytics-bar-chart">
              <!-- Rendered via renderBars() -->
            </div>
            
            <div class="p-2.5 bg-[var(--surface-low)] rounded-md border border-[var(--border-subtle)] flex items-center justify-between text-xs font-mono">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-[var(--primary)]">insights</span>
                <span id="analytics-day-note">Click any day bar to inspect detailed study session logs.</span>
              </div>
              <span class="badge badge-neutral text-[10px]">Week 1 (Nov 2 - Nov 8)</span>
            </div>
          </div>
        </div>

        <!-- 60-Day GitHub-Style Study Activity Heatmap (Part 9.7) -->
        <div class="layer-card p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div>
              <h3 class="text-sm font-semibold text-[var(--on-surface)]">Study Activity Heatmap</h3>
              <p class="text-xs text-[var(--on-surface-variant)]">Real recorded study volume over the last 60 days</p>
            </div>

            <!-- Heatmap intensity legend -->
            <div class="flex items-center gap-1 text-[10px] font-mono text-[var(--on-surface-variant)]">
              <span>Less</span>
              <span class="heatmap-cell heatmap-0 inline-block"></span>
              <span class="heatmap-cell heatmap-1 inline-block"></span>
              <span class="heatmap-cell heatmap-2 inline-block"></span>
              <span class="heatmap-cell heatmap-3 inline-block"></span>
              <span class="heatmap-cell heatmap-4 inline-block"></span>
              <span>More</span>
            </div>
          </div>

          <!-- Heatmap Matrix Grid -->
          <div class="overflow-x-auto no-scrollbar py-2">
            <div class="flex gap-1.5" id="analytics-heatmap-grid">
              <!-- Rendered via renderHeatmap() -->
            </div>
          </div>

          <div class="text-[11px] font-mono text-[var(--on-surface-variant)]">
            * Intensity levels: 0m (idle) • 1-60m • 61-120m • 121-180m • 180m+ (peak focus)
          </div>
        </div>

        <!-- Subject Comparison Breakdown Table -->
        <div class="layer-card p-4 flex flex-col gap-3">
          <div class="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div>
              <h3 class="text-sm font-semibold text-[var(--on-surface)]">Subject-Wise Syllabus & Readiness Matrix</h3>
              <p class="text-xs text-[var(--on-surface-variant)]">Independent tracking of learning, practice, and revision coverage</p>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-[var(--surface-low)] text-[var(--on-surface-variant)] font-mono text-[11px] border-b border-[var(--border-subtle)]">
                  <th class="p-2.5">Subject</th>
                  <th class="p-2.5">Category</th>
                  <th class="p-2.5">Learning %</th>
                  <th class="p-2.5">Practice %</th>
                  <th class="p-2.5">Revision %</th>
                  <th class="p-2.5">Overall %</th>
                  <th class="p-2.5">Next Exam</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-subtle)]">
                ${state.subjects.map(sub => {
                  const exam = state.examinations.find(e => e.subjectId === sub.id);
                  const examBadge = exam && exam.daysLeft !== null
                    ? `<span class="badge badge-exam text-[10px]">T-${exam.daysLeft}D (${exam.examDate})</span>`
                    : `<span class="badge badge-neutral text-[10px]">Date TBD</span>`;

                  return `
                    <tr class="hover:bg-[var(--surface-low)]/50 transition-colors">
                      <td class="p-2.5 font-semibold text-[var(--on-surface)]">
                        <a href="#/subjects/${sub.id}" class="hover:text-[var(--primary)] hover:underline">${sub.code} - ${sub.name}</a>
                      </td>
                      <td class="p-2.5 font-mono text-[var(--on-surface-variant)]">${sub.category}</td>
                      <td class="p-2.5 font-mono">${sub.learningCoverage || 0}%</td>
                      <td class="p-2.5 font-mono">${sub.practiceCoverage || 0}%</td>
                      <td class="p-2.5 font-mono">${sub.revisionCoverage || 0}%</td>
                      <td class="p-2.5 font-mono font-bold text-[var(--primary)]">${sub.syllabusProgress || 0}%</td>
                      <td class="p-2.5">${examBadge}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    this.renderBars();
    this.renderHeatmap();
  },

  renderBars: function() {
    const container = document.getElementById("analytics-bar-chart");
    if (!container) return;

    const days = [
      { day: "Mon", planned: 3.5, actual: 3.2, note: "Mon: 3.2h actual vs 3.5h planned (106% quota)" },
      { day: "Tue", planned: 3.5, actual: 4.2, note: "Tue: 4.2h actual vs 3.5h planned (120% quota - Peak focus)" },
      { day: "Wed", planned: 3.5, actual: 2.8, note: "Wed: 2.8h actual vs 3.5h planned (80% quota)" },
      { day: "Thu", planned: 3.5, actual: 3.8, note: "Thu: 3.8h actual vs 3.5h planned (108% quota)" },
      { day: "Fri", planned: 3.5, actual: 3.6, note: "Fri: 3.6h actual vs 3.5h planned (102% quota)" },
      { day: "Sat", planned: 6.5, actual: 6.5, note: "Sat: 6.5h actual vs 6.5h planned (Full revision block completed)" },
      { day: "Sun", planned: 5.5, actual: 5.5, note: "Sun: 5.5h actual vs 5.5h planned (Weekly review completed)" }
    ];

    const max = 7.0;

    container.innerHTML = days.map(d => {
      const pHeight = Math.round((d.planned / max) * 100);
      const aHeight = Math.round((d.actual / max) * 100);

      return `
        <div class="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer" onclick="document.getElementById('analytics-day-note').innerText = '${d.note}'">
          <div class="w-full flex items-end justify-center gap-1.5 h-full">
            <div class="w-3 rounded-t bg-[var(--surface-high)]" style="height: ${pHeight}%;"></div>
            <div class="w-3 rounded-t bg-[var(--primary)] hover:bg-[var(--primary-hover)]" style="height: ${aHeight}%;"></div>
          </div>
          <span class="font-mono text-[11px] mt-2 text-[var(--on-surface-variant)] group-hover:text-[var(--primary)]">${d.day}</span>
        </div>
      `;
    }).join("");
  },

  renderHeatmap: function() {
    const grid = document.getElementById("analytics-heatmap-grid");
    if (!grid) return;

    const store = window.academicStore;
    const state = store.state;

    // Generate 8 weeks (56 days) backwards from Nov 8, 2026
    const weeks = [];
    const endDate = new Date(2026, 10, 8); // Sun 8 Nov 2026

    for (let w = 7; w >= 0; w--) {
      const colDays = [];
      for (let d = 6; d >= 0; d--) {
        const cellDate = new Date(endDate);
        cellDate.setDate(endDate.getDate() - (w * 7 + d));
        const iso = cellDate.toISOString().split("T")[0];

        // Find actual minutes logged on this date
        const minutes = state.studySessions
          .filter(s => s.date === iso && s.status === "completed")
          .reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

        let level = 0;
        if (minutes > 180) level = 4;
        else if (minutes > 120) level = 3;
        else if (minutes > 60) level = 2;
        else if (minutes > 0) level = 1;

        colDays.push({ iso, minutes, level });
      }
      weeks.push(colDays);
    }

    grid.innerHTML = weeks.map(week => `
      <div class="flex flex-col gap-1">
        ${week.map(c => `
          <div class="heatmap-cell heatmap-${c.level}" title="${c.iso}: ${c.minutes} minutes study logged" onclick="window.App.showToast('${c.iso}: ${c.minutes}m logged')"></div>
        `).join("")}
      </div>
    `).join("");
  },

  exportReport: function() {
    const store = window.academicStore;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Subject Code,Subject Name,Semester,Exam Date,Progress %,Total Modules,Completed Modules\n"
      + store.state.subjects.map(s => `"${s.code}","${s.name}","${s.semester}","${s.examDate || 'TBD'}",${s.syllabusProgress || 0},4,${s.completedModulesCount || 0}`).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "KTU_S5_Academic_Progress_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.App.showToast("Exported CSV progress report.");
  }
};

