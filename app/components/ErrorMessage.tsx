export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="card" style={{ background: "var(--danger-soft)", borderColor: "var(--danger)" }}>
      <p style={{ color: "var(--danger)", fontSize: "0.88rem" }}>{message}</p>
    </div>
  );
}
