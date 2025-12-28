import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-contrastBlock mb-4">404</h1>
        <p className="text-xl text-textSecondary mb-8">Page not found</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-accent text-white rounded-lg hover:bg-secondary transition-colors"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
