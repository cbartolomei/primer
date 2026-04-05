// highlight.js — minimal Go syntax highlighter
// Tokenizer-based: processes comments and strings first so keywords
// inside string literals are never coloured incorrectly.
(function () {
  'use strict';

  const KEYWORDS = new Set([
    'break','case','chan','const','continue','default','defer','else',
    'fallthrough','for','func','go','goto','if','import','interface',
    'map','package','range','return','select','struct','switch','type','var',
  ]);

  const BUILTIN_TYPES = new Set([
    'bool','byte','complex64','complex128','error','float32','float64',
    'int','int8','int16','int32','int64','rune','string','uint','uint8',
    'uint16','uint32','uint64','uintptr','any',
  ]);

  const BUILTIN_FUNCS = new Set([
    'append','cap','close','copy','delete','len','make','new',
    'panic','print','println','recover',
  ]);

  const LITERALS = new Set(['nil', 'true', 'false', 'iota']);

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function span(cls, text) {
    return `<span class="hl-${cls}">${esc(text)}</span>`;
  }

  function tokenize(code) {
    const out = [];
    let i = 0;
    const n = code.length;

    while (i < n) {
      // ── Line comment ─────────────────────────────────────────
      if (code[i] === '/' && code[i + 1] === '/') {
        let j = i;
        while (j < n && code[j] !== '\n') j++;
        out.push(span('comment', code.slice(i, j)));
        i = j;
        continue;
      }

      // ── Block comment ─────────────────────────────────────────
      if (code[i] === '/' && code[i + 1] === '*') {
        let j = i + 2;
        while (j < n - 1 && !(code[j] === '*' && code[j + 1] === '/')) j++;
        j += 2;
        out.push(span('comment', code.slice(i, j)));
        i = j;
        continue;
      }

      // ── Interpreted string ────────────────────────────────────
      if (code[i] === '"') {
        let j = i + 1;
        while (j < n && code[j] !== '"') {
          if (code[j] === '\\') j++;
          j++;
        }
        j++;
        out.push(span('string', code.slice(i, j)));
        i = j;
        continue;
      }

      // ── Raw string literal ────────────────────────────────────
      if (code[i] === '`') {
        let j = i + 1;
        while (j < n && code[j] !== '`') j++;
        j++;
        out.push(span('string', code.slice(i, j)));
        i = j;
        continue;
      }

      // ── Rune literal ──────────────────────────────────────────
      if (code[i] === "'") {
        let j = i + 1;
        if (j < n && code[j] === '\\') j++;
        j++;
        if (j < n && code[j] === "'") j++;
        out.push(span('string', code.slice(i, j)));
        i = j;
        continue;
      }

      // ── Number ────────────────────────────────────────────────
      if (code[i] >= '0' && code[i] <= '9') {
        let j = i;
        if (code[i] === '0' && (code[i + 1] === 'x' || code[i + 1] === 'X')) {
          j += 2;
          while (j < n && /[0-9a-fA-F_]/.test(code[j])) j++;
        } else {
          while (j < n && /[0-9._eExXbBoO]/.test(code[j])) j++;
        }
        out.push(span('number', code.slice(i, j)));
        i = j;
        continue;
      }

      // ── Identifier / keyword / type / builtin ─────────────────
      if (/[a-zA-Z_]/.test(code[i])) {
        let j = i;
        while (j < n && /[a-zA-Z0-9_]/.test(code[j])) j++;
        const word = code.slice(i, j);

        if (KEYWORDS.has(word)) {
          out.push(span('keyword', word));
        } else if (BUILTIN_TYPES.has(word)) {
          out.push(span('type', word));
        } else if (BUILTIN_FUNCS.has(word)) {
          out.push(span('builtin', word));
        } else if (LITERALS.has(word)) {
          out.push(span('literal', word));
        } else if (code[j] === '(') {
          // function / method call
          out.push(span('func', word));
        } else {
          out.push(esc(word));
        }
        i = j;
        continue;
      }

      // ── Everything else ───────────────────────────────────────
      out.push(esc(code[i]));
      i++;
    }

    return out.join('');
  }

  function highlightAll() {
    document.querySelectorAll('pre > code').forEach(block => {
      block.innerHTML = tokenize(block.textContent);
    });
  }

  // Expose for external callers (e.g. docs.html after dynamic markdown render)
  window.highlightAll = highlightAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightAll);
  } else {
    highlightAll();
  }
})();
