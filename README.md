<div align="center">

# Sales Data Analysis Assistant for SMEs

**Deterministic sales data analysis with AI-style explanations**

A university proof-of-concept web application that helps small and medium-sized enterprises (SMEs) understand their
sales data through structured, code-calculated insights — no black-box AI, no hallucinated numbers.

</div>

## Features

| Feature                        | Description                                                                   |
|--------------------------------|-------------------------------------------------------------------------------|
| **File Upload**                | Supports `.csv`, `.xlsx`, and `.xls` sales data files                         |
| **Smart Column Mapping**       | Automatic detection of business fields with confidence scoring                |
| **Data Quality Check**         | Validates rows, flags missing values, and reports date ranges                 |
| **Natural Language Questions** | Ask business questions like *"Which products generated the highest revenue?"* |
| **Deterministic Analysis**     | All metrics are code-calculated — no LLM-generated numbers                    |
| **AI-Style Explanations**      | Human-readable explanation layer that only describes computed facts           |
| **Interactive Charts**         | Revenue trends, product comparisons, and category breakdowns via Chart.js     |
| **Region & Time Filters**      | Filter by region, switch between monthly/weekly/daily granularity             |
| **Excel Export**               | Export structured analysis reports to `.xlsx`                                 |
| **Dark Mode**                  | Toggle between light and dark themes                                          |
| **Question History**           | Track and revisit previously asked questions                                  |


**Key design principle:** The explanation layer can only describe facts that were computed by the analysis engine. It
never generates or invents numbers — ensuring trustworthy business insights.

## Quick Start

### Option 1: IDE (Recommended)

**IntelliJ IDEA:**

1. Open the project folder
2. Right-click `index.html` → *Open in* → *Browser*

**VS Code:**

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
2. Right-click `index.html` → *Open with Live Server*

### Option 2: Terminal

```bash
# Using Node.js
npx serve .

# Or using Python
python3 -m http.server
```

Then open [http://localhost:3000](http://localhost:3000) (or the port shown in your terminal).

## Testing

The project uses the built-in [Node.js Test Runner](https://nodejs.org/api/test.html) — no extra test framework needed.

```bash
# Install dependencies (first time only)
npm install

# Run all tests
npm test
```

**IntelliJ tip:** Open any `.test.js` file and click the green ▶ play button next to individual tests to run them
directly in the IDE.

## Tech Stack

| Layer            | Technology                                                                                        |
|------------------|---------------------------------------------------------------------------------------------------|
| **Frontend**     | Vanilla HTML5, CSS3, JavaScript (ES Modules)                                                      |
| **Charts**       | [Chart.js 4.4](https://www.chartjs.org/)                                                          |
| **File Parsing** | [Papa Parse 5.4](https://www.papaparse.com/) (CSV) · [SheetJS 0.18](https://sheetjs.com/) (Excel) |
| **Testing**      | Node.js Test Runner · [jsdom 24](https://github.com/jsdom/jsdom)                                  |
| **Build Tools**  | None — zero build step, runs directly in the browser                                              |

## Supported Question Types

The analysis engine recognizes several business question categories:

- **Top Products** — *"Which products generated the highest revenue?"*
- **Category Performance** — *"Which category performs best?"*
- **Trends** — *"When was revenue at its peak?"*
- **Anomalies** — *"Are there any unusual drops in sales?"*
- **Products to Review** — *"Which products should the business review?"*
- **General Trends** — *"What are the most important trends in the data?"*
