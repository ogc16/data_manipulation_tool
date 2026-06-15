export default function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <div className="spinner" />
      <p style={{ color: "#667085", marginTop: "0.5rem" }}>{text}</p>
    </div>
  );
}
