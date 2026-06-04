import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <i className="fa-solid fa-triangle-exclamation text-primary text-xl" />
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">404</h1>
        <p className="text-muted-foreground">This page doesn't exist.</p>
        <Link href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white no-underline mt-2"
          style={{ background: "hsl(217 91% 48%)" }}>
          <i className="fa-solid fa-house" />Go Home
        </Link>
      </div>
    </div>
  );
}
