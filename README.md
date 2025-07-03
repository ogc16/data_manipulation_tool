# Data Manipulation Tools 🛠️

A comprehensive Streamlit application for file conversion and data analysis.

## Features

- **File Converter**
  - Convert Excel files (`.xlsx`, `.xls`) to CSV format
  - Convert PDF tables to CSV format
  - Download converted files instantly

- **Data Analysis**
  - Upload and analyze CSV/Excel files
  - Interactive data visualization (scatter plots, histograms)
  - Correlation heatmap analysis
  - Statistical summaries and data preview

## Getting Started

### Prerequisites

- Python 3.8+
- [Streamlit](https://streamlit.io/)
- pandas
- tabula-py
- plotly

Install dependencies:
```sh
pip install streamlit pandas tabula-py plotly
```

### Running the App

From your project directory, run:
```sh
streamlit run Home.py
```
or
```sh
streamlit run home.py
```

Use the sidebar to navigate between the File Converter and Data Analysis tools.

## Project Structure

```
Home.py
pages/
    File_Converter.py
    Analysis_Tool.py
```

- `Home.py` / `home.py`: Main landing page
- `pages/File_Converter.py`: File conversion tool
- `pages/Analysis_Tool.py`: Data analysis tool

## Contact

For questions or feedback, email [support@data-tools.com](mailto:support@data-tools.com).

Maintained by [TechGaetano](https://www.techgaetano.com).

---

Enjoy exploring! 🚀
