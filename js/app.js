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
    ids: ['caching', 'http-networking', 'api-design', 'security', 'infrastructure', 'message-queues'],
  },
];

const TOPICS = [
  {
    id: 'observability',
    title: 'Observability',
    icon: '🔭',
    desc: 'Logs, metrics, traces, Prometheus, OpenTelemetry, SLOs, error budgets',
    path: 'topics/observability.html',
    total: 4,
  },
  {
    id: 'databases',
    title: 'Databases',
    icon: '🗄️',
    desc: 'ACID, isolation levels, indexing, query optimization, replication, sharding',
    path: 'topics/databases.html',
    total: 5,
  },
  {
    id: 'system-design',
    title: 'System Design',
    icon: '🏗️',
    desc: 'Scaling, load balancing, distributed theory, resilience patterns, architecture',
    path: 'topics/system-design.html',
    total: 4,
  },
  {
    id: 'caching',
    title: 'Caching',
    icon: '⚡',
    desc: 'Cache strategies, Redis data structures, HTTP caching, CDN',
    path: 'topics/caching.html',
    total: 3,
  },
  {
    id: 'http-networking',
    title: 'HTTP & APIs',
    icon: '🌐',
    desc: 'HTTP/1.1–3, REST, GraphQL, gRPC, WebSockets, TLS, DNS, TCP',
    path: 'topics/http-networking.html',
    total: 3,
  },
  {
    id: 'api-design',
    title: 'API Design',
    icon: '🔌',
    desc: 'REST in depth, rate limiting algorithms, idempotency keys, pagination, webhooks, versioning',
    path: 'topics/api-design.html',
    total: 5,
  },
  {
    id: 'security',
    title: 'Security',
    icon: '🔐',
    desc: 'Auth, OAuth 2.0, OWASP vulnerabilities, TLS, secrets management',
    path: 'topics/security.html',
    total: 3,
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    icon: '📦',
    desc: 'Docker, Kubernetes, CI/CD, deployment strategies, observability tooling',
    path: 'topics/infrastructure.html',
    total: 3,
  },
  {
    id: 'message-queues',
    title: 'Message Queues',
    icon: '📨',
    desc: 'Kafka, RabbitMQ, delivery semantics, pub/sub, DLQ',
    path: 'topics/message-queues.html',
    total: 3,
  },
];

// ── Go topics ─────────────────────────────────────────────────
const GO_TOPICS = [
  {
    id: 'go-fundamentals',
    title: 'Go Fundamentals',
    icon: '🔤',
    desc: 'Types, structs, interfaces, error handling, pointers, packages, and modules',
    path: 'topics/go-fundamentals.html',
    total: 6,
  },
  {
    id: 'go-control-data',
    title: 'Control Structures & Data',
    icon: '🔀',
    desc: 'for, range, switch, new vs make, arrays, slices, maps, and fmt',
    path: 'topics/go-control-data.html',
    total: 6,
  },
  {
    id: 'go-concurrency',
    title: 'Concurrency',
    icon: '⚡',
    desc: 'Goroutines, channels, select, context, sync primitives, and concurrency patterns',
    path: 'topics/go-concurrency.html',
    total: 5,
  },
  {
    id: 'go-patterns',
    title: 'Patterns & Idioms',
    icon: '🎯',
    desc: 'Interfaces in practice, testing, standard library, and idiomatic Go',
    path: 'topics/go-patterns.html',
    total: 4,
  },
  {
    id: 'go-idioms',
    title: 'Go Idioms',
    icon: '💡',
    desc: 'Godoc, naming conventions, blank identifier, embedding, and function types',
    path: 'topics/go-idioms.html',
    total: 5,
  },
  {
    id: 'go-http',
    title: 'HTTP Servers',
    icon: '🌐',
    desc: 'net/http, routing, middleware, html/template, database/sql, sessions, TLS, and file embedding',
    path: 'topics/go-http.html',
    total: 6,
  },
  {
    id: 'go-api',
    title: 'REST APIs & Production Go',
    icon: '🚀',
    desc: 'JSON patterns, CRUD with PostgreSQL, filtering, rate limiting, token auth, graceful shutdown, and deployment',
    path: 'topics/go-api.html',
    total: 6,
  },
];

