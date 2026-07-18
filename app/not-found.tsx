import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Page not found</h1>
        <p className="page-subtitle">The page you are looking for does not exist.</p>
      </div>
      <Link href="/" className="btn btn-primary" style={{ display: "inline-flex" }}>
        Go home
      </Link>
    </div>
  );
}
