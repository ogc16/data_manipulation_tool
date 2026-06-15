# Data Manipulation Tool

A comprehensive web application for file conversion and data analysis, built with Next.js.

**Live:** https://ogc16.github.io/data_manipulation_tool/

## Features

### File Converter
Choose any source and target format with the two-dropdown selector:

| From → To | CSV | Excel | JSON | Word |
|-----------|:---:|:-----:|:----:|:----:|
| **CSV** | — | ✅ | ✅ | ✅ |
| **Excel** | ✅ | — | ✅ | ✅ |
| **JSON** | ✅ | ✅ | — | ✅ |
| **PDF** | ✅ | ✅ | ✅ | ✅ |
| **Word** | ✅ | ✅ | ✅ | — |

### Data Analysis
- Upload and browse CSV/Excel files with sortable, paginated tables
- Statistical summary (count, mean, std, min, max, quartiles, missing values)
- **Dashboard** — add, configure, and arrange chart widgets:
  - Scatter, Line, Bar, Histogram, Box Plot, Pie, Area, Bubble
  - Correlation Heatmap
  - Customizable axes, colors, titles
- Cross-file comparison when multiple datasets are loaded
- Merge/join datasets on a common column (inner, left, right, outer)

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19
- **Charts:** Plotly.js (react-plotly.js)
- **Data:** SheetJS (xlsx)
- **PDF:** pdf-parse (server-side text extraction)
- **Word:** docx (server-side generation)
- **Deploy:** GitHub Pages via GitHub Actions

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
```

Static output is written to `out/`.

## Deployment

Push to `master` — the GitHub Actions workflow at `.github/workflows/deploy.yml` builds and deploys to GitHub Pages automatically.
