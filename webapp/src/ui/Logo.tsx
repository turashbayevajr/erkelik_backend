export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="50" className="fill-accent" />
      <g
        fill="none"
        className="stroke-onaccent"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M50,50 C31,31 15,41 23,50 C15,59 31,69 50,50" />
        <path d="M50,50 C69,31 85,41 77,50 C85,59 69,69 50,50" />
        <path d="M46,53 L38,75" />
        <path d="M54,53 L62,75" />
        <path d="M50,44 L50,56" />
      </g>
    </svg>
  );
}
