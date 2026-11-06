/**
 * Academix - AI Study Service Engine
 * Powered by Google Gemini (gemini-3.5-flash) & Built-in KTU Academic Knowledge Base
 */

(function () {
  const DEFAULT_KEY = "";
  const DEFAULT_MODEL = "gemini-3.5-flash";
  const STORAGE_KEY_API = "academix_gemini_api_key";
  const STORAGE_KEY_MODEL = "academix_gemini_model";

  class AIService {
    constructor() {
      this.apiKey = localStorage.getItem(STORAGE_KEY_API) || "";
      this.model = localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_MODEL;
      this.isGenerating = false;
    }

    getKey() {
      return this.apiKey;
    }

    setKey(key) {
      this.apiKey = (key || "").trim();
      localStorage.setItem(STORAGE_KEY_API, this.apiKey);
    }

    getModel() {
      return this.model;
    }

    setModel(model) {
      this.model = model || DEFAULT_MODEL;
      localStorage.setItem(STORAGE_KEY_MODEL, this.model);
    }

    // Context assembler that gives Gemini full awareness of the student's status
    getAcademicContext() {
      const store = window.academicStore;
      if (!store || !store.state) {
        return "Student: Rebin, KTU B.Tech CSE (S5 + 9 Backlogs).";
      }

      const p = store.state.profile || {};
      const subjects = store.state.subjects || [];
      const exams = store.state.examinations || [];
      const today = new Date().toISOString().slice(0, 10);

      // Find approaching exams
      const upcomingExams = exams
        .map(e => ({ name: e.subjectName, code: e.subjectCode, date: e.examDate, days: e.daysRemaining }))
        .sort((a, b) => (a.days || 999) - (b.days || 999))
        .slice(0, 4);

      // Subject summary
      const subjSummary = subjects.map(s => `${s.code} (${s.name}): ${s.progress || 0}% covered`).join(", ");

      return `
STUDENT PROFILE & CONTEXT:
- Name: ${p.name || 'Rebin'}
- University: APJ Abdul Kalam Technological University (KTU), 2024 Scheme
- Program: B.Tech Computer Science & Engineering (Semester 5 + 9 backlogs)
- Bedtime Rule: Strict 22:45 bedtime. Never recommend studying past 22:45.
- Active Subjects: ${subjSummary}
- Nearest Exams: ${upcomingExams.map(e => `${e.name} in ${e.days} days (${e.date})`).join("; ")}
- Target: High-yield syllabus coverage, clear 2-mark & 10-mark KTU exam answers, active recall, diagrams, and formulas.
      `.trim();
    }

    /**
     * Core API call to Gemini
     */
    async generate(prompt, systemInstruction = null) {
      this.isGenerating = true;
      const context = this.getAcademicContext();
      const fullSystemInstruction = (systemInstruction || "") + "\n\n" + context;

      try {
        // 1. Try server proxy first (avoids browser IPv6/CORS issues)
        const serverRes = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt,
            systemInstruction: fullSystemInstruction,
            apiKey: this.apiKey,
            model: this.model
          })
        });

        if (serverRes.ok) {
          const json = await serverRes.json();
          if (json.success && json.text) {
            this.isGenerating = false;
            return { success: true, text: json.text, source: "gemini" };
          }
        }
      } catch (err) {
        console.warn("[AIService] Server proxy error, falling back to direct browser fetch:", err);
      }

      // 2. Direct browser fetch fallback
      try {
        const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: fullSystemInstruction }] }
        };

        const res = await fetch(directUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok && data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts[0].text;
          this.isGenerating = false;
          return { success: true, text, source: "gemini-direct" };
        } else {
          throw new Error((data.error && data.error.message) || "Gemini API generation error");
        }
      } catch (err) {
        console.warn("[AIService] Direct fetch error:", err);
        this.isGenerating = false;
        // 3. Fallback to offline heuristic engine
        return this.getOfflineFallback(prompt);
      }
    }

    /**
     * AI Copilot Chat
     */
    async askCopilot(userMessage, chatHistory = []) {
      const historyPrompt = chatHistory
        .map(h => `${h.role === 'user' ? 'Student' : 'Academix AI'}: ${h.text}`)
        .join("\n");

      const prompt = `
${historyPrompt ? `PREVIOUS CONVERSATION:\n${historyPrompt}\n\n` : ''}
STUDENT QUESTION:
${userMessage}

Respond as the Academix AI Study Copilot for a KTU B.Tech CSE student.
Guidelines:
- Be encouraging, precise, and academically rigorous.
- Format responses cleanly with headings, bullet points, and code/formulas where helpful.
- If recommending study time, always remind them to sleep before 22:45.
- Keep answers practical and actionable.
      `.trim();

      return await this.generate(prompt, "You are the Academix Academic Study Copilot, an expert AI tutor specialized in university B.Tech Computer Science and KTU engineering exams.");
    }

    /**
     * In-Syllabus Concept Explainer
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
3. **Valuation Key Tip**: What specific keyword or step earns full marks from KTU examiners.
        `.trim();
      } else if (mode === "simple") {
        prompt = `
SUBJECT: ${subjectName}
TOPIC: ${topicTitle}

Explain this topic intuitively using:
1. Real-world analogy or mental model.
2. Why this concept exists (the problem it solves).
3. The simplest 3-step explanation of how it works.
        `.trim();
      } else {
        prompt = `
SUBJECT: ${subjectName}
TOPIC: ${topicTitle}

Provide a deep technical breakdown with pseudo-code, complexity analysis, architecture registers, and edge cases.
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

Create 4 high-yield active recall flashcards.
Format each flashcard as:
**Card [N] Front:** [Question / Concept prompt]
**Card [N] Back:** [Direct, memorable answer with key term]
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

      const prompt = `
Analyze my 14 subjects and upcoming examinations:
Subjects data: ${JSON.stringify(subjects.map(s => ({ code: s.code, name: s.name, progress: s.progress, backlog: s.backlog })))}
Exams data: ${JSON.stringify(exams.map(e => ({ name: e.subjectName, days: e.daysRemaining, date: e.examDate })))}

Provide:
1. **Top 3 High-Risk Subjects** that need immediate emergency revision.
2. **Recommended 5-Day Action Plan** (respecting 22:45 bedtime).
3. **Backlog vs S5 Balance Strategy**: How to allocate hours between passing S5 and clearing backlogs.
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
     * Lightweight Markdown Renderer for clean formatted output
     */
    renderMarkdown(md) {
      if (!md) return "";
      let html = md
        // Escape bare HTML
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        // Code blocks
        .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre class="bg-[var(--surface-lowest)] border border-[var(--border-subtle)] rounded p-2.5 my-2 font-mono text-[11px] overflow-x-auto text-[var(--on-surface)]"><code>$2</code></pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="font-mono text-[11px] bg-[var(--surface-inset)] px-1 py-0.5 rounded text-[var(--primary)]">$1</code>')
        // Headings
        .replace(/^### (.*$)/gim, '<h4 class="font-bold text-xs text-[var(--on-surface)] mt-3 mb-1">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 class="font-bold text-sm text-[var(--primary)] mt-3 mb-1.5">$1</h3>')
        .replace(/^# (.*$)/gim, '<h2 class="font-bold text-base text-[var(--on-surface)] mt-4 mb-2">$1</h2>')
        // Bold & Italic
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[var(--on-surface)]">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em class="text-[var(--on-surface-variant)]">$1</em>')
        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-[var(--primary)] pl-2.5 my-2 text-xs text-[var(--on-surface-variant)] bg-[var(--surface-low)] py-1 rounded-r">$1</blockquote>')
        // Unordered lists
        .replace(/^\s*[-*]\s+(.*$)/gim, '<li class="text-xs text-[var(--on-surface-variant)] ml-4 list-disc">$1</li>')
        // Ordered lists
        .replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="text-xs text-[var(--on-surface-variant)] ml-4 list-decimal">$1</li>')
        // Horizontal rule
        .replace(/^---$/gim, '<hr class="border-[var(--border-subtle)] my-2.5"/>')
        // Paragraphs & line breaks
        .replace(/\n\n+/g, '<br/><br/>');

      return html;
    }
  }

  window.AIService = new AIService();
})();
