import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
        🛠️ Data Manipulation Tools
      </h1>
      <hr style={{ border: "none", borderTop: "2px solid #e5e7eb", marginBottom: "1.5rem" }} />

      <div className="card">
        <h2>Welcome</h2>
        <p>
          This is a comprehensive data processing and analysis application with the following
          features:
        </p>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>📁 File Converter</h3>
          <ul style={{ paddingLeft: "1.2rem", color: "#667085" }}>
            <li>Convert Excel files (.xlsx, .xls) to CSV format</li>
            <li>Convert PDF tables to CSV format</li>
            <li>Download converted files instantly</li>
          </ul>
          <Link href="/convert" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Go to File Converter →
          </Link>
        </div>

        <div className="feature-card">
          <h3>📊 Data Analysis</h3>
          <ul style={{ paddingLeft: "1.2rem", color: "#667085" }}>
            <li>Upload and analyze CSV/Excel files</li>
            <li>Interactive scatter plots and histograms</li>
            <li>Correlation heatmap analysis</li>
            <li>Statistical summaries and data preview</li>
          </ul>
          <Link href="/analyze" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Go to Data Analysis →
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>How to Use</h3>
        <ol style={{ paddingLeft: "1.2rem", color: "#667085" }}>
          <li>
            <strong>File Converter:</strong> Use this tool to convert your files to CSV format for
            easier data processing
          </li>
          <li>
            <strong>Data Analysis:</strong> Upload your data files to perform comprehensive analysis
            and visualization
          </li>
        </ol>
        <p style={{ marginTop: "0.8rem", color: "#667085" }}>
          <strong>Getting Started:</strong> Navigate to the pages using the sidebar to access
          different features.
        </p>
      </div>

      <div className="card">
        <h3>Contact</h3>
        <p>
          If you have any questions or feedback, please reach out to us at{" "}
          <a href="mailto:info@techgaetano.com">info@techgaetano.com</a>.
        </p>

        <h3 style={{ marginTop: "1rem" }}>Contributing</h3>
        <p>
          If you would like to contribute to this project, please visit our{" "}
          <a href="https://github.com/ogc16/data_manipulation_tool" target="_blank" rel="noopener noreferrer">
            GitHub repository
          </a>
          .
        </p>

        <p style={{ marginTop: "0.8rem", color: "#667085" }}>
          Explore! 🚀
        </p>
      </div>
    </div>
  );
}
