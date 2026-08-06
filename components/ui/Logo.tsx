type LogoProps = {
  className?: string;
};

// The brand mark: a single ribbon folding into a "W" (Weaver), terracotta
// shifting to sage, with a gold dot at the peak — echoes the dot in the
// "Trip•Weaver" wordmark. Same shape as app/icon.png (the favicon), kept
// as inline SVG here so it stays crisp at any size without an extra
// request.
export function Logo({ className = "h-5 w-5" }: LogoProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <path
        d="M 16 28 L 33 74 L 50 42"
        stroke="#cf6045"
        strokeWidth="13.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 50 42 L 67 74 L 84 28"
        stroke="#4f7a5c"
        strokeWidth="13.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="42" r="7" fill="#e2b86a" />
    </svg>
  );
}
