// src/content/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "../App";

// Create a function to initialize the extension UI
window.createExtensionUI = function () {
  // Check if extension is already injected
  if (document.getElementById("my-extension-root")) {
    return;
  }

  // Create container
  const container = document.createElement("div");
  container.id = "my-extension-root";

  document.body.appendChild(container);

  // Create React root and render
  const root = ReactDOM.createRoot(container);
  root.render(<App />);
};

window.createExtensionUI();