// =============================================================
// Main — Application entry point
// =============================================================
//
// This is the main entry point of the Sales Data Analysis
// Assistant. It initializes all modules and starts the app.
//
// Start by opening index.html in IntelliJ (built-in server)
// or VS Code (Live Server extension).
// =============================================================

import { AppState } from './models/AppState.js';
import { Renderer } from './ui/Renderer.js';
import { ChartRenderer } from './ui/ChartRenderer.js';
import { EventHandler } from './ui/EventHandler.js';

/**
 * Gathers all required DOM element references.
 * @returns {Object} Map of element references
 */
function collectDomElements() {
  return {
    fileInput:         document.getElementById("fileInput"),
    uploadBox:         document.getElementById("uploadBox"),
    uploadStatus:      document.getElementById("uploadStatus"),
    analysisStatus:    document.getElementById("analysisStatus"),
    loading:           document.getElementById("loading"),
    previewEmpty:      document.getElementById("previewEmpty"),
    previewOutput:     document.getElementById("previewOutput"),
    previewSubtitle:   document.getElementById("previewSubtitle"),
    mappingEmpty:      document.getElementById("mappingEmpty"),
    mappingOutput:     document.getElementById("mappingOutput"),
    qualityEmpty:      document.getElementById("qualityEmpty"),
    qualityOutput:     document.getElementById("qualityOutput"),
    questionInput:     document.getElementById("questionInput"),
    analyzeBtn:        document.getElementById("analyzeBtn"),
    regionFilter:      document.getElementById("regionFilter"),
    granularityFilter: document.getElementById("granularityFilter"),
    resultsEmpty:      document.getElementById("resultsEmpty"),
    resultsOutput:     document.getElementById("resultsOutput"),
    themeBtn:          document.getElementById("themeBtn"),
    exportReportBtn:   document.getElementById("exportReportBtn"),
    historyBtn:        document.getElementById("historyBtn"),
    historyDropdown:   document.getElementById("historyDropdown"),
    historyList:       document.getElementById("historyList"),
    newFileBtn:        document.getElementById("newFileBtn"),
    allSuggestionBtns: document.querySelectorAll(".suggestion")
  };
}

/**
 * Initializes the application by creating all module instances
 * and wiring them together.
 */
function init() {
  // 1. Collect DOM references
  const elements = collectDomElements();

  // 2. Create application state
  const state = new AppState();

  // 3. Create UI modules
  const renderer = new Renderer(elements);
  const chartRenderer = new ChartRenderer();

  // 4. Create event handler (orchestrates all modules)
  const eventHandler = new EventHandler(state, renderer, chartRenderer, elements);

  // 5. Bind all event listeners and start the app
  eventHandler.init();

  console.log("[SalesAnalysis] Application initialized successfully.");
}

// Start the application
init();