const GO_TIERS = [
  {
    label: 'Tier 1 — Start Here',
    desc: 'The language fundamentals. Get productive fast.',
    ids: ['go-fundamentals', 'go-control-data', 'go-concurrency'],
  },
  {
    label: 'Tier 2 — Patterns & Idioms',
    desc: 'Write Go the way the community writes it.',
    ids: ['go-patterns', 'go-idioms'],
  },
  {
    label: 'Tier 3 — Building Real Services',
    desc: 'HTTP servers, REST APIs, and production operations.',
    ids: ['go-http', 'go-api'],
  },
];

// ── Tracks (for landing page) ─────────────────────────────────
const TRACKS = [
  {
    id: 'backend',
    title: 'Backend Engineering',
    icon: '⚙️',
    desc: 'Systems, databases, APIs, caching, infrastructure — the foundations of production software.',
    path: 'backend.html',
    topics: TOPICS,
  },
  {
    id: 'go',
    title: 'Go',
    icon: '🐹',
    iconSrc: 'images/go-gopher.png',
    desc: 'The Go programming language — syntax, interfaces, concurrency, and idiomatic patterns.',
    path: 'go.html',
    topics: GO_TOPICS,
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
  const topic = [...TOPICS, ...GO_TOPICS].find(t => t.id === topicId);
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

function initSections(pageId) {
  const sections = document.querySelectorAll('.section[data-id]');
  const checks = getChecks();

  sections.forEach(section => {
    const id = pageId + ':' + section.dataset.id;
    const cb = section.querySelector('input[type="checkbox"]');
    const span = section.querySelector('.section-understood span');

    const apply = (val) => {
      section.classList.toggle('checked', val);
      if (span) span.textContent = val ? '✓ Understood' : 'Mark understood';
    };

    apply(!!checks[id]);
    if (cb) cb.checked = !!checks[id];

    if (cb) {
      cb.addEventListener('change', () => {
        setCheck(id, cb.checked);
        apply(cb.checked);
        updateSectionProgress(pageId);
        updateTOCItem(section.dataset.id, cb.checked);
      });
    }
  });

  updateSectionProgress(pageId);
  buildTOC();
}

function buildTOC() {
  const sections = document.querySelectorAll('.section[data-id]');
  const topicContent = document.querySelector('.topic-content');
  if (!sections.length || !topicContent) return;

  // Assign anchor IDs
  sections.forEach(s => { s.id = 'section-' + s.dataset.id; });

  const items = [...sections].map(section => {
    const id    = section.dataset.id;
    const icon  = section.querySelector('.section-icon')?.textContent?.trim() || '';
    const title = section.querySelector('.section-header h2')?.textContent?.trim() || '';
    const done  = section.classList.contains('checked');
    return `<li class="toc-item${done ? ' checked' : ''}" data-toc-id="${id}">
      <a href="#section-${id}"><span class="toc-icon">${icon}</span><span>${title}</span></a>
    </li>`;
  }).join('');

  const sidebar = document.createElement('aside');
  sidebar.className = 'toc-sidebar';
  sidebar.innerHTML = `<div class="toc-title">Contents</div><ul class="toc-list">${items}</ul>`;

  // Wrap topic-content in page-body and insert sidebar before it
  const pageBody = document.createElement('div');
  pageBody.className = 'page-body';
  topicContent.parentNode.insertBefore(pageBody, topicContent);
  pageBody.appendChild(sidebar);
  pageBody.appendChild(topicContent);

  // Widen the main container to fit sidebar + content
  const main = document.querySelector('main.container');
  if (main) main.classList.replace('container', 'container-wide');

  // Highlight the active section while scrolling
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const item = document.querySelector(`.toc-item[data-toc-id="${entry.target.dataset.id}"]`);
      if (item) item.classList.toggle('active', entry.isIntersecting);
    });
  }, { rootMargin: '-8% 0px -80% 0px', threshold: 0 });

  sections.forEach(s => observer.observe(s));
}

function updateTOCItem(sectionId, checked) {
  const item = document.querySelector(`.toc-item[data-toc-id="${sectionId}"]`);
  if (item) item.classList.toggle('checked', checked);
}

