// Primer — markdown.js
// Lightweight markdown → HTML renderer for docs pages.
// Supports: headings, fenced code blocks (with Go highlighting), inline code,
// bold, italic, links, unordered/ordered lists, blockquotes, and HR.

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function headingId(rawText) {
  // Produce a URL-friendly anchor ID from heading text (strip inline markup)
  return rawText
    .replace(/`[^`]+`/g, m => m.slice(1, -1)) // strip backticks, keep text
    .replace(/[*_[\]()]/g, '')                  // strip other markup chars
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

function inlineRender(text) {
  // Protect inline code first so we don't process markup inside it
  const slots = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const i = slots.length;
    slots.push(`<code>${escHtml(code)}</code>`);
    return `\x00SLOT${i}\x00`;
  });

  // Images before links (same syntax overlap)
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    (_, alt, src) => `<img src="${escHtml(src)}" alt="${escHtml(alt)}">`);

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label, href) => `<a href="${escHtml(href)}">${label}</a>`);

  // Bold+italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g,      '<strong>$1</strong>');
  // Italic — be conservative: require non-space adjacent chars
  text = text.replace(/\*([^\s*][^*]*[^\s*]|\S)\*/g, '<em>$1</em>');
  text = text.replace(/_([^\s_][^_]*[^\s_]|\S)_/g,   '<em>$1</em>');

  // Restore slots
  text = text.replace(/\x00SLOT(\d+)\x00/g, (_, i) => slots[+i]);

  return text;
}

// Render a list item, which may itself contain nested lists
function renderListItem(rawText, listStack) {
  return `<li>${inlineRender(rawText)}</li>`;
}

function renderMarkdown(md) {
  // ── Pass 1: extract fenced code blocks ───────────────────────
  const blocks = [];
  md = md.replace(/^```(\w*)\r?\n([\s\S]*?)^```/gm, (_, lang, code) => {
    const i = blocks.length;
    // Trim trailing newline added before closing fence
    blocks.push({ lang: lang.trim(), code: code.replace(/\n$/, '') });
    return `\x00BLOCK${i}\x00`;
  });

  // ── Pass 2: line-by-line block rendering ─────────────────────
  const lines = md.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw; // keep original for prefix checks

    // ── Blank line ───────────────────────────────────────────
    if (line.trim() === '') { i++; continue; }

    // ── Fenced code block placeholder ───────────────────────
    const blockMatch = line.match(/^\x00BLOCK(\d+)\x00$/);
    if (blockMatch) {
      const { lang, code } = blocks[+blockMatch[1]];
      // Always escape here — caller applies syntax highlighting after DOM injection
      const langClass = lang ? ` class="language-${escHtml(lang)}"` : '';
      html += `<pre><code${langClass}>${escHtml(code)}</code></pre>\n`;
      i++;
      continue;
    }

    // ── Heading ──────────────────────────────────────────────
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      const rawTitle = hMatch[2];
      const id = headingId(rawTitle);
      const rendered = inlineRender(rawTitle);
      html += `<h${level} id="${id}">${rendered}</h${level}>\n`;
      i++;
      continue;
    }

    // ── Horizontal rule ──────────────────────────────────────
    if (/^[-*_]{3,}$/.test(line.trim())) {
      html += '<hr>\n';
      i++;
      continue;
    }

    // ── Blockquote ───────────────────────────────────────────
    if (/^>\s?/.test(line)) {
      const bqLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        bqLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      html += `<blockquote>\n${renderMarkdown(bqLines.join('\n'))}</blockquote>\n`;
      continue;
    }

    // ── Unordered list ───────────────────────────────────────
    if (/^[-*+]\s+/.test(line)) {
      html += '<ul>\n';
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        html += `  <li>${inlineRender(lines[i].replace(/^[-*+]\s+/, ''))}</li>\n`;
        i++;
      }
      html += '</ul>\n';
      continue;
    }

    // ── Ordered list ─────────────────────────────────────────
    if (/^\d+\.\s+/.test(line)) {
      html += '<ol>\n';
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        html += `  <li>${inlineRender(lines[i].replace(/^\d+\.\s+/, ''))}</li>\n`;
        i++;
      }
      html += '</ol>\n';
      continue;
    }

    // ── Paragraph ────────────────────────────────────────────
    // Collect lines until a blank line or a block-level element starts
    const pLines = [];
    while (i < lines.length) {
      const pl = lines[i];
      if (
        pl.trim() === '' ||
        /^#{1,6}\s/.test(pl) ||
        /^[-*+]\s+/.test(pl) ||
        /^\d+\.\s+/.test(pl) ||
        /^[-*_]{3,}$/.test(pl.trim()) ||
        /^>\s?/.test(pl) ||
        /^\x00BLOCK/.test(pl)
      ) break;
      pLines.push(pl);
      i++;
    }
    if (pLines.length > 0) {
      html += `<p>${inlineRender(pLines.join(' '))}</p>\n`;
    }
  }

  return html;
}

// ── TOC extraction ────────────────────────────────────────────────
// Returns [{level, text, id}, ...] for all headings in the document
function extractHeadings(md) {
  const headings = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const rawText = m[2];
      // Plain text for TOC label (strip backticks/asterisks etc.)
      const text = rawText
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      const id = headingId(rawText);
      headings.push({ level, text, id });
    }
  }
  return headings;
}
