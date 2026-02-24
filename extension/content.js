/**
 * LinkedIn Groq AI Auto Reply — Content Script v4
 * Ultra-aggressive detection — works on ANY LinkedIn DOM structure
 */

(function () {
  'use strict';

  if (window.__groqV4) return;
  window.__groqV4 = true;

  const DAILY_LIMIT = 10;
  const DONE_ATTR = 'data-groq-done';
  const log = (...a) => console.log('%c⚡ Groq AI Reply', 'color:#0ea5e9;font-weight:bold', ...a);

  log('✅ Content script v3 LOADED');

  // ── Active badge ─────────────────────────────────────────────────────────
  function showBadge() {
    if (document.getElementById('groq-badge')) return;
    const b = Object.assign(document.createElement('div'), { id: 'groq-badge', textContent: '⚡ Groq AI Active' });
    Object.assign(b.style, {
      position: 'fixed', bottom: '20px', left: '20px', zIndex: '2147483647',
      background: 'linear-gradient(135deg,#0ea5e9,#8b5cf6)', color: '#fff',
      fontFamily: 'sans-serif', fontSize: '12px', fontWeight: '700',
      padding: '8px 16px', borderRadius: '20px', cursor: 'pointer',
      boxShadow: '0 4px 20px rgba(14,165,233,0.5)',
      transition: 'opacity 0.5s', opacity: '1',
    });
    b.onclick = () => b.style.opacity = '0';
    document.body.appendChild(b);
    setTimeout(() => b.style.opacity = '0', 5000);
  }

  // ── Comment Type ─────────────────────────────────────────────────────────
  const PATTERNS = {
    toxic: /idiot|moron|loser|racist|sexist|bigot/i,
    spam: /click here|buy now|free money|dm me|link in bio/i,
    political: /democrat|republican|trump|biden|election|vote for/i,
    question: /\?|how |what |why |when |where |who |can you|help me/i,
    congratulation: /congrat|well done|great job|proud|awesome|milestone/i,
    negative: /terrible|awful|hate |disagree|worst|fail|scam/i,
    opinion: /i think|i believe|in my opinion|personally|imho/i,
  };
  const detectType = t => Object.entries(PATTERNS).find(([, re]) => re.test(t.toLowerCase()))?.[0] || 'general';
  const isSafe = t => !['toxic', 'spam', 'political'].includes(t);

  // ── Storage ───────────────────────────────────────────────────────────────
  const getDailyCount = () => new Promise(r => {
    chrome.storage.local.get(['replyCount', 'replyDate'], d => {
      if (d.replyDate !== new Date().toDateString()) {
        chrome.storage.local.set({ replyCount: 0, replyDate: new Date().toDateString() });
        r(0);
      } else r(d.replyCount || 0);
    });
  });
  const incCount = () => new Promise(r =>
    chrome.storage.local.get(['replyCount', 'replyDate'], d => {
      const today = new Date().toDateString();
      chrome.storage.local.set({ replyCount: d.replyDate === today ? (d.replyCount || 0) + 1 : 1, replyDate: today }, r);
    })
  );
  const getSettings = () => new Promise(r => chrome.storage.sync.get({ tone: 'professional', enabled: true }, r));

  // ── Toast ─────────────────────────────────────────────────────────────────
  function toast(msg, type = 'info') {
    document.querySelector('.groq-toast')?.remove();
    const colors = { success: '#22c55e', error: '#ef4444', warning: '#f59e0b', info: '#0ea5e9' };
    const t = Object.assign(document.createElement('div'), { className: `groq-toast groq-toast--${type}`, textContent: msg });
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('groq-toast--visible'));
    setTimeout(() => { t.classList.remove('groq-toast--visible'); setTimeout(() => t.remove(), 400); }, 4000);
  }

  // ── Extract text from element ─────────────────────────────────────────────
  function extractText(el) {
    // Try known LinkedIn selectors first
    const tries = [
      '[class*="comment-item__main-content"]',
      '[class*="comment__content"]',
      '[class*="comment__body"]',
      '[class*="attributed-text-segment"]',
      '[class*="attributed-text"]',
      '[dir="ltr"]', '[dir="rtl"]',
      '[class*="break-words"]',
      'p', 'span',
    ];
    for (const s of tries) {
      const found = el.querySelector(s);
      if (found) {
        const txt = (found.innerText || found.textContent || '').trim();
        if (txt.length > 3 && txt.length < 5000) return txt;
      }
    }
    // Last resort: own text content, strip whitespace
    const raw = [...el.childNodes]
      .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && !['BUTTON', 'A', 'svg'].includes(n.tagName)))
      .map(n => n.innerText || n.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return raw.length > 3 ? raw.slice(0, 2000) : '';
  }

  // ── Find the comment input ────────────────────────────────────────────────
  function findInput() {
    const sel = [
      '.ql-editor[contenteditable="true"]',
      '[contenteditable="true"][data-placeholder*="comment" i]',
      '[contenteditable="true"][data-placeholder*="reply" i]',
      '[contenteditable="true"][data-placeholder*="Add" i]',
      '[contenteditable="true"]',
    ];
    for (const s of sel) {
      const els = [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null);
      if (els.length) return els[0];
    }
    return null;
  }

  function typeIntoInput(inp, text) {
    inp.focus(); inp.click();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);
    ['input', 'keydown', 'keyup', 'change', 'compositionend'].forEach(e =>
      inp.dispatchEvent(new Event(e, { bubbles: true }))
    );
    inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── AI Reply ──────────────────────────────────────────────────────────────
  async function handleClick(btn, text, type) {
    const settings = await getSettings();
    if (!settings.enabled) { toast('⏸️ Paused. Enable from popup.', 'warning'); return; }

    const count = await getDailyCount();
    if (count >= DAILY_LIMIT) { toast(`🚫 Daily limit (${DAILY_LIMIT}) reached.`, 'error'); return; }

    btn.disabled = true;
    btn.classList.add('groq-reply-btn--loading');
    const lbl = btn.querySelector('.groq-btn-label');
    const ico = btn.querySelector('.groq-btn-icon');
    lbl.textContent = 'Generating…'; ico.textContent = '⏳';

    try {
      const data = await new Promise((res, rej) => {
        chrome.runtime.sendMessage(
          { type: 'GENERATE_REPLY', comment: text, tone: settings.tone, commentType: type },
          r => {
            if (chrome.runtime.lastError) return rej(new Error(chrome.runtime.lastError.message));
            if (!r || !r.ok) return rej(new Error(r?.error || 'Unknown error'));
            res(r);
          }
        );
      });

      log('Reply received ✓');

      const inp = findInput();
      if (inp) {
        typeIntoInput(inp, data.reply);
        toast('✅ Reply inserted! Review & post.', 'success');
      } else {
        await navigator.clipboard.writeText(data.reply).catch(() => { });
        toast('📋 Copied to clipboard — paste with Ctrl+V', 'info');
      }

      await incCount();
      setTimeout(() => toast(`⚡ ${DAILY_LIMIT - count - 1} replies left today.`, 'info'), 4000);

    } catch (err) {
      log('ERROR', err.message);
      toast(`❌ ${err.message}`, 'error');
    } finally {
      btn.disabled = false; btn.classList.remove('groq-reply-btn--loading');
      lbl.textContent = 'Generate AI Reply'; ico.textContent = '⚡';
    }
  }

  // ── Build action bar ──────────────────────────────────────────────────────
  function buildBar(el, text) {
    const type = detectType(text);

    const bar = document.createElement('div');
    bar.className = 'groq-action-bar';

    const badge = document.createElement('span');
    badge.className = `groq-badge groq-badge--${type}`;
    badge.textContent = {
      question: '❓ Question', congratulation: '🎉 Congrats', negative: '⚠️ Negative',
      opinion: '💬 Opinion', general: '💼 General',
      toxic: '🚫 Blocked', spam: '🚫 Spam', political: '🚫 Political',
    }[type] || type;
    bar.appendChild(badge);

    if (isSafe(type)) {
      const btn = document.createElement('button');
      btn.className = 'groq-reply-btn';
      btn.innerHTML = '<span class="groq-btn-icon">⚡</span><span class="groq-btn-label">Generate AI Reply</span>';
      btn.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); handleClick(btn, text, type); });
      bar.appendChild(btn);
    }

    return bar;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CORE: Multi-strategy comment detection
  // ═══════════════════════════════════════════════════════════════════

  function tryInject(el) {
    if (!el || el.hasAttribute(DONE_ATTR)) return false;
    // Skip tiny or hidden elements
    if (el.offsetWidth < 50 || el.offsetHeight < 10) return false;

    const text = extractText(el);
    if (!text || text.length < 8) return false;

    // Skip if this element is a parent of another already-processed element
    if (el.querySelector(`[${DONE_ATTR}]`)) return false;

    el.setAttribute(DONE_ATTR, '1');

    const bar = buildBar(el, text);

    // Find the best place to insert
    const anchor =
      el.querySelector('[class*="social-bar"]') ||
      el.querySelector('[class*="action-bar"]') ||
      el.querySelector('[class*="actions"]') ||
      el.querySelector('[class*="footer"]') ||
      el.querySelector('[class*="reactions"]');

    if (anchor) anchor.after(bar);
    else el.appendChild(bar);

    log('✓ Injected →', el.tagName, (el.className || '').toString().slice(0, 50));
    return true;
  }

  function scan() {
    let count = 0;

    // ① data-urn with "comment" — most reliable LinkedIn identifier
    document.querySelectorAll('[data-urn*="comment"]').forEach(el => {
      if (tryInject(el)) count++;
    });

    // ② Class name patterns — covers renamed classes
    const classSelectors = [
      '.comments-comment-item',
      '.comments-comment-entity',
      '[class*="comments-comment"]',
      '[class*="comment-item"]',
      '[class*="CommentItem"]',
      '[class*="comment__content"]',
      'article[class*="comment"]',
      'li[class*="comment"]',
    ];
    classSelectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => { if (tryInject(el)) count++; });
      } catch (e) { }
    });

    // ③ aria-label patterns
    document.querySelectorAll('[aria-label*="comment" i],[aria-describedby*="comment" i]').forEach(el => {
      if (tryInject(el)) count++;
    });

    // ④ NUCLEAR OPTION: find comments container, then try direct children
    const containers = document.querySelectorAll(
      '[class*="comments-comments-list"], [class*="comment-list"], [class*="comments-list"]'
    );
    containers.forEach(container => {
      // Try direct children (li, article, div)
      [...container.children].forEach(child => {
        if (tryInject(child)) count++;
      });
    });

    if (count > 0) log(`Injected into ${count} comment(s)`);
  }

  // ── Auto scan ────────────────────────────────────────────────────────────
  let timer;
  const debounce = ms => { clearTimeout(timer); timer = setTimeout(scan, ms); };

  new MutationObserver(() => debounce(400))
    .observe(document.body, { childList: true, subtree: true });

  window.addEventListener('scroll', () => debounce(600), { passive: true });

  // Staggered initial scans
  showBadge();
  [800, 2000, 3500, 6000, 10000].forEach(ms => setTimeout(scan, ms));

  // Also re-scan every 5s for first 30s (handles lazy loading)
  let autoScanCount = 0;
  const autoScan = setInterval(() => {
    scan();
    if (++autoScanCount >= 6) clearInterval(autoScan);
  }, 5000);

})();
