# Data Manipulation Tool

A comprehensive web application for file conversion and data analysis, built with Next.js.

**Live:** https://ogc16.github.io/data_manipulation_tool/

## Features

### File Converter
Choose any source and target format with the two-dropdown selector:

| From → To | CSV | Excel | JSON | Word | PowerPoint |
|-----------|:---:|:-----:|:----:|:----:|:----------:|
| **CSV** | — | ✅ | ✅ | ✅ | ✅ |
| **Excel** | ✅ | — | ✅ | ✅ | ✅ |
| **JSON** | ✅ | ✅ | — | ✅ | ✅ |
| **PDF** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Word** | ✅ | ✅ | ✅ | — | ✅ |
| **PowerPoint** | ✅ | ✅ | ✅ | ✅ | — |

### ZIP & Extract
- **Create ZIP** — drag-and-drop multiple files into a single archive
- **Extract ZIP** — upload a ZIP file and preview/download individual files

### File Encryption
- **Encrypt** any file with a password (AES-256-GCM via Web Crypto API)
- **Decrypt** `.enc` files using the correct password

### Scan & Export
- Open your device camera to capture document photos
- Upload existing images from your device
- Export captured images as **PDF**, **Word**, **Excel**, or **CSV**

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
- **Data:** SheetJS (xlsx), PapaParse
- **PDF:** pdf-parse (server-side text extraction), jsPDF (client-side generation)
- **Word:** docx (server-side generation), mammoth (client-side parsing)
- **PowerPoint:** pptxgenjs (client-side generation)
- **ZIP:** JSZip (client-side)
- **Encryption:** Web Crypto API (client-side, no dependencies)
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
