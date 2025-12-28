import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer">
      <div className="flex items-center gap-4 text-sm text-textSecondary">
        <Link
          href="/privacy"
          className="hover:text-accent transition-colors"
        >
          Privacy
        </Link>
        <span className="text-border">•</span>
        <Link
          href="/terms"
          className="hover:text-accent transition-colors"
        >
          Terms
        </Link>
      </div>

      <div className="text-sm text-textSecondary">
        © {new Date().getFullYear()} Filter
      </div>
    </footer>
  );
}
