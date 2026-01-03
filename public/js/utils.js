/**
 * Shared Utilities for UUK Exhibitor Scan
 */

const THEME_KEY = "uuk_theme_preference";

/**
 * Initialize the theme based on saved preference or default to light.
 */
export function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeUI(savedTheme);
}

/**
 * Toggle between light and dark themes.
 */
export function toggleTheme() {
  const currentTheme =
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "light"
      : "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  localStorage.setItem(THEME_KEY, currentTheme);
  updateThemeUI(currentTheme);
}

/**
 * Update the UI elements (logo and toggle button) based on the current theme.
 * @param {string} theme - 'light' or 'dark'
 */
export function updateThemeUI(theme) {
  const toggleBtn = document.getElementById("theme-toggle");
  const logo = document.getElementById("uuk-logo");
  if (toggleBtn) toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  if (logo) {
    logo.src = theme === "dark" ? "/UUK_White_RGB.svg" : "/UUK_Black_RGB.svg";
  }
}

/**
 * Update the connectivity status indicator in the UI.
 * @param {Array} queue - The current offline queue
 * @param {HTMLElement} indicator - The status indicator element
 */
export function updateConnectivityUI(queue, indicator) {
  if (!indicator || !queue) return;

  if (navigator.onLine) {
    if (queue.length > 0) {
      indicator.textContent = `Syncing (${queue.length})...`;
      indicator.className = "status-indicator online";
    } else {
      indicator.textContent = "Online";
      indicator.className = "status-indicator online";
    }
  } else {
    indicator.textContent = `Offline (${queue.length} pending)`;
    indicator.className = "status-indicator offline";
  }
}
/**
 * Basic Haptic feedback helper
 */
export function vibrate(duration = 100) {
  if ("vibrate" in navigator) {
    navigator.vibrate(duration);
  }
}
