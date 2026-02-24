/**
 * Background Service Worker - LinkedIn Groq AI Auto Reply
 * Acts as a FETCH PROXY for content scripts (MV3 requirement)
 */

const BACKEND_URL = 'http://localhost:3001';

// ── Install ──────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
    console.log('[⚡ Groq AI Reply] Extension installed ✓');
    chrome.storage.sync.set({ tone: 'professional', darkMode: false, enabled: true });
    chrome.storage.local.set({ replyCount: 0, replyDate: new Date().toDateString() });
});

// ── Message Handler ───────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // ── GENERATE REPLY (proxy fetch to avoid MV3 content-script CSP block) ──
    if (request.type === 'GENERATE_REPLY') {
        fetch(`${BACKEND_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                comment: request.comment,
                tone: request.tone,
                commentType: request.commentType,
            }),
        })
            .then(async res => {
                const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
                sendResponse({ ok: true, reply: data.reply, tokens: data.tokens });
            })
            .catch(err => {
                console.error('[⚡ Groq] Fetch error:', err.message);
                sendResponse({ ok: false, error: err.message });
            });
        return true; // Keep message channel open for async response
    }

    // ── HEALTH CHECK ────────────────────────────────────────────────────────
    if (request.type === 'HEALTH_CHECK') {
        fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) })
            .then(res => res.json())
            .then(data => sendResponse({ ok: true, data }))
            .catch(err => sendResponse({ ok: false, error: err.message }));
        return true;
    }

    // ── GET DAILY STATS ──────────────────────────────────────────────────────
    if (request.type === 'GET_STATS') {
        chrome.storage.local.get(['replyCount', 'replyDate'], data => {
            const today = new Date().toDateString();
            sendResponse({
                count: data.replyDate === today ? data.replyCount || 0 : 0,
                limit: 10,
            });
        });
        return true;
    }

    // ── RESET COUNTER ────────────────────────────────────────────────────────
    if (request.type === 'RESET_COUNT') {
        chrome.storage.local.set({ replyCount: 0, replyDate: new Date().toDateString() }, () => {
            sendResponse({ success: true });
            updateBadge(0);
        });
        return true;
    }

    // ── UPDATE TONE ──────────────────────────────────────────────────────────
    if (request.type === 'UPDATE_TONE') {
        chrome.storage.sync.set({ tone: request.tone }, () => sendResponse({ success: true }));
        return true;
    }
});

// ── Badge Counter ────────────────────────────────────────────────────────────
function updateBadge(count) {
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: count >= 10 ? '#ef4444' : '#0ea5e9' });
}

chrome.storage.onChanged.addListener(changes => {
    if (changes.replyCount) updateBadge(changes.replyCount.newValue || 0);
});
