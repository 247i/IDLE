/**
 * Common utilities for webview functionality
 */

/**
 * Escapes HTML characters to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - The escaped HTML text
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Shows a loading overlay
 * @param {HTMLElement} loadingOverlay - The loading overlay element
 */
function showLoading(loadingOverlay) {
  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";
  }
}

/**
 * Hides a loading overlay
 * @param {HTMLElement} loadingOverlay - The loading overlay element
 */
function hideLoading(loadingOverlay) {
  if (loadingOverlay) {
    loadingOverlay.style.display = "none";
  }
}

/**
 * Generates a unique operation key for tracking operations
 * @param {string} operation - The operation type
 * @param {string} packageName - The package name
 * @param {string} projectPath - The project path
 * @returns {string} - The unique operation key
 */
function generateOperationKey(operation, packageName, projectPath) {
  return `${operation}:${packageName}:${projectPath}`;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    escapeHtml,
    showLoading,
    hideLoading,
    generateOperationKey
  };
}
