const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'academix_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const exists = db.notes.some(n => n.title.includes('CPU Scheduling'));
if (!exists) {
  const content = `# CPU Scheduling Algorithms — KTU Examination Notes

KTU 7-Mark Model Answer & Numerical Reference
Operating Systems — Module 2

## 1. Core Scheduling Formulas
- Turnaround Time: TAT = CT - AT
- Waiting Time: WT = TAT - BT
- Average Waiting Time: AWT = (Σ WT) / N
- Average Turnaround Time: ATAT = (Σ TAT) / N

## 2. Algorithm Summary & Trade-offs
1. First Come First Serve (FCFS):
   - Non-preemptive, FIFO.
   - Suffers from Convoy Effect (short processes stuck behind long ones).
2. Shortest Job First (SJF):
   - Non-preemptive / Preemptive (SRTF).
   - Minimizes AWT; risk of Starvation for long processes.
3. Round Robin (RR):
   - Preemptive, time-sliced using Time Quantum.
   - Prevents starvation; performance sensitive to time quantum size.

## 3. KTU Valuation Marks Scheme (7 Marks)
1. Definitions & Objectives: 1 Mark
2. Working Principle: 1 Mark
3. Clear Gantt Chart: 2 Marks
4. Numerical Table (CT, TAT, WT) & AWT / ATAT: 2 Marks
5. Advantages, Disadvantages & Key Phenomena (Convoy/Starvation): 1 Mark`;

  db.notes.unshift({
    id: 'note-cpu-sched-01',
    title: 'CPU Scheduling Algorithms (FCFS, SJF, RR) — KTU Notes',
    subjectId: 'sub-sw',
    moduleId: 'mod-os-2',
    topic: 'CPU Scheduling Algorithms',
    tags: ['OS', 'KTU-7-Mark', 'Gantt-Chart', 'Formulas'],
    pinned: true,
    createdAt: new Date().toISOString(),
    content: content
  });

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Successfully saved CPU Scheduling note to Academix Notes Vault! Total notes:', db.notes.length);
} else {
  console.log('Note already exists in vault.');
}

