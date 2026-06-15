export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="card" style={{ borderLeft: "4px solid #e63946" }}>
      <p style={{ color: "#e63946" }}>{message}</p>
    </div>
  );
}
