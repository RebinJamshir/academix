/**
 * Academix - AI Study Service Engine
 * Powered by Google Gemini (gemini-3.5-flash) & Built-in KTU Academic Knowledge Base
 * Fully integrated with Academix Smart Execution Engine & Real-time Academic Store
 */

(function () {
  const DEFAULT_KEY = "";
  const DEFAULT_MODEL = "gemini-3.5-flash";
  const STORAGE_KEY_API = "academix_gemini_api_key";
  const STORAGE_KEY_MODEL = "academix_gemini_model";

  class AIService {
    constructor() {
      const storedKey = (localStorage.getItem(STORAGE_KEY_API) || "").trim();
      this.apiKey = storedKey || DEFAULT_KEY;
      this.model = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
      this.isGenerating = false;

      // Ensure key is cached locally if not yet saved
      if (!storedKey && this.apiKey) {
        try {
          localStorage.setItem(STORAGE_KEY_API, this.apiKey);
        } catch (e) {}
      }
    }

    getKey() {
      return this.apiKey;
    }

    setKey(key) {
      this.apiKey = (key || "").trim() || DEFAULT_KEY;
      try {
        localStorage.setItem(STORAGE_KEY_API, this.apiKey);
      } catch (e) {}
    }

    getModel() {
      return this.model;
    }

    setModel(model) {
      this.model = model || DEFAULT_MODEL;
      try {
        localStorage.setItem(STORAGE_KEY_MODEL, this.model);
      } catch (e) {}
    }

    /**
     * Context assembler: Gives Gemini complete, live, real-time academic state
     * Updated dynamically every time a query is executed.
     */
    getAcademicContext() {
      const store = window.academicStore;
      if (!store || !store.state) {
        return "Student: Rebin, KTU B.Tech CSE (S5 + 9 Backlogs). Bedtime: 22:45.";
      }

      const state = store.state;
      const p = state.profile || {};
      const subjects = state.subjects || [];
      const exams = state.examinations || [];
      const tasks = state.tasks || [];
      const sessions = state.studySessions || [];

      const dateService = window.AcademixDateService;
      const today = dateService ? dateService.todayString() : new Date().toISOString().slice(0, 10);
      const currentTime = dateService ? dateService.currentTimeString() : "14:00";
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

      // 1. Upcoming Examinations (sorted chronologically by days remaining)
      const upcomingExams = exams
        .map(e => {
          let daysLeft = null;
          if (typeof e.daysLeft === 'number') {
            daysLeft = e.daysLeft;
          } else if (e.examDate && dateService) {
            daysLeft = dateService.diffInDays(e.examDate, today);
          }
          return {
            name: e.subjectName || e.name || 'Subject',
            code: e.subjectCode || e.code || '',
            date: e.examDate,
            daysLeft: daysLeft,
            status: e.examDateStatus || 'provisional',
            prep: e.preparationPercent || 0,
            eveRevision: e.eveRevisionDate || 'Day before exam'
          };
        })
        .filter(e => e.date && (e.daysLeft === null || e.daysLeft >= 0))
        .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

      // 2. Active S5 Core vs Backlog Breakdown
      const s5Subjects = subjects.filter(s => s.category?.includes('S5') || s.semester === 'S5');
      const backlogSubjects = subjects.filter(s => s.category?.includes('Backlog') || (s.semester && s.semester !== 'S5'));

      const s5Summary = s5Subjects.map(s =>
        `${s.code} (${s.name}): ${s.syllabusProgress || 0}% covered [${s.completedModulesCount || 0}/${s.totalModules || 4} modules]`
      ).join("; ");

      const backlogSummary = backlogSubjects.map(s =>
        `${s.code} (${s.name}, ${s.semester}): ${s.syllabusProgress || 0}% prep`
      ).join("; ");

      // 3. Smart Execution Engine Backlog & Carry-Forward Metrics
      let backlogCount = 0;
      let backlogHours = "0.0";
      let overdueList = [];
      if (window.AcademixCarryForwardService) {
        const backlogData = window.AcademixCarryForwardService.getBacklogSummary(tasks, today);
        backlogCount = backlogData.totalCount;
        backlogHours = backlogData.totalRemainingHours;
        overdueList = (backlogData.items || []).slice(0, 4).map(t =>
          `"${t.title}" (${t.subjectName || t.subjectId}, overdue from ${t.scheduledDate || t.dueDate}, est ${t.estimatedMinutes || 60}m, priority: ${t.priority})`
        );
      } else {
        const overdue = tasks.filter(t => t.status === "overdue" || (t.dueDate < today && t.status !== "completed"));
        backlogCount = overdue.length;
        overdueList = overdue.slice(0, 4).map(t => `"${t.title}"`);
      }

      // 4. Spaced repetition queue
      let dueRevisionsList = [];
      if (window.AcademixRevisionSchedulerService) {
        const dueRevs = window.AcademixRevisionSchedulerService.getDueRevisions(state, today);
        dueRevisionsList = dueRevs.slice(0, 3).map(r => `${r.topicTitle} (${r.subjectName}, Stage ${r.stage})`);
      }

      // 5. Today's Timetable Blocks from KTU Master Schedule
      const todaysSessions = sessions
        .filter(s => s.date === today)
        .map(s => `${s.timeSlot || `${s.startTime}-${s.endTime}`}: [${s.activityType || 'Study'}] ${s.title || s.topic} (${s.status || 'pending'})`);

      // 6. Active Recovery Proposals awaiting approval
      const activeProposals = (state.activeRecoveryProposals || []).slice(0, 3).map(p =>
        `Proposal: Reschedule "${p.title}" to ${p.suggestedSlot?.date} ${p.suggestedSlot?.startTime}-${p.suggestedSlot?.endTime}`
      );

      return `
STUDENT PROFILE & LIVE ACADEMIC CONTEXT:
- Student: ${p.name || 'Rebin'}
- University & Scheme: APJ Abdul Kalam Technological University (KTU), 2024 Scheme
- Degree: B.Tech Computer Science & Engineering (Current: Semester 5)
- Current Date/Time: ${today} (${dayOfWeek}), Current Time: ${currentTime} IST
- Bedtime Rule: STRICT 22:45 BEDTIME. All studying MUST stop before 22:45. NEVER schedule or advise study past 22:45.
- College Protected Hours: Monday–Friday 09:00 - 17:00 (In-college hours; self-study blocks run in early morning 06:30-08:30, evening 17:30-20:30, and night review 21:00-22:30).

NEAREST KTU EXAMINATIONS (CHRONOLOGICAL):
${upcomingExams.length > 0
  ? upcomingExams.map(e => `* ${e.name} (${e.code}): Exam on ${e.date} (${e.daysLeft !== null ? `in ${e.daysLeft} days` : 'TBD'}) | Status: ${e.status} | Prep: ${e.prep}% | Eve Revision: ${e.eveRevision}`).join("\n")
  : "* No immediate exams scheduled in next 60 days."}

SUBJECT SYLLABUS STATUS:
- Core S5 Subjects: ${s5Summary || 'None listed'}
- Backlog Subjects (9): ${backlogSummary || 'None listed'}

TODAY'S SCHEDULED TIMETABLE SESSIONS (${today}):
${todaysSessions.length > 0 ? todaysSessions.map(s => `* ${s}`).join("\n") : "* No dedicated timetable blocks recorded for today. Recommend allocating time for overdue backlog tasks."}

SMART EXECUTION ENGINE BACKLOG & CARRY-FORWARD:
- Carried-Forward Overdue Tasks: ${backlogCount} tasks (${backlogHours} hours remaining).
${overdueList.length > 0 ? `  Overdue items needing catch-up:\n${overdueList.map(o => `  - ${o}`).join("\n")}` : '  - Zero backlog items; completely on track!'}
${dueRevisionsList.length > 0 ? `- Spaced Repetitions Due Today: ${dueRevisionsList.join("; ")}` : '- No spaced revisions due today.'}
${activeProposals.length > 0 ? `- Pending Recovery Proposals awaiting user approval in Tasks View:\n${activeProposals.map(pr => `  - ${pr}`).join("\n")}` : ''}

PEDAGOGICAL & EXAM INSTRUCTION GUIDELINES:
- KTU Exam Structure: Part A (2/3 marks each, crisp definitions, keywords, diagrams) & Part B (7/10 marks each, detailed design, architecture, derivations, algorithms, complexity).
- Give high-yield, exam-tested responses. Highlight valuation keywords that university examiners grade for.
- When generating schedules or recovery plans, ALWAYS maintain the 22:45 bedtime and 09:00-17:00 college window.
      `.trim();
    }

    /**
     * Core API call to Gemini (Dual-channel: Server proxy -> Direct browser fetch -> Knowledge fallback)
     */
    async generate(prompt, systemInstruction = null) {
      this.isGenerating = true;
      const context = this.getAcademicContext();
      const fullSystemInstruction = (systemInstruction ? systemInstruction + "\n\n" : "") + context;
      const apiKey = this.apiKey || DEFAULT_KEY;
      const model = this.model || DEFAULT_MODEL;

      // 1. Try server proxy first (avoids browser IPv6/CORS issues)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const serverRes = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            systemInstruction: fullSystemInstruction,
            apiKey: apiKey,
            model: model
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (serverRes.ok) {
          const json = await serverRes.json();
          if (json.success && json.text) {
            this.isGenerating = false;
            return { success: true, text: json.text, source: "gemini" };
          }
        }
      } catch (err) {
        console.warn("[AIService] Server proxy error, falling back to direct browser fetch:", err.message);
      }

      // 2. Direct browser fetch fallback (Direct call to Google Gemini endpoint)
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: fullSystemInstruction }] }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(directUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (res.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts[0].text;
          this.isGenerating = false;
          return { success: true, text, source: "gemini-direct" };
        } else {
          throw new Error((data.error && data.error.message) || "Gemini API generation error");
        }
      } catch (err) {
        console.warn("[AIService] Direct fetch error:", err.message);
        this.isGenerating = false;
        // 3. Fallback to offline heuristic engine
        return this.getOfflineFallback(prompt);
      }
    }

    /**
     * AI Copilot Chat with smart history management
     */
    async askCopilot(userMessage, chatHistory = []) {
      // Keep last 8 turns to optimize tokens and maintain sharp focus
      const recentHistory = (chatHistory || []).slice(-8);
      const historyPrompt = recentHistory
        .map(h => `${h.role === 'user' ? 'Student' : 'Academix AI'}: ${h.text || ''}`)
        .join("\n");

      const prompt = `
${historyPrompt ? `PREVIOUS CONVERSATION CONTEXT:\n${historyPrompt}\n\n` : ''}
STUDENT QUESTION:
${userMessage}

Respond as the Academix AI Study Copilot for a KTU B.Tech CSE student.
Guidelines:
- Be encouraging, precise, and academically rigorous.
- Format responses cleanly with headings, bullet points, Markdown tables, and code/formulas where helpful.
- If recommending study time, always remind them to sleep before 22:45.
- Keep answers practical, actionable, and aligned with the student's exam priorities.
      `.trim();

      return await this.generate(prompt, "You are the Academix Academic Study Copilot, an expert AI tutor specialized in university B.Tech Computer Science and KTU engineering exams.");
    }

    /**
     * In-Syllabus Concept Explainer (Exam, Intuitive, Deep Dive)
     */
    async explainTopic(subjectName, topicTitle, mode = "exam") {
      let prompt = "";
      if (mode === "exam") {
        prompt = `
SUBJECT: ${subjectName}
TOPIC: ${topicTitle}

Provide a model KTU examination answer for this topic with:
1. **2-Mark Short Answer Definition** (Crisp, keywords highlighted, 3-4 lines).
2. **10-Mark Detailed Answer Structure**:
   - Core Working Principle / Theory
   - Block Diagram or Architecture Explanation (text description)
   - Step-by-Step Algorithm or Mechanism
   - Key Formulas / Derivations (if applicable)
   - Advantages and Disadvantages / Trade-offs
3. **Valuation Key Tip**: What specific keyword, formula, or diagram earns full marks from KTU university examiners.
        `.trim();
      } else if (mode === "simple") {
        prompt = `
SUBJECT: ${subjectName}
TOPIC: ${topicTitle}

Explain this topic intuitively using:
1. Real-world analogy or mental model.
2. Why this concept exists (the specific problem it solves).
3. The simplest 3-step explanation of how it works.
4. Quick practical takeaway.
        `.trim();
      } else {
        prompt = `
SUBJECT: ${subjectName}
TOPIC: ${topicTitle}

Provide a deep technical breakdown with pseudo-code, complexity analysis, architecture registers, and edge cases for university engineering level.
        `.trim();
      }

      return await this.generate(prompt, `You are a senior KTU Computer Science professor and master tutor.`);
    }

    /**
     * Practice Quiz Generator
     */
    async generateQuiz(subjectName, topicTitle, count = 3) {
      const prompt = `
SUBJECT: ${subjectName}
TOPIC: ${topicTitle}

Generate ${count} university exam practice questions formatted in KTU pattern:
For each question:
- State Question type (e.g., [Part A: 3 Marks] or [Part B: 7 Marks])
- Problem / Question statement
- Hint or key formula
- Full Model Answer with marking breakdown

Format each question clearly with expandable/revealing answer blocks.
      `.trim();

      return await this.generate(prompt, "You are a university exam paper setter.");
    }

    /**
     * Flashcard Deck Generator
     */
    async generateFlashcards(subjectName, topicTitle) {
      const prompt = `
SUBJECT: ${subjectName}
TOPIC: ${topicTitle}

Create 4 high-yield active recall flashcards for KTU exam revision.
Format each flashcard as:
**Card [N] Front:** [Question / Concept prompt]
**Card [N] Back:** [Direct, memorable answer with key term highlighted]
      `.trim();

      return await this.generate(prompt, "You are an active recall and spaced repetition expert.");
    }

    /**
     * Exam Readiness Diagnostic
     */
    async auditExamReadiness() {
      const store = window.academicStore;
      const subjects = (store && store.state && store.state.subjects) || [];
      const exams = (store && store.state && store.state.examinations) || [];
      const dateService = window.AcademixDateService;
      const today = dateService ? dateService.todayString() : new Date().toISOString().slice(0, 10);

      const prompt = `
Analyze my 14 subjects and approaching KTU examinations:
Subjects data: ${JSON.stringify(subjects.map(s => ({
  code: s.code,
  name: s.name,
  category: s.category,
  syllabusProgress: s.syllabusProgress || 0,
  completedModules: `${s.completedModulesCount || 0}/${s.totalModules || 4}`
})))}
Exams data: ${JSON.stringify(exams.map(e => ({
  code: e.subjectCode,
  name: e.subjectName,
  daysLeft: typeof e.daysLeft === 'number' ? e.daysLeft : (dateService && e.examDate ? dateService.diffInDays(e.examDate, today) : null),
  date: e.examDate,
  prepPercent: e.preparationPercent || 0
})))}

Provide:
1. **Top 3 High-Risk Subjects** that need immediate emergency revision.
2. **Recommended 5-Day Action Plan** (strictly respecting 22:45 bedtime).
3. **Backlog vs S5 Balance Strategy**: How to allocate hours between passing S5 core courses and clearing the 9 backlogs.
      `.trim();

      return await this.generate(prompt, "You are an academic strategist for university engineering students.");
    }

    /**
     * Smart Heuristic Fallback (Runs if offline or API error)
     */
    getOfflineFallback(prompt) {
      return {
        success: true,
        source: "offline-engine",
        text: `### 📚 KTU Academic Knowledge Summary\n\n**Topic Overview:**\nThis syllabus unit is a high-frequency component in KTU university question papers.\n\n**Core Exam Answer Framework:**\n1. **Fundamental Definition:** Always state the primary function, layer/module context, and standard parameters.\n2. **Architecture / Working Principle:** Structure answers with numbered steps rather than continuous paragraphs.\n3. **Key Terminology:** Ensure keywords, protocol codes, and time/space complexity are prominently stated.\n\n> 💡 **Study Strategy Tip:** Complete Module 1 & Module 2 first for solid 35+ marks before moving to elective deep-dives. Always maintain bedtime by 22:45 for cognitive consolidation.`
      };
    }

    /**
     * Enhanced Markdown & Table Renderer for clean formatted output
     */
    renderMarkdown(md) {
      if (!md) return "";

      // 1. Extract and protect code blocks
      const codeBlocks = [];
      let text = md.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const id = `___CODE_BLOCK_${codeBlocks.length}___`;
        codeBlocks.push({ lang, code });
        return id;
      });

      // 2. Extract and protect inline code
      const inlineCodes = [];
      text = text.replace(/`([^`]+)`/g, (match, code) => {
        const id = `___INLINE_CODE_${inlineCodes.length}___`;
        inlineCodes.push(code);
        return id;
      });

      // 3. Escape HTML special characters in remaining prose
      text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // 4. Markdown Tables
      text = text.replace(/(?:^|\n)(\|.+?\|\n\|[-: |]+\|\n(?:\|.+?\|\n?)+)/g, (match, table) => {
        const lines = table.trim().split("\n");
        if (lines.length < 2) return match;
        const headerCols = lines[0].split("|").slice(1, -1).map(c => c.trim());
        const rowLines = lines.slice(2);
        let html = '<div class="overflow-x-auto my-3 border border-[var(--border-subtle)] rounded"><table class="w-full text-xs text-left border-collapse">';
        html += '<thead class="bg-[var(--surface-low)] font-semibold text-[var(--on-surface)] border-b border-[var(--border-subtle)]"><tr>';
        headerCols.forEach(col => {
          html += `<th class="p-2 border-r border-[var(--border-subtle)] last:border-r-0">${col}</th>`;
        });
        html += '</tr></thead><tbody>';
        rowLines.forEach(row => {
          const cols = row.split("|").slice(1, -1).map(c => c.trim());
          html += '<tr class="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--surface-low)]/50">';
          cols.forEach(c => {
            html += `<td class="p-2 border-r border-[var(--border-subtle)]/50 last:border-r-0 text-[var(--on-surface-variant)]">${c}</td>`;
          });
          html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
      });

      // 5. Blockquotes (note: > was escaped to &gt;)
      text = text.replace(/^&gt; (.*$)/gim, '<blockquote class="border-l-2 border-[var(--primary)] pl-2.5 my-2 text-xs text-[var(--on-surface-variant)] bg-[var(--surface-low)] py-1.5 rounded-r">$1</blockquote>');

      // 6. Headings
      text = text.replace(/^#### (.*$)/gim, '<h5 class="font-bold text-xs text-[var(--on-surface)] mt-2.5 mb-1">$1</h5>');
      text = text.replace(/^### (.*$)/gim, '<h4 class="font-bold text-xs text-[var(--primary)] mt-3 mb-1 font-mono">$1</h4>');
      text = text.replace(/^## (.*$)/gim, '<h3 class="font-bold text-sm text-[var(--on-surface)] mt-3 mb-1.5 border-b border-[var(--border-subtle)]/60 pb-0.5">$1</h3>');
      text = text.replace(/^# (.*$)/gim, '<h2 class="font-bold text-base text-[var(--primary)] mt-4 mb-2">$1</h2>');

      // 7. Bold & Italic
      text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[var(--on-surface)]">$1</strong>');
      text = text.replace(/\*([^*]+)\*/g, '<em class="text-[var(--on-surface-variant)]">$1</em>');

      // 8. Horizontal rules
      text = text.replace(/^---$/gim, '<hr class="border-[var(--border-subtle)] my-3"/>');

      // 9. Lists
      text = text.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="text-xs text-[var(--on-surface-variant)] ml-4 list-disc">$1</li>');
      text = text.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="text-xs text-[var(--on-surface-variant)] ml-4 list-decimal">$1</li>');

      // 10. Line breaks
      text = text.replace(/\n\n+/g, '<br/><br/>').replace(/\n/g, '<br/>');

      // 11. Restore inline code
      text = text.replace(/___INLINE_CODE_(\d+)___/g, (match, idx) => {
        const raw = inlineCodes[idx] || "";
        const safe = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<code class="font-mono text-[11px] bg-[var(--surface-inset)] px-1 py-0.5 rounded text-[var(--primary)]">${safe}</code>`;
      });

      // 12. Restore code blocks
      text = text.replace(/___CODE_BLOCK_(\d+)___/g, (match, idx) => {
        const block = codeBlocks[idx] || { code: "" };
        const safe = block.code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `<pre class="bg-[var(--surface-lowest)] border border-[var(--border-subtle)] rounded p-2.5 my-2 font-mono text-[11px] overflow-x-auto text-[var(--on-surface)]"><code>${safe}</code></pre>`;
      });

      return text;
    }
  }

  window.AIService = new AIService();
})();
