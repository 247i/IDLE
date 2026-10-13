/**
 * Dialog utilities for the NuGet Package Manager
 * Contains all dialog-related functionality including confirm, error, info, and loading dialogs
 */

// Custom confirmation dialog for webview
function showConfirmDialog(message, onConfirm, onCancel = null) {
  // Create dialog overlay
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";

  // Create dialog
  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog";

  // Message
  const messageEl = document.createElement("p");
  messageEl.textContent = message;
  dialog.appendChild(messageEl);

  // Buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "confirm-buttons";

  // Confirm button
  const confirmBtn = document.createElement("button");
  confirmBtn.textContent = "Yes";
  confirmBtn.className = "btn-primary";
  confirmBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  };

  // Cancel button
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "btn-secondary";
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  };

  buttonsContainer.appendChild(confirmBtn);
  buttonsContainer.appendChild(cancelBtn);
  dialog.appendChild(buttonsContainer);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus the confirm button
  confirmBtn.focus();

  // Handle ESC key
  const handleKeyPress = (e) => {
    if (e.key === "Escape") {
      document.body.removeChild(overlay);
      if (onCancel) onCancel();
      document.removeEventListener("keydown", handleKeyPress);
    }
  };
  document.addEventListener("keydown", handleKeyPress);
}

// Custom error dialog for webview
function showErrorDialog(title, message, onClose = null) {
  // Create dialog overlay
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";

  // Create dialog
  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog error-dialog";

  // Title
  const titleEl = document.createElement("h3");
  titleEl.textContent = title;
  titleEl.style.color = "var(--vscode-errorForeground)";
  titleEl.style.marginTop = "0";
  dialog.appendChild(titleEl);

  // Message
  const messageEl = document.createElement("pre");
  messageEl.textContent = message;
  messageEl.style.whiteSpace = "pre-wrap";
  messageEl.style.fontFamily = "var(--vscode-font-family)";
  messageEl.style.fontSize = "var(--vscode-font-size)";
  messageEl.style.margin = "10px 0";
  messageEl.style.padding = "10px";
  messageEl.style.backgroundColor = "var(--vscode-textBlockQuote-background)";
  messageEl.style.border = "1px solid var(--vscode-textBlockQuote-border)";
  messageEl.style.borderRadius = "4px";
  dialog.appendChild(messageEl);

  // Buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "confirm-buttons";

  // OK button
  const okBtn = document.createElement("button");
  okBtn.textContent = "OK";
  okBtn.className = "btn-primary";
  okBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onClose) onClose();
  };

  buttonsContainer.appendChild(okBtn);
  dialog.appendChild(buttonsContainer);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus the OK button
  okBtn.focus();

  // Handle ESC key
  const handleKeyPress = (e) => {
    if (e.key === "Escape") {
      document.body.removeChild(overlay);
      if (onClose) onClose();
      document.removeEventListener("keydown", handleKeyPress);
    }
  };
  document.addEventListener("keydown", handleKeyPress);
}

// Custom authentication error dialog with configure authentication option
function showAuthErrorDialog(
  title,
  message,
  feedName,
  feedUrl,
  canConfigureAuth = false,
  onClose = null
) {
  // Create dialog overlay
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";

  // Create dialog
  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog error-dialog";

  // Title
  const titleEl = document.createElement("h3");
  titleEl.textContent = title;
  titleEl.style.color = "var(--vscode-errorForeground)";
  titleEl.style.marginTop = "0";
  dialog.appendChild(titleEl);

  // Message
  const messageEl = document.createElement("pre");
  messageEl.textContent = `${message}\n\nFeed: ${feedName}\nURL: ${feedUrl}`;
  messageEl.style.whiteSpace = "pre-wrap";
  messageEl.style.fontFamily = "var(--vscode-font-family)";
  messageEl.style.fontSize = "var(--vscode-font-size)";
  messageEl.style.margin = "10px 0";
  messageEl.style.padding = "10px";
  messageEl.style.backgroundColor = "var(--vscode-textBlockQuote-background)";
  messageEl.style.border = "1px solid var(--vscode-textBlockQuote-border)";
  messageEl.style.borderRadius = "4px";
  dialog.appendChild(messageEl);

  // Additional info for private feeds
  if (canConfigureAuth) {
    const infoEl = document.createElement("p");
    infoEl.textContent =
      "Configure authentication credentials to access this private feed.";
    infoEl.style.margin = "10px 0";
    infoEl.style.fontStyle = "italic";
    dialog.appendChild(infoEl);
  }
  // Buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "confirm-buttons";

  let authBtn = null; // Declare authBtn outside the if block

  // Configure authentication button (if available)
  if (canConfigureAuth) {
    authBtn = document.createElement("button");
    authBtn.textContent = "Configure Authentication";
    authBtn.className = "btn-primary";
    authBtn.onclick = () => {
      document.body.removeChild(overlay);
      // Send message to extension to configure authentication
      // Note: vscode is a global variable in the webview context
      if (typeof vscode !== "undefined") {
        vscode.postMessage({
          command: "configureAuthentication",
          feedUrl: feedUrl,
          feedName: feedName,
        });
      }
      if (onClose) onClose();
    };
    buttonsContainer.appendChild(authBtn);
  }

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.textContent = canConfigureAuth ? "Close" : "OK";
  closeBtn.className = canConfigureAuth ? "btn-secondary" : "btn-primary";
  closeBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onClose) onClose();
  };

  buttonsContainer.appendChild(closeBtn);
  dialog.appendChild(buttonsContainer);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus the appropriate button
  const primaryBtn = canConfigureAuth ? authBtn : closeBtn;
  primaryBtn.focus();

  // Handle ESC key
  const handleKeyPress = (e) => {
    if (e.key === "Escape") {
      document.body.removeChild(overlay);
      if (onClose) onClose();
      document.removeEventListener("keydown", handleKeyPress);
    }
  };
  document.addEventListener("keydown", handleKeyPress);
}

