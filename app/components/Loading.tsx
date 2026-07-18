export default function Loading({ text = "Loading..." }: { text?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <div className="spinner" />
      <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.88rem" }}>{text}</p>
    </div>
  );
}
