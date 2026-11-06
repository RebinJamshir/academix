/**
 * Academix - State Store & Central Data Engine
 * Single Source of Truth with LocalStorage Persistence
 * Implements Rule 1-10 of Master Product Specification
 */

class Store {
  constructor() {
    this.STORAGE_KEY = "academix_academic_state_v3";
    this.backendStatus = "checking";
    this.subscribers = [];
    this._initialSupabaseSynced = false;
    this.loadState();
    this.syncWithBackend();
    this.initSupabaseListener();
  }

  initSupabaseListener() {
    if (window.SupabaseSync) {
      window.SupabaseSync.subscribe(async (syncMgr) => {
        if (syncMgr.status === "connected" && !this._initialSupabaseSynced) {
          this._initialSupabaseSynced = true;
          try {
            const pullRes = await syncMgr.pullState();
            if (pullRes && pullRes.success && pullRes.state) {
              console.log("[Store] Synced cloud state from Supabase:", pullRes.updatedAt);
              this.state = pullRes.state;
              this.recalculateAll();
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
              this.notifySubscribers("SUPABASE_SYNC");
            } else if (pullRes && pullRes.empty) {
              console.log("[Store] Supabase table empty; seeding local state to Supabase cloud.");
              await syncMgr.pushState(this.state);
            }
          } catch (e) {
            console.warn("[Store] Supabase initial pull warning:", e);
          }
        }
      });
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.state = JSON.parse(saved);
        // Ensure dates & structure consistency
        this.recalculateAll();
        return;
      }
    } catch (e) {
      console.warn("Failed to load saved state, falling back to default KTU dataset:", e);
    }
    this.resetToCleanSlate(false);
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Failed to persist state to localStorage:", e);
    }
    this.notifySubscribers();
    this.scheduleBackendSync();
  }

  scheduleBackendSync() {
    if (this._syncTimeout) clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => {
      this.pushToBackend();
      this.pushToSupabase();
    }, 350);
  }

  async pushToSupabase() {
    if (window.SupabaseSync && (window.SupabaseSync.status === "connected" || window.SupabaseSync.client)) {
      try {
        await window.SupabaseSync.pushState(this.state);
      } catch (err) {
        console.warn("[Store] Background Supabase sync error:", err);
      }
    }
  }

  applyCloudState(cloudState, updatedAt) {
    if (!cloudState || !cloudState.subjects) return;
    console.log("[Store] Applying cloud state from Supabase (" + updatedAt + ")");
    this.state = cloudState;
    this.recalculateAll();
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    this.notifySubscribers("CLOUD_SYNC");
    if (typeof window.showToast === "function") {
      window.showToast("☁️ Realtime Cloud Sync Updated");
    }
  }

  async pushToBackend() {
    try {
      const res = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.state)
      });
      if (res.ok) {
        this.backendStatus = "connected";
      }
    } catch (err) {
      this.backendStatus = "offline";
    }
  }

  async syncWithBackend() {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Status " + res.status);
      const json = await res.json();
      if (json && json.success && json.data) {
        console.log("[Store] Synced state from backend database.");
        this.state = json.data;
        this.recalculateAll();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        this.backendStatus = "connected";
        this.notifySubscribers("SYNC");
      } else if (json && json.empty) {
        this.pushToBackend();
      }
    } catch (err) {
      this.backendStatus = "offline";
    }
  }

  resetToDefaults(notify = true) {
    this.resetToCleanSlate(notify);
  }

  resetToCleanSlate(notify = true) {
    if (!window.KTU_DATA) {
      console.error("KTU_DATA not found!");
      return;
    }
    // Deep clone KTU_DATA to create initial clean state
    this.state = JSON.parse(JSON.stringify(window.KTU_DATA));

    // Guarantee all 182 topic checkboxes are uncompleted
    (this.state.modules || []).forEach(m => {
      (m.topics || []).forEach(t => {
        t.learned = false;
        t.practiced = false;
        t.revised = false;
      });
    });

    // Guarantee all study sessions are scheduled with 0 minutes logged
    (this.state.studySessions || []).forEach(s => {
      s.status = "scheduled";
      s.actualMinutes = 0;
      s.notes = "";
      delete s.completedAt;
    });

    // Guarantee all tasks are pending with 0 minutes logged
    (this.state.tasks || []).forEach(t => {
      t.status = "pending";
      t.actualMinutes = 0;
      delete t.completedAt;
    });

    // Guarantee all examinations have 0 completed items
    (this.state.examinations || []).forEach(e => {
      e.completedChecklistItems = 0;
      e.modelPaperCompleted = false;
      e.finalRevisionCompleted = false;
      (e.checklist || []).forEach(c => {
        c.done = false;
      });
    });

    this.recalculateAll();
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error(e);
    }
    this.pushToBackend();
    if (notify) this.notifySubscribers("RESET");
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notifySubscribers(eventType = "CHANGE") {
    for (const callback of this.subscribers) {
      try {
        callback(this.state, eventType);
      } catch (err) {
        console.error("Subscriber notification error:", err);
      }
    }
  }

  /* ------------------- CALCULATIONS & BUSINESS LOGIC ------------------- */

  recalculateAll() {
    // 1. Recalculate each subject's progress from topic checklist
    this.state.subjects.forEach(subject => {
      const subjectModules = this.state.modules.filter(m => m.subjectId === subject.id);
      let totalTopics = 0;
      let learnedCount = 0;
      let practicedCount = 0;
      let revisedCount = 0;

      subjectModules.forEach(mod => {
        let modTotal = mod.topics ? mod.topics.length : 0;
        let modLearned = 0;
        let modPracticed = 0;
        let modRevised = 0;

        if (mod.topics) {
          mod.topics.forEach(t => {
            totalTopics++;
            if (t.learned) { learnedCount++; modLearned++; }
            if (t.practiced) { practicedCount++; modPracticed++; }
            if (t.revised) { revisedCount++; modRevised++; }
          });
        }

        // Module completion formula: weighted average (50% learning, 30% practice, 20% revision)
        if (modTotal > 0) {
          mod.progressPercent = Math.round(
            ((modLearned / modTotal) * 0.5 + (modPracticed / modTotal) * 0.3 + (modRevised / modTotal) * 0.2) * 100
          );
          mod.isCompleted = modLearned === modTotal && modPracticed === modTotal;
        } else {
          mod.progressPercent = 0;
          mod.isCompleted = false;
        }
      });

      // Subject Syllabus Completion:
      if (totalTopics > 0) {
        subject.learningCoverage = Math.round((learnedCount / totalTopics) * 100);
        subject.practiceCoverage = Math.round((practicedCount / totalTopics) * 100);
        subject.revisionCoverage = Math.round((revisedCount / totalTopics) * 100);
        subject.syllabusProgress = Math.round(
          (subject.learningCoverage * 0.5 + subject.practiceCoverage * 0.3 + subject.revisionCoverage * 0.2)
        );
      } else {
        subject.learningCoverage = 0;
        subject.practiceCoverage = 0;
        subject.revisionCoverage = 0;
        subject.syllabusProgress = 0;
      }

      subject.completedModulesCount = subjectModules.filter(m => m.isCompleted).length;
    });

    // 2. Dynamic Exam Countdowns based on Current Local Time
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.state.examinations.forEach(exam => {
      if (exam.examDate && exam.examDateStatus !== "tbd") {
        const examDate = new Date(exam.examDate + "T00:00:00");
        const diffMs = examDate - today;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        exam.daysLeft = diffDays >= 0 ? diffDays : 0;
        exam.isPast = diffDays < 0;
      } else {
        exam.daysLeft = null;
        exam.isPast = false;
      }

      // Check checklist progress
      if (exam.checklist && exam.checklist.length > 0) {
        exam.totalChecklistItems = exam.checklist.length;
        exam.completedChecklistItems = exam.checklist.filter(c => c.done).length;
        exam.preparationPercent = Math.round((exam.completedChecklistItems / exam.totalChecklistItems) * 100);
      }
    });

    // 3. Dynamic Task Overdue Status
    this.state.tasks.forEach(task => {
      if (task.status !== "completed" && task.status !== "cancelled" && task.dueDate) {
        const dueDate = new Date(task.dueDate + "T23:59:59");
        if (dueDate < new Date()) {
          task.status = "overdue";
        }
      }
    });
  }

  getOverallKPIs() {
    this.recalculateAll();

    // 1. Overall Academic Preparation % (Average of active subjects)
    const activeSubjects = this.state.subjects.filter(s => !s.archived);
    const overallPrep = activeSubjects.length > 0
      ? Math.round(activeSubjects.reduce((acc, s) => acc + (s.syllabusProgress || 0), 0) / activeSubjects.length)
      : 0;

    // 2. Tasks Completed vs Total
    const totalTasks = this.state.tasks.length;
    const completedTasks = this.state.tasks.filter(t => t.status === "completed").length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 3. Actual Study Hours (strictly from completed sessions with actualMinutes)
    const totalActualMinutes = this.state.studySessions
      .filter(s => s.status === "completed" && s.actualMinutes > 0)
      .reduce((acc, s) => acc + s.actualMinutes, 0);
    const totalActualHours = (totalActualMinutes / 60).toFixed(1);

    // Weekly Study Hours (current week)
    const now = new Date();
    const currentWeekStart = new Date(now);
    const day = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    currentWeekStart.setDate(diff);
    currentWeekStart.setHours(0, 0, 0, 0);

    const weekActualMinutes = this.state.studySessions
      .filter(s => {
        if (s.status !== "completed" || !s.actualMinutes) return false;
        const sDate = new Date(s.date + "T00:00:00");
        return sDate >= currentWeekStart;
      })
      .reduce((acc, s) => acc + s.actualMinutes, 0);
    const weekActualHours = (weekActualMinutes / 60).toFixed(1);

    // 4. Upcoming Next Examination
    const upcomingExams = this.state.examinations
      .filter(e => e.examDate && e.examDateStatus !== "tbd" && e.daysLeft !== null && e.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
    const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null;

    return {
      overallPrep,
      totalTasks,
      completedTasks,
      taskCompletionRate,
      totalActualHours,
      weekActualHours,
      weekActualMinutes,
      nextExam,
      overdueTasksCount: this.state.tasks.filter(t => t.status === "overdue").length,
      pendingTasksCount: this.state.tasks.filter(t => t.status !== "completed").length,
      activeSubjectsCount: activeSubjects.length
    };
  }

  /* ------------------- TOPIC CHECKLIST OPERATIONS ------------------- */

  updateTopicStatus(subjectId, moduleId, topicId, field, value) {
    const mod = this.state.modules.find(m => m.id === moduleId);
    if (!mod || !mod.topics) return;
    const topic = mod.topics.find(t => t.id === topicId);
    if (!topic) return;

    topic[field] = value;
    this.recalculateAll();
    this.saveState();
  }

  /* ------------------- TASK CRUD OPERATIONS ------------------- */

  addTask(taskData) {
    const newTask = {
      id: "task-" + Date.now(),
      title: taskData.title.trim(),
      description: taskData.description || "",
      subjectId: taskData.subjectId || "sub-cn",
      moduleId: taskData.moduleId || "",
      topic: taskData.topic || "",
      category: taskData.category || "Study",
      priority: taskData.priority || "Medium",
      status: taskData.status || "scheduled",
      dueDate: taskData.dueDate || new Date().toISOString().split("T")[0],
      startTime: taskData.startTime || "18:30",
      endTime: taskData.endTime || "20:00",
      estimatedMinutes: parseInt(taskData.estimatedMinutes) || 60,
      actualMinutes: 0,
      createdAt: new Date().toISOString()
    };

    this.state.tasks.unshift(newTask);

    // Add corresponding calendar event
    this.addCalendarEventForTask(newTask);

    this.recalculateAll();
    this.saveState();
    return newTask;
  }

  updateTask(taskId, updates) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;
    Object.assign(task, updates);
    task.updatedAt = new Date().toISOString();

    if (updates.status === "completed" && !task.completedAt) {
      task.completedAt = new Date().toISOString();
      if (!task.actualMinutes) task.actualMinutes = task.estimatedMinutes;
    }

    this.recalculateAll();
    this.saveState();
  }

  toggleTaskCompleted(taskId) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === "completed") {
      // Re-open
      task.status = "scheduled";
      task.completedAt = null;
    } else {
      // Complete
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      if (!task.actualMinutes) task.actualMinutes = task.estimatedMinutes || 60;

      // If linked to module and topic, mark topic learned/practiced
      if (task.moduleId && task.topic) {
        const mod = this.state.modules.find(m => m.id === task.moduleId);
        if (mod && mod.topics) {
          const match = mod.topics.find(t => t.id === task.topicId || t.title.toLowerCase().includes(task.topic.toLowerCase()));
          if (match) {
            if (task.category === "Practice") match.practiced = true;
            else if (task.category === "Revision") match.revised = true;
            else match.learned = true;
          }
        }
      }

      // Add a completed study session record so actual study hours are credited!
      this.recordStudySessionFromTask(task);

      // Trigger notification
      this.addNotification({
        type: "task",
        title: "Task Completed",
        message: `"${task.title}" marked as completed (+${task.actualMinutes}m logged).`
      });
    }

    this.recalculateAll();
    this.saveState();
    return task;
  }

  deleteTask(taskId) {
    this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
    this.recalculateAll();
    this.saveState();
  }

  recordStudySessionFromTask(task) {
    // Check if session already exists for this task
    const exists = this.state.studySessions.find(s => s.taskId === task.id);
    if (exists) {
      exists.status = "completed";
      exists.actualMinutes = task.actualMinutes;
      exists.completedAt = task.completedAt;
      return;
    }

    const newSession = {
      id: "sess-" + Date.now(),
      taskId: task.id,
      date: task.dueDate || new Date().toISOString().split("T")[0],
      subjectId: task.subjectId,
      moduleId: task.moduleId,
      title: task.title,
      activityType: task.category,
      topic: task.topic,
      startTime: task.startTime || "18:30",
      endTime: task.endTime || "20:00",
      plannedMinutes: task.estimatedMinutes || 60,
      actualMinutes: task.actualMinutes || 60,
      status: "completed",
      completedAt: task.completedAt || new Date().toISOString(),
      notes: "Auto-logged on task completion."
    };
    this.state.studySessions.push(newSession);
  }

  addCalendarEventForTask(task) {
    // Ensure an event exists in the calendar
    const subject = this.state.subjects.find(s => s.id === task.subjectId);
    const event = {
      id: "ev-" + task.id,
      taskId: task.id,
      title: (subject ? `[${subject.code}] ` : "") + task.title,
      category: task.category || "Study session",
      date: task.dueDate,
      startTime: task.startTime,
      endTime: task.endTime,
      subjectId: task.subjectId,
      status: task.status
    };
    if (!this.state.calendarEvents) this.state.calendarEvents = [];
    this.state.calendarEvents.push(event);
  }

  /* ------------------- STUDY SESSIONS & FOCUS TIMER ------------------- */

  addSession(sessionData) {
    const newSession = {
      id: "sess-" + Date.now(),
      date: sessionData.date || new Date().toISOString().split("T")[0],
      subjectId: sessionData.subjectId || "sub-cn",
      moduleId: sessionData.moduleId || "",
      title: sessionData.title.trim(),
      activityType: sessionData.activityType || "Learning",
      topic: sessionData.topic || "",
      startTime: sessionData.startTime || "18:30",
      endTime: sessionData.endTime || "20:00",
      plannedMinutes: parseInt(sessionData.plannedMinutes) || 90,
      actualMinutes: parseInt(sessionData.actualMinutes) || 0,
      status: sessionData.status || "scheduled",
      notes: sessionData.notes || ""
    };
    this.state.studySessions.push(newSession);
    this.recalculateAll();
    this.saveState();
    return newSession;
  }

  completeStudySession(sessionId, actualMinutes, notes = "") {
    const session = this.state.studySessions.find(s => s.id === sessionId);
    if (!session) return;

    session.status = "completed";
    session.actualMinutes = parseInt(actualMinutes) || session.plannedMinutes;
    session.completedAt = new Date().toISOString();
    if (notes) session.notes = (session.notes ? session.notes + " " : "") + notes;

    // Check if linked to topic and update coverage
    if (session.moduleId) {
      const mod = this.state.modules.find(m => m.id === session.moduleId);
      if (mod && mod.topics) {
        const topic = mod.topics.find(t => t.id === session.topicId || (session.topic && t.title.toLowerCase().includes(session.topic.toLowerCase())));
        if (topic) {
          if (session.activityType.includes("Practice")) topic.practiced = true;
          else if (session.activityType.includes("Revision")) topic.revised = true;
          else topic.learned = true;
        }
      }
    }

    this.addNotification({
      type: "session",
      title: "Study Block Logged",
      message: `${session.title}: ${session.actualMinutes}m logged toward actual study time.`
    });

    this.recalculateAll();
    this.saveState();
  }

  rescheduleSession(sessionId, newDate, newStartTime, newEndTime) {
    const session = this.state.studySessions.find(s => s.id === sessionId);
    if (!session) return;

    // Preserve original date in history note
    const prevDate = session.date;
    session.date = newDate;
    if (newStartTime) session.startTime = newStartTime;
    if (newEndTime) session.endTime = newEndTime;
    session.status = "scheduled";
    session.notes = (session.notes ? session.notes + "; " : "") + `Rescheduled from ${prevDate}`;

    this.recalculateAll();
    this.saveState();
  }

  /* ------------------- EXAM MANAGEMENT & REGENERATION ------------------- */

  updateExamDate(examId, newDate, newConfidence = "Confirmed") {
    const exam = this.state.examinations.find(e => e.id === examId);
    if (!exam) return;

    const oldDate = exam.examDate;
    exam.examDate = newDate;
    exam.examDateStatus = "confirmed";
    exam.confidenceNote = `${newConfidence} (Updated from ${oldDate || "TBD"})`;

    // Also update corresponding subject
    const subject = this.state.subjects.find(s => s.id === exam.subjectId);
    if (subject) {
      subject.examDate = newDate;
      subject.examDateStatus = "confirmed";
    }

    this.addNotification({
      type: "exam",
      title: "Examination Date Updated",
      message: `${exam.subjectName} examination rescheduled to ${newDate}. Review affected study sessions.`
    });

    this.recalculateAll();
    this.saveState();
  }

  toggleExamChecklist(examId, itemId) {
    const exam = this.state.examinations.find(e => e.id === examId);
    if (!exam || !exam.checklist) return;
    const item = exam.checklist.find(c => c.id === itemId);
    if (!item) return;

    item.done = !item.done;
    this.recalculateAll();
    this.saveState();
  }

  /* ------------------- AUTOMATIC STUDY PLAN REGENERATION (Part 19) ------------------- */

  generateProposedStudyPlan() {
    this.recalculateAll();

    // 1. Identify urgent priorities:
    // Sort active subjects by upcoming exam date
    const sortedSubjects = this.state.subjects
      .filter(s => s.examDate && s.examDateStatus !== "tbd")
      .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));

    const proposed = [];
    let currentDay = new Date();
    currentDay.setDate(currentDay.getDate() + 1); // Start tomorrow

    sortedSubjects.slice(0, 5).forEach((subject, idx) => {
      const exam = this.state.examinations.find(e => e.subjectId === subject.id);
      const modules = this.state.modules.filter(m => m.subjectId === subject.id);
      const incompleteMod = modules.find(m => !m.isCompleted) || modules[0];

      const planDate = new Date(currentDay);
      planDate.setDate(planDate.getDate() + idx);
      const dateStr = planDate.toISOString().split("T")[0];

      proposed.push({
        id: "prop-" + (idx + 1),
        date: dateStr,
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        moduleId: incompleteMod ? incompleteMod.id : null,
        moduleTitle: incompleteMod ? incompleteMod.title : "High-yield Revision",
        activityType: (exam && exam.daysLeft <= 14) ? "Timed Model Paper & Fixes" : "Learning & Practice",
        startTime: "18:30",
        endTime: "20:00",
        plannedMinutes: 90,
        reason: (exam && exam.daysLeft <= 14)
          ? `Exam approaching in ${exam.daysLeft} days. Priority timed paper review.`
          : `Incomplete module coverage (${subject.syllabusProgress}% ready).`
      });
    });

    return proposed;
  }

  applyProposedStudyPlan(proposedList) {
    proposedList.forEach(item => {
      this.state.studySessions.push({
        id: "sess-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
        date: item.date,
        subjectId: item.subjectId,
        moduleId: item.moduleId,
        title: `[Auto-Plan] ${item.subjectCode} ${item.activityType}`,
        activityType: item.activityType,
        topic: item.moduleTitle,
        startTime: item.startTime,
        endTime: item.endTime,
        plannedMinutes: item.plannedMinutes,
        actualMinutes: 0,
        status: "scheduled",
        notes: `Proposed via Study Plan Engine: ${item.reason}`
      });
    });

    this.addNotification({
      type: "reminder",
      title: "Study Plan Regenerated",
      message: `Applied ${proposedList.length} optimized sessions aligned with upcoming exam countdowns.`
    });

    this.recalculateAll();
    this.saveState();
  }

  /* ------------------- NOTES & KNOWLEDGE MANAGEMENT ------------------- */

  addNote(noteData) {
    const newNote = {
      id: "note-" + Date.now(),
      title: noteData.title.trim(),
      subjectId: noteData.subjectId || "sub-cn",
      moduleId: noteData.moduleId || "",
      topic: noteData.topic || "",
      tags: noteData.tags || ["General"],
      pinned: noteData.pinned || false,
      content: noteData.content || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.notes.unshift(newNote);
    this.saveState();
    return newNote;
  }

  updateNote(noteId, updates) {
    const note = this.state.notes.find(n => n.id === noteId);
    if (!note) return;
    Object.assign(note, updates);
    note.updatedAt = new Date().toISOString();
    this.saveState();
  }

  deleteNote(noteId) {
    this.state.notes = this.state.notes.filter(n => n.id !== noteId);
    this.saveState();
  }

  toggleNotePinned(noteId) {
    const note = this.state.notes.find(n => n.id === noteId);
    if (note) {
      note.pinned = !note.pinned;
      this.saveState();
    }
  }

  /* ------------------- NOTIFICATIONS ------------------- */

  addNotification(notif) {
    const newNotif = {
      id: "notif-" + Date.now(),
      type: notif.type || "reminder",
      title: notif.title,
      message: notif.message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    if (!this.state.notifications) this.state.notifications = [];
    this.state.notifications.unshift(newNotif);
    this.saveState();
  }

  markNotificationAsRead(id) {
    const notif = this.state.notifications.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveState();
    }
  }

  markAllNotificationsAsRead() {
    if (this.state.notifications) {
      this.state.notifications.forEach(n => n.isRead = true);
      this.saveState();
    }
  }

  clearNotification(id) {
    this.state.notifications = this.state.notifications.filter(n => n.id !== id);
    this.saveState();
  }

  /* ------------------- EXPORT & IMPORT ------------------- */

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.subjects || !parsed.tasks) {
        throw new Error("Invalid Academix JSON structure.");
      }
      this.state = parsed;
      this.recalculateAll();
      this.saveState();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

// Global Singleton Instance
window.academicStore = new Store();