// Custom info dialog for webview
function showInfoDialog(title, message, onClose = null) {
  // Create dialog overlay
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";

  // Create dialog
  const dialog = document.createElement("div");
  dialog.className = "confirm-dialog info-dialog";

  // Title
  const titleEl = document.createElement("h3");
  titleEl.textContent = title;
  titleEl.style.color = "var(--vscode-foreground)";
  titleEl.style.marginTop = "0";
  dialog.appendChild(titleEl);

  // Message
  const messageEl = document.createElement("div");
  messageEl.innerHTML = message;
  messageEl.style.fontFamily = "var(--vscode-font-family)";
  messageEl.style.fontSize = "var(--vscode-font-size)";
  messageEl.style.margin = "10px 0";
  messageEl.style.lineHeight = "1.4";
  dialog.appendChild(messageEl);

  // Buttons container
  const buttonsContainer = document.createElement("div");
  buttonsContainer.className = "confirm-buttons";

  // Cancel button
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.className = "btn-secondary";
  cancelBtn.onclick = () => {
    // Clean up project select dropdown if it exists
    if (window.projectSelectDialogDropdown) {
      window.projectSelectDialogDropdown.destroy();
      window.projectSelectDialogDropdown = null;
    }
    document.body.removeChild(overlay);
    document.removeEventListener("keydown", handleKeyPress);
  };

  // OK button
  const okBtn = document.createElement("button");
  okBtn.textContent = "OK";
  okBtn.className = "btn-primary";
  okBtn.onclick = () => {
    // If there's a callback and it returns true, it means it handled the dialog
    // Otherwise call the onClose callback for simple info dialogs
    let handled = false;
    if (onClose) {
      handled = onClose();
    }

    // Always remove the dialog unless the callback explicitly returned false
    if (handled !== false) {
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", handleKeyPress);
    }
  };

  buttonsContainer.appendChild(cancelBtn);
  buttonsContainer.appendChild(okBtn);
  dialog.appendChild(buttonsContainer);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus the OK button
  okBtn.focus();

  // Handle ESC key
  const handleKeyPress = (e) => {
    if (e.key === "Escape") {
      // Clean up project select dropdown if it exists
      if (window.projectSelectDialogDropdown) {
        window.projectSelectDialogDropdown.destroy();
        window.projectSelectDialogDropdown = null;
      }
      document.body.removeChild(overlay);
      if (onClose) onClose();
      document.removeEventListener("keydown", handleKeyPress);
    }
  };
  document.addEventListener("keydown", handleKeyPress);

  // Handle clicking outside the dialog (on the overlay)
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      // Clean up project select dropdown if it exists
      if (window.projectSelectDialogDropdown) {
        window.projectSelectDialogDropdown.destroy();
        window.projectSelectDialogDropdown = null;
      }
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", handleKeyPress);
    }
  };
}

// Loading overlay functions
function showLoadingOverlay(operation, packageName) {
  // Remove any existing overlay first to prevent stacking
  hideLoadingOverlay();

  const overlay = document.createElement("div");
  overlay.className = "loading-overlay";
  overlay.id = "loadingOverlay";

  const content = document.createElement("div");
  content.className = "loading-content";

  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";

  const message = document.createElement("p");
  message.className = "loading-message";

  let operationText = "Processing";
  if (operation === "install") operationText = "Installing";
  else if (operation === "uninstall") operationText = "Uninstalling";
  else if (operation === "update") operationText = "Updating";

  message.textContent = `${operationText} ${packageName}...`;

  content.appendChild(spinner);
  content.appendChild(message);
  overlay.appendChild(content);

  document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    document.body.removeChild(overlay);
  }
}

// Export functions to global scope for use in webview context
// In a webview, we need to make these functions globally available
if (typeof window !== "undefined") {
  window.showConfirmDialog = showConfirmDialog;
  window.showErrorDialog = showErrorDialog;
  window.showAuthErrorDialog = showAuthErrorDialog;
  window.showInfoDialog = showInfoDialog;
  window.showLoadingOverlay = showLoadingOverlay;
  window.hideLoadingOverlay = hideLoadingOverlay;
}
