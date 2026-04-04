// Primer — app.js
// Progress tracking via localStorage

// Tier metadata — used by the dashboard to group topics
const TIERS = [
  {
    label: 'Tier 1 — Start Here',
    desc: 'Highest leverage. Sharpens you immediately at work.',
    ids: ['observability', 'databases', 'system-design'],
  },
  {
    label: 'Tier 2 — Important',
    desc: 'Foundational and practical. Build this in parallel.',
    ids: ['caching', 'http-networking', 'security', 'infrastructure', 'message-queues'],
  },
];

const TOPICS = [
  {
    id: 'observability',
    title: 'Observability',
    icon: '🔭',
    desc: 'Logs, metrics, traces, Prometheus, OpenTelemetry, SLOs, error budgets',
    path: 'topics/observability.html',
    total: 13,
  },
  {
    id: 'databases',
    title: 'Databases',
    icon: '🗄️',
    desc: 'ACID, isolation levels, indexing, PostgreSQL internals, NoSQL, sharding',
    path: 'topics/databases.html',
    total: 13,
  },
  {
    id: 'system-design',
    title: 'System Design',
    icon: '🏗️',
    desc: 'Scaling, load balancing, CAP, rate limiting, resilience patterns',
    path: 'topics/system-design.html',
    total: 12,
  },
  {
    id: 'caching',
    title: 'Caching',
    icon: '⚡',
    desc: 'Cache strategies, Redis data structures, CDN, HTTP cache headers',
    path: 'topics/caching.html',
    total: 13,
  },
  {
    id: 'http-networking',
    title: 'HTTP & APIs',
    icon: '🌐',
    desc: 'HTTP/1.1, HTTP/2, HTTP/3, REST, GraphQL, gRPC, WebSockets, TLS, DNS',
    path: 'topics/http-networking.html',
    total: 11,
  },
  {
    id: 'security',
    title: 'Security',
    icon: '🔐',
    desc: 'Auth, JWT, OAuth 2.0, CORS, OWASP, XSS, CSRF, secrets management',
    path: 'topics/security.html',
    total: 10,
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    icon: '📦',
    desc: 'Docker, Kubernetes, CI/CD, deployment strategies, observability tooling',
    path: 'topics/infrastructure.html',
    total: 8,
  },
  {
    id: 'message-queues',
    title: 'Message Queues',
    icon: '📨',
    desc: 'Kafka, RabbitMQ, delivery semantics, pub/sub, DLQ',
    path: 'topics/message-queues.html',
    total: 10,
  },
];

// ── Storage ──────────────────────────────────────────────────

const CHECKS_KEY = 'primer:checks';

function getChecks() {
  try { return JSON.parse(localStorage.getItem(CHECKS_KEY) || '{}'); }
  catch { return {}; }
}

function setCheck(key, val) {
  const c = getChecks();
  c[key] = val;
  localStorage.setItem(CHECKS_KEY, JSON.stringify(c));
}

function getTopicProgress(topicId) {
  const checks = getChecks();
  const topic = TOPICS.find(t => t.id === topicId);
  const total = topic ? topic.total : 0;
  const completed = Object.entries(checks)
    .filter(([k, v]) => k.startsWith(topicId + ':') && v)
    .length;
  return { completed, total };
}

function getOverallProgress() {
  const total = TOPICS.reduce((s, t) => s + t.total, 0);
  const completed = TOPICS.reduce((s, t) => s + getTopicProgress(t.id).completed, 0);
  return { completed, total };
}

// ── Topic page ────────────────────────────────────────────────

function initChecklist(pageId) {
  const items = document.querySelectorAll('.check-item[data-id]');
  const checks = getChecks();

  items.forEach(item => {
    const fullKey = pageId + ':' + item.dataset.id;
    const cb = item.querySelector('input[type="checkbox"]');

    if (checks[fullKey]) {
      cb.checked = true;
      item.classList.add('checked');
    }

    const toggle = (force) => {
      cb.checked = force !== undefined ? force : !cb.checked;
      setCheck(fullKey, cb.checked);
      item.classList.toggle('checked', cb.checked);
      updateTopicProgressBar(pageId);
    };

    cb.addEventListener('change', () => toggle(cb.checked));

    item.addEventListener('click', e => {
      if (e.target !== cb) toggle();
    });
  });

  updateTopicProgressBar(pageId);
}

function updateTopicProgressBar(pageId) {
  const items = document.querySelectorAll('.check-item[data-id]');
  const total = items.length;
  const completed = document.querySelectorAll('.check-item[data-id] input:checked').length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const bar   = document.getElementById('topic-progress-bar');
  const label = document.getElementById('topic-progress-label');
  if (bar)   bar.style.width = pct + '%';
  if (label) label.textContent = completed + ' / ' + total + ' concepts covered';
}

// ── Dashboard ─────────────────────────────────────────────────

function initDashboard() {
  renderTopicCards();
  updateDashboardStats();
}

function makeTopicCard(topic, fromIndex) {
  const { completed, total } = getTopicProgress(topic.id);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const done = pct === 100;
  const path = fromIndex ? topic.path : topic.path.replace('topics/', '');

  const card = document.createElement('a');
  card.href = path;
  card.className = 'topic-card';
  card.innerHTML = `
    <div class="topic-card-top">
      <span class="topic-card-icon">${topic.icon}</span>
      <span class="topic-card-badge${done ? ' done' : ''}">${done ? '✓ done' : pct + '%'}</span>
    </div>
    <div class="topic-card-title">${topic.title}</div>
    <div class="topic-card-desc">${topic.desc}</div>
    <div class="topic-card-progress">
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${pct}%"></div>
      </div>
      <div class="progress-label">${completed} / ${total}</div>
    </div>
  `;
  return card;
}

function renderTopicCards() {
  const grid = document.getElementById('topic-grid');
  if (!grid) return;

  TIERS.forEach(tier => {
    const tierEl = document.createElement('div');
    tierEl.className = 'tier';

    const header = document.createElement('div');
    header.className = 'tier-header';
    header.innerHTML = `<span class="tier-label">${tier.label}</span><span class="tier-desc">${tier.desc}</span>`;
    tierEl.appendChild(header);

    const cardGrid = document.createElement('div');
    cardGrid.className = 'topic-grid';

    tier.ids.forEach(id => {
      const topic = TOPICS.find(t => t.id === id);
      if (topic) cardGrid.appendChild(makeTopicCard(topic, true));
    });

    tierEl.appendChild(cardGrid);
    grid.appendChild(tierEl);
  });
}

function updateDashboardStats() {
  const { completed, total } = getOverallProgress();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const started = TOPICS.filter(t => getTopicProgress(t.id).completed > 0).length;

  const bar   = document.getElementById('overall-progress-bar');
  const label = document.getElementById('overall-progress-label');
  if (bar)   bar.style.width = pct + '%';
  if (label) label.textContent = completed + ' / ' + total + ' concepts covered';

  const el = id => document.getElementById(id);
  if (el('stat-pct'))       el('stat-pct').textContent       = pct + '%';
  if (el('stat-completed')) el('stat-completed').textContent  = completed;
  if (el('stat-topics'))    el('stat-topics').textContent     = started + ' / ' + TOPICS.length;
}

// ── Reset ─────────────────────────────────────────────────────

function resetProgress() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  localStorage.removeItem(CHECKS_KEY);
  location.reload();
}
