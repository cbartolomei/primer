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
  window.primerSync?.schedulePush();
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

  // Re-apply checkboxes after a Gist pull on another device
  document.addEventListener('primer:synced', () => {
    const fresh = getChecks();
    sections.forEach(section => {
      const id  = pageId + ':' + section.dataset.id;
      const cb  = section.querySelector('input[type="checkbox"]');
      const span = section.querySelector('.section-understood span');
      const val = !!fresh[id];
      section.classList.toggle('checked', val);
      if (cb)   cb.checked = val;
      if (span) span.textContent = val ? '✓ Understood' : 'Mark understood';
    });
    updateSectionProgress(pageId);
  });
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

// ── Gist Sync ─────────────────────────────────────────────────
// Optional cross-device progress sync via a private GitHub Gist.
// Degrades gracefully when no token is configured.

(function () {
  const TOKEN_KEY     = 'primer:sync:token';
  const GIST_ID_KEY   = 'primer:sync:gist-id';
  const LAST_SYNC_KEY = 'primer:sync:last-synced';
  const GIST_FILE     = 'primer-progress.json';
  const GIST_DESC     = 'Primer study progress';
  const DEBOUNCE_MS   = 1500;

  let pushTimer = null;
  let _button   = null;

  // ── GitHub API helper ───────────────────────────────────────
  async function ghFetch(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error('No token');
    const res = await fetch('https://api.github.com' + path, {
      ...options,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error('GitHub ' + res.status + ': ' + msg);
    }
    return res.json();
  }

  // ── Pull ────────────────────────────────────────────────────
  async function pull() {
    const gistId = localStorage.getItem(GIST_ID_KEY);
    if (!gistId) return;
    try {
      const gist = await ghFetch('/gists/' + gistId);
      const raw  = gist.files?.[GIST_FILE]?.content;
      if (!raw) return;
      const remote = JSON.parse(raw);
      const local  = getChecks();
      const merged = Object.assign({}, local, remote);
      localStorage.setItem(CHECKS_KEY, JSON.stringify(merged));
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      document.dispatchEvent(new CustomEvent('primer:synced'));
      updateSyncButton('connected');
    } catch (e) {
      console.warn('[sync] pull failed:', e.message);
      if (e.message.includes('401') || e.message.includes('404')) {
        updateSyncButton('error');
      }
    }
  }

  // ── Find existing Gist ──────────────────────────────────────
  // Searches the account's gists for one already containing primer-progress.json
  // so a second device doesn't accidentally create a duplicate.
  async function findExistingGist() {
    try {
      const gists = await ghFetch('/gists?per_page=100');
      const found = gists.find(g => g.files && g.files[GIST_FILE]);
      return found ? found.id : null;
    } catch {
      return null;
    }
  }

  // ── Push ────────────────────────────────────────────────────
  async function push() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      let gistId = localStorage.getItem(GIST_ID_KEY);
      // No local gist ID — check GitHub for an existing one before creating
      if (!gistId) {
        gistId = await findExistingGist();
        if (gistId) localStorage.setItem(GIST_ID_KEY, gistId);
      }
      const body = JSON.stringify({
        description: GIST_DESC,
        public: false,
        files: { [GIST_FILE]: { content: JSON.stringify(getChecks(), null, 2) } },
      });
      if (gistId) {
        await ghFetch('/gists/' + gistId, {
          method: 'PATCH', body,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        const created = await ghFetch('/gists', {
          method: 'POST', body,
          headers: { 'Content-Type': 'application/json' },
        });
        localStorage.setItem(GIST_ID_KEY, created.id);
      }
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      updateSyncButton('connected');
    } catch (e) {
      console.warn('[sync] push failed:', e.message);
      updateSyncButton('error');
    }
  }

  // ── Debounced push ──────────────────────────────────────────
  function schedulePush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, DEBOUNCE_MS);
  }

  // ── Sync button ─────────────────────────────────────────────
  const STATE_TITLES = {
    disconnected: 'Set up Gist sync',
    connected:    'Sync connected — click to manage',
    error:        'Sync error — click to check settings',
    syncing:      'Syncing…',
  };

  function updateSyncButton(state) {
    if (!_button) return;
    _button.dataset.syncState = state;
    _button.title = STATE_TITLES[state] || '';
  }

  function syncIcon() {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>';
  }

  function renderSyncButton() {
    const header = document.querySelector('.site-header .inner');
    if (!header) return;

    const btn = document.createElement('button');
    btn.className  = 'sync-btn';
    btn.type       = 'button';
    btn.setAttribute('aria-label', 'Sync progress');
    btn.innerHTML  = syncIcon();
    _button = btn;
    header.appendChild(btn);

    updateSyncButton(localStorage.getItem(TOKEN_KEY) ? 'connected' : 'disconnected');

    btn.addEventListener('click', () => {
      if (localStorage.getItem(TOKEN_KEY)) {
        openSettingsPopover(btn);
      } else {
        openSetupModal();
      }
    });
  }

  // ── Setup modal ─────────────────────────────────────────────
  function openSetupModal() {
    removePopover();
    if (document.getElementById('sync-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'sync-modal';
    overlay.className = 'sync-modal-overlay';
    overlay.innerHTML = `
      <div class="sync-modal" role="dialog" aria-modal="true" aria-labelledby="sync-modal-title">
        <button class="sync-modal-close" aria-label="Close">&times;</button>
        <h2 id="sync-modal-title">Sync Progress Across Devices</h2>
        <p>Primer stores your progress in a private GitHub Gist. Works on any device where you paste your token.</p>
        <ol class="sync-steps">
          <li>Go to <strong>github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)</strong></li>
          <li>Click <strong>Generate new token (classic)</strong></li>
          <li>Give it any name (e.g. "Primer sync") and check the <strong>gist</strong> scope only</li>
          <li>Copy the token and paste it below</li>
        </ol>
        <div class="sync-field">
          <input id="sync-token-input" type="password" placeholder="ghp_xxxxxxxxxxxx" autocomplete="off" spellcheck="false">
          <button id="sync-connect-btn" class="sync-connect-btn">Connect</button>
        </div>
        <p id="sync-modal-error" class="sync-error" hidden></p>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelector('.sync-modal-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const input      = overlay.querySelector('#sync-token-input');
    const connectBtn = overlay.querySelector('#sync-connect-btn');
    const errEl      = overlay.querySelector('#sync-modal-error');

    connectBtn.addEventListener('click', async () => {
      const token = input.value.trim();
      if (!token) return;
      connectBtn.disabled = true;
      connectBtn.textContent = 'Connecting…';
      errEl.hidden = true;
      try {
        const res = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/vnd.github+json',
          },
        });
        if (!res.ok) throw new Error('Invalid token (HTTP ' + res.status + ')');
        localStorage.setItem(TOKEN_KEY, token);
        overlay.remove();
        updateSyncButton('connected');
        // Pull first so we discover the existing gist ID and merge remote progress,
        // then push to write any local progress back up.
        await pull();
        await push();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.hidden = false;
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect';
      }
    });

    input.addEventListener('keydown', e => { if (e.key === 'Enter') connectBtn.click(); });
    setTimeout(() => input.focus(), 50);
  }

  // ── Settings popover ────────────────────────────────────────
  function removePopover() {
    document.getElementById('sync-popover')?.remove();
  }

  function openSettingsPopover(anchor) {
    removePopover();

    const lastRaw = localStorage.getItem(LAST_SYNC_KEY);
    const lastStr = lastRaw ? new Date(lastRaw).toLocaleString() : 'Never';

    const pop = document.createElement('div');
    pop.id = 'sync-popover';
    pop.className = 'sync-popover';
    pop.innerHTML = `
      <div class="sync-popover-label">Gist sync</div>
      <div class="sync-popover-status">● Connected</div>
      <div class="sync-popover-muted">Last synced: ${lastStr}</div>
      <hr class="sync-popover-hr">
      <button id="sync-now-btn" class="sync-popover-btn">Sync now</button>
      <button id="sync-disconnect-btn" class="sync-popover-btn sync-popover-danger">Disconnect</button>`;

    document.body.appendChild(pop);

    const rect = anchor.getBoundingClientRect();
    pop.style.top   = (rect.bottom + window.scrollY + 6) + 'px';
    pop.style.right = (window.innerWidth - rect.right) + 'px';

    pop.querySelector('#sync-now-btn').addEventListener('click', async () => {
      removePopover();
      updateSyncButton('syncing');
      await push();
      await pull();
    });

    pop.querySelector('#sync-disconnect-btn').addEventListener('click', () => {
      if (!confirm('Disconnect sync? Your local progress is kept.')) return;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(GIST_ID_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      removePopover();
      updateSyncButton('disconnected');
    });

    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!pop.contains(e.target) && e.target !== anchor) {
          removePopover();
          document.removeEventListener('click', handler, true);
        }
      }, true);
    }, 0);
  }

  // ── Boot ────────────────────────────────────────────────────
  window.primerSync = { schedulePush, pull };

  function boot() {
    renderSyncButton();
    if (localStorage.getItem(TOKEN_KEY)) pull();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
