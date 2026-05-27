/**
 * Brand mark — the StickerLog logo. Inline SVG so it inherits currentColor
 * for the stroke (subtle adaptation to dark mode) and scales without raster
 * blur in any size we want.
 */
interface BrandProps {
  size?: number
  className?: string
}

export function BrandMark({ size = 32, className }: BrandProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Background sticker (offset) */}
      <rect
        x="18"
        y="18"
        width="56"
        height="62"
        rx="6"
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      {/* Foreground sticker with folded corner */}
      <path
        d="M 32 28 L 66 28 L 80 42 L 80 82 Q 80 86 76 86 L 32 86 Q 28 86 28 82 L 28 32 Q 28 28 32 28 Z"
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      {/* Folded corner accent */}
      <path
        d="M 66 28 L 80 42 L 70 42 Q 66 42 66 38 Z"
        fill="#22c55e"
        stroke="currentColor"
        strokeWidth={4.5}
        strokeLinejoin="round"
      />
      {/* Checkmark */}
      <path
        d="M 40 58 L 50 68 L 68 48"
        stroke="#22c55e"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
