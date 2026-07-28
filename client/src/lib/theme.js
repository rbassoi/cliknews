'use strict';

// Keep this key in sync with the inline early-apply script in server/views/layout.hbs
// (that script sets the attribute before first paint to avoid a flash of the wrong
// theme; this module is the runtime source of truth used by the sidebar toggle).
const STORAGE_KEY = 'cliker-theme';

function getTheme() {
    try {
        return localStorage.getItem(STORAGE_KEY) || 'dark';
    } catch (e) {
        return 'dark';
    }
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
        // localStorage unavailable (private mode, etc.) — theme just won't persist
    }
}

function toggleTheme() {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    applyTheme(next);
    return next;
}

module.exports = {
    getTheme,
    applyTheme,
    toggleTheme
};
