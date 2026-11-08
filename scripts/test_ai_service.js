/**
 * Academix AI Service Automated Verification Test
 */
const assert = require('assert');
const fs = require('fs');

global.window = {};
global.localStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; }
};

// Load services
global.window.AcademixDateService = require('../js/services/date-service.js');
global.window.AcademixTaskStatusService = require('../js/services/task-status-service.js');
global.window.AcademixCarryForwardService = require('../js/services/carry-forward-service.js');
global.window.AcademixRecoveryPlannerService = require('../js/services/recovery-planner-service.js');
global.window.AcademixRevisionSchedulerService = require('../js/services/revision-scheduler-service.js');
global.window.AcademixSchedulingConflictService = require('../js/services/scheduling-conflict-service.js');
global.window.AcademixExecutionAnalyticsService = require('../js/services/execution-analytics-service.js');

// Load DB into mock store
const db = JSON.parse(fs.readFileSync('data/academix_db.json', 'utf8'));
global.window.academicStore = {
  state: db,
  getCarryForwardSummary: function() {
    return window.AcademixCarryForwardService.getBacklogSummary(this.state.tasks);
  },
  getDueRevisions: function() {
    return window.AcademixRevisionSchedulerService.getDueRevisions(this.state);
  }
};

// Load AI service
require('../js/ai-service.js');
const ai = global.window.AIService;

console.log('--- Testing AI Service Engine ---');

// Test 1: Key and Model initialization
ai.setKey("mock-test-key-12345");
assert.strictEqual(ai.getKey(), "mock-test-key-12345", 'API Key must be configurable via setKey');
assert.strictEqual(ai.getModel(), 'gemini-3.5-flash', 'Default model must be gemini-3.5-flash');
console.log('✓ Test 1 Passed: Key & model initialization verified');

// Test 2: Academic Context generation
const ctx = ai.getAcademicContext();
assert(typeof ctx === 'string' && ctx.length > 200, 'Context must be a non-empty string');
assert(!ctx.includes('undefined'), 'Context must never contain undefined values');
assert(ctx.includes('Rebin'), 'Context must include student name');
assert(ctx.includes('22:45 BEDTIME'), 'Context must strictly include 22:45 bedtime rule');
assert(ctx.includes('Computer Networks'), 'Context must include core S5 exams');
assert(ctx.includes('PCCST501'), 'Context must include subject codes');
console.log('✓ Test 2 Passed: Dynamic academic context is rich, accurate, and free of undefined values');

// Test 3: Markdown table and code rendering
const mdTest = `### Heading 3
> Important Tip: sleep before 22:45.

| Subject | Code | Days |
|---|---|---|
| CN | PCCST501 | 15 |
| DAA | PCCST502 | 19 |

Here is \`code_snippet()\` and a block:
\`\`\`c
int main() { return 0; }
\`\`\`
- Bullet 1
- Bullet 2`;

const html = ai.renderMarkdown(mdTest);
assert(html.includes('<table'), 'Tables must render as <table>');
assert(html.includes('<blockquote'), 'Blockquotes must render as <blockquote>');
assert(html.includes('<pre class='), 'Fenced code blocks must render in <pre>');
assert(html.includes('<code class='), 'Inline code must render in <code>');
assert(html.includes('<h4'), 'H3 must render as <h4>');
console.log('✓ Test 3 Passed: Markdown parser correctly renders tables, blockquotes, code, and headings');

// Test 4: Offline fallback
const fallback = ai.getOfflineFallback('How to study CN?');
assert(fallback.success === true, 'Fallback must succeed');
assert(fallback.source === 'offline-engine', 'Source must be offline-engine');
assert(fallback.text.includes('KTU Academic Knowledge Summary'), 'Fallback must include KTU syllabus summary');
console.log('✓ Test 4 Passed: Offline heuristic knowledge fallback works seamlessly');

console.log('\n=======================================');
console.log(' ALL 4 AI SERVICE TESTS PASSED CLEANLY ');
console.log('=======================================\n');
