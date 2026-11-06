/**
 * Academix - Notes & Knowledge Management System
 * Conforms to Part 10 of Master Product Specification
 */

window.NotesView = {
  searchQuery: "",
  selectedSubject: "all",
  activeNoteId: null,

  render: function(container) {
    const store = window.academicStore;
    const state = store.state;

    let filtered = state.notes.filter(n => {
      if (this.selectedSubject !== "all" && n.subjectId !== this.selectedSubject) return false;
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchContent = n.content.toLowerCase().includes(q);
        const matchTags = n.tags ? n.tags.some(t => t.toLowerCase().includes(q)) : false;
        if (!matchTitle && !matchContent && !matchTags) return false;
      }
      return true;
    });

    // Pinned notes first
    filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    container.innerHTML = `
      <div class="flex flex-col w-full gap-4 animate-fade-in">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs uppercase tracking-wider text-[var(--on-surface-variant)]">Knowledge Vault</span>
              <span class="badge badge-completed">${state.notes.length} Notes Stored</span>
            </div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--on-surface)] mt-1">Notes & Formula Sheets</h1>
            <p class="text-xs text-[var(--on-surface-variant)]">Course summaries, derivations, algorithms and exam flashcards</p>
          </div>

          <div class="flex items-center gap-2">
            <button id="note-add-btn" class="btn-primary h-9 px-3.5 text-xs">
              <span class="material-symbols-outlined text-[18px]">edit_note</span>
              <span>New Note</span>
            </button>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="layer-card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="relative flex-1 max-w-md">
            <span class="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-[var(--on-surface-variant)]">search</span>
            <input type="text" id="note-search-input" value="${this.searchQuery}" placeholder="Search note titles, formulas, tags..." class="input-base w-full pl-8 h-8 text-xs" />
          </div>

          <div class="flex items-center gap-2">
            <select id="note-filter-subject" class="input-base h-8 text-xs py-0">
              <option value="all">All Subjects</option>
              ${state.subjects.map(s => `<option value="${s.id}" ${this.selectedSubject === s.id ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join("")}
            </select>
          </div>
        </div>

        <!-- Notes Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          ${filtered.map(note => this.renderNoteCard(note)).join("")}
        </div>

      </div>
    `;

    this.bindEvents(container);
  },

  renderNoteCard: function(note) {
    const store = window.academicStore;
    const sub = store.state.subjects.find(s => s.id === note.subjectId);

    return `
      <div class="layer-card p-4 flex flex-col justify-between hover:border-[var(--primary)] transition-all ${note.pinned ? 'border-[var(--primary)]/50 bg-[#FBFDFB]' : ''}">
        <div>
          <div class="flex items-start justify-between gap-2 pb-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="badge badge-neutral text-[10px]">${sub ? sub.code : 'S5'}</span>
              ${note.pinned ? `<span class="badge badge-completed text-[10px]">📌 Pinned</span>` : ''}
            </div>

            <div class="flex items-center gap-1">
              <button class="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-low)] text-[var(--on-surface-variant)]" title="${note.pinned ? 'Unpin' : 'Pin'}" onclick="window.NotesView.togglePin('${note.id}')">
                <span class="material-symbols-outlined text-[16px]">${note.pinned ? 'keep' : 'keep_public'}</span>
              </button>
              <button class="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-low)] text-[var(--error)]" title="Delete" onclick="window.NotesView.deleteNote('${note.id}')">
                <span class="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>

          <h3 class="text-sm font-semibold text-[var(--on-surface)]">${note.title}</h3>
          <span class="text-[11px] text-[var(--on-surface-variant)] font-mono block mt-0.5">${note.topic || 'General Syllabus'}</span>

          <!-- Note Content Preview -->
          <div class="text-xs text-[var(--on-surface)] bg-[var(--surface-low)] p-2.5 rounded border border-[var(--border-subtle)] font-mono whitespace-pre-line mt-2.5 max-h-48 overflow-y-auto leading-relaxed">
${note.content}
          </div>
        </div>

        <div class="pt-3 mt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--on-surface-variant)]">
          <div class="flex items-center gap-1 flex-wrap">
            ${(note.tags || []).map(t => `<span class="badge badge-neutral text-[9px]">${t}</span>`).join("")}
          </div>
          <span>${note.createdAt ? note.createdAt.slice(0, 10) : ''}</span>
        </div>
      </div>
    `;
  },

  bindEvents: function(container) {
    const self = this;

    const search = container.querySelector("#note-search-input");
    if (search) {
      search.addEventListener("input", (e) => {
        self.searchQuery = e.target.value;
        self.render(container);
      });
    }

    const filterSub = container.querySelector("#note-filter-subject");
    if (filterSub) {
      filterSub.addEventListener("change", (e) => {
        self.selectedSubject = e.target.value;
        self.render(container);
      });
    }

    const addBtn = container.querySelector("#note-add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        window.App.openQuickAddModal("note");
      });
    }
  },

  togglePin: function(noteId) {
    window.academicStore.toggleNotePinned(noteId);
    this.render(document.getElementById("main-content-view"));
  },

  deleteNote: function(noteId) {
    if (confirm("Delete this note?")) {
      window.academicStore.deleteNote(noteId);
      window.App.showToast("Note removed.");
      this.render(document.getElementById("main-content-view"));
    }
  }
};

