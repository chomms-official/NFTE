export const SentScentLogo = ({ className = "" }: { className?: string }) => (
  <svg
    viewBox="0 0 200 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-auto h-12 ${className}`}
  >
    {/* Icon: Abstract leaf / scent wave */}
    <g transform="translate(10, 10)">
      <path
        d="M20,40 C5,40 0,30 0,20 C0,10 10,0 20,0 C30,0 40,10 40,20 C40,30 35,40 20,40 Z"
        fill="currentColor"
        fillOpacity="0.1"
      />
      <path
        d="M20,40 C10,40 5,30 5,20 C5,10 12,5 20,5 C28,5 35,10 35,20 C35,25 30,40 20,40 Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
      <path
        d="M20,40 C15,35 12,28 12,20 C12,12 16,10 20,10 C24,10 28,12 28,20 C28,28 25,35 20,40 Z"
        fill="currentColor"
      />
    </g>

    {/* Text: SENT SCENT */}
    <text
      x="65"
      y="38"
      fontFamily="Inter, system-ui, sans-serif"
      fontSize="24"
      fontWeight="700"
      letterSpacing="0.1em"
      fill="currentColor"
    >
      SENT SCENT
    </text>
  </svg>
);