function updateSectionProgress(pageId) {
  const sections = document.querySelectorAll('.section[data-id]');
  const total = sections.length;
  const completed = [...sections].filter(s => s.classList.contains('checked')).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const bar   = document.getElementById('topic-progress-bar');
  const label = document.getElementById('topic-progress-label');
  if (bar)   bar.style.width = pct + '%';
  if (label) label.textContent = completed + ' / ' + total + ' sections understood';
}

// ── Landing page ──────────────────────────────────────────────

function initLanding() {
  const grid = document.getElementById('track-grid');
  if (!grid) return;
  TRACKS.forEach(track => grid.appendChild(makeTrackCard(track)));
}

function getTrackProgress(topics) {
  const total     = topics.reduce((s, t) => s + t.total, 0);
  const completed = topics.reduce((s, t) => s + getTopicProgress(t.id).completed, 0);
  return { completed, total };
}

function makeTrackCard(track) {
  const { completed, total } = getTrackProgress(track.topics);
  const pct  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const done = pct === 100 && total > 0;

  const el = document.createElement(track.comingSoon ? 'div' : 'a');
  if (!track.comingSoon) el.href = track.path;
  el.className = 'track-card' + (track.comingSoon ? ' track-card-soon' : '');

  el.innerHTML = `
    <div class="track-card-top">
      <span class="track-card-icon">${track.iconSrc
        ? `<img src="${track.iconSrc}" alt="${track.title}" class="track-card-icon-img">`
        : track.icon}</span>
      ${track.comingSoon
        ? '<span class="track-card-badge track-card-badge-muted">Coming soon</span>'
        : `<span class="track-card-badge${done ? ' done' : ''}">${done ? '✓ done' : pct + '%'}</span>`}
    </div>
    <div class="track-card-title">${track.title}</div>
    <div class="track-card-desc">${track.desc}</div>
    ${total > 0 ? `
    <div class="track-card-progress">
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      <div class="progress-label">${completed} / ${total} sections understood</div>
    </div>` : ''}
  `;
  return el;
}

// ── Dashboard ─────────────────────────────────────────────────

function initDashboard(topics, tiers) {
  topics = topics || TOPICS;
  tiers  = tiers  || TIERS;
  renderTopicCards(topics, tiers);
  updateDashboardStats(topics);
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

function renderTopicCards(topics, tiers) {
  topics = topics || TOPICS;
  tiers  = tiers  || TIERS;
  const grid = document.getElementById('topic-grid');
  if (!grid) return;

  tiers.forEach(tier => {
    const tierEl = document.createElement('div');
    tierEl.className = 'tier';

    const header = document.createElement('div');
    header.className = 'tier-header';
    header.innerHTML = `<span class="tier-label">${tier.label}</span><span class="tier-desc">${tier.desc}</span>`;
    tierEl.appendChild(header);

    const cardGrid = document.createElement('div');
    cardGrid.className = 'topic-grid';

    tier.ids.forEach(id => {
      const topic = topics.find(t => t.id === id);
      if (topic) cardGrid.appendChild(makeTopicCard(topic, true));
    });

    tierEl.appendChild(cardGrid);
    grid.appendChild(tierEl);
  });
}

function updateDashboardStats(topics) {
  topics = topics || TOPICS;
  const total     = topics.reduce((s, t) => s + t.total, 0);
  const completed = topics.reduce((s, t) => s + getTopicProgress(t.id).completed, 0);
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const started   = topics.filter(t => getTopicProgress(t.id).completed > 0).length;

  const bar   = document.getElementById('overall-progress-bar');
  const label = document.getElementById('overall-progress-label');
  if (bar)   bar.style.width = pct + '%';
  if (label) label.textContent = completed + ' / ' + total + ' concepts covered';

  const el = id => document.getElementById(id);
  if (el('stat-pct'))       el('stat-pct').textContent       = pct + '%';
  if (el('stat-completed')) el('stat-completed').textContent  = completed;
  if (el('stat-topics'))    el('stat-topics').textContent     = started + ' / ' + topics.length;
}

// ── Reset ─────────────────────────────────────────────────────

function resetProgress() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  localStorage.removeItem(CHECKS_KEY);
  location.reload();
}
