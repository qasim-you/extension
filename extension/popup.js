/**
 * Popup Script - LinkedIn Groq AI Auto Reply
 */

// ─── DOM Refs ────────────────────────────────────────────────────────────────

const body = document.getElementById('popup-body');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const enableToggle = document.getElementById('enableToggle');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const repliesUsed = document.getElementById('repliesUsed');
const repliesRemaining = document.getElementById('repliesRemaining');
const progressBar = document.getElementById('progressBar');
const toneGrid = document.getElementById('toneGrid');
const resetBtn = document.getElementById('resetBtn');
const serverDot = document.getElementById('serverDot');
const serverStatusText = document.getElementById('serverStatusText');
const popupToast = document.getElementById('popupToast');

// ─── Init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadStats();
    await checkServerStatus();
});

// ─── Settings ────────────────────────────────────────────────────────────────

async function loadSettings() {
    const settings = await chrome.storage.sync.get({ tone: 'professional', darkMode: false, enabled: true });

    // Apply theme
    applyTheme(settings.darkMode);

    // Apply enable toggle
    enableToggle.checked = settings.enabled;
    updateStatusBanner(settings.enabled);

    // Apply tone
    setActiveTone(settings.tone);
}

function applyTheme(isDark) {
    body.className = isDark ? 'dark' : 'light';
    themeIcon.textContent = isDark ? '☀️' : '🌙';
}

function setActiveTone(tone) {
    document.querySelectorAll('.tone-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tone === tone);
    });
}

function updateStatusBanner(enabled) {
    statusDot.className = 'status-dot ' + (enabled ? 'status-dot--active' : 'status-dot--inactive');
    statusText.textContent = enabled ? 'Extension Active' : 'Extension Paused';
}

// ─── Stats ───────────────────────────────────────────────────────────────────

async function loadStats() {
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (data) => {
        if (chrome.runtime.lastError || !data) return;
        const used = data.count;
        const limit = data.limit;
        const remaining = Math.max(0, limit - used);
        const percent = (used / limit) * 100;

        repliesUsed.textContent = used;
        repliesRemaining.textContent = remaining;
        progressBar.style.width = percent + '%';
        progressBar.style.background =
            percent >= 90 ? 'var(--color-danger)' :
                percent >= 60 ? 'var(--color-warning)' :
                    'var(--color-primary)';

        // Animate numbers
        animateNumber(repliesUsed, used);
        animateNumber(repliesRemaining, remaining);
    });
}

function animateNumber(el, target) {
    const start = 0;
    const duration = 600;
    const startTime = performance.now();

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        el.textContent = Math.round(start + (target - start) * easeOut(progress));
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

// Theme Toggle
themeToggle.addEventListener('click', () => {
    const isDark = body.classList.contains('dark');
    applyTheme(!isDark);
    chrome.storage.sync.set({ darkMode: !isDark });
});

// Enable/Disable Toggle
enableToggle.addEventListener('change', () => {
    const enabled = enableToggle.checked;
    updateStatusBanner(enabled);
    chrome.storage.sync.set({ enabled });
    showToast(enabled ? '✅ Extension enabled' : '⏸️ Extension paused');
});

// Tone Buttons
toneGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.tone-btn');
    if (!btn) return;
    const tone = btn.dataset.tone;
    setActiveTone(tone);
    chrome.runtime.sendMessage({ type: 'UPDATE_TONE', tone });
    showToast(`🎯 Tone set to ${btn.querySelector('.tone-name').textContent}`);
});

// Reset Counter
resetBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESET_COUNT' }, () => {
        showToast('🔄 Counter reset!');
        loadStats();
    });
});

// ─── Server Status ────────────────────────────────────────────────────────────

async function checkServerStatus() {
    chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' }, response => {
        if (chrome.runtime.lastError || !response?.ok) {
            serverDot.className = 'server-dot server-dot--offline';
            serverStatusText.textContent = 'Backend Offline — run npm run dev';
        } else {
            serverDot.className = 'server-dot server-dot--online';
            serverStatusText.textContent = 'Backend Connected ✓';
        }
    });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(message) {
    clearTimeout(toastTimer);
    popupToast.textContent = message;
    popupToast.classList.add('popup-toast--visible');
    toastTimer = setTimeout(() => popupToast.classList.remove('popup-toast--visible'), 2500);
}
