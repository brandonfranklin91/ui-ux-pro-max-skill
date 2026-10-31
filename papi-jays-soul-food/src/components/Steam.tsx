/** Soft rising steam wisps. Pure CSS; hidden under prefers-reduced-motion. */
export function Steam({ className = '' }: { className?: string }) {
  const wisps = [
    { left: '38%', dur: '4.2s', delay: '0s', drift: '10px', w: 70, h: 120 },
    { left: '50%', dur: '5.1s', delay: '1.4s', drift: '-14px', w: 90, h: 150 },
    { left: '60%', dur: '4.6s', delay: '2.6s', drift: '6px', w: 60, h: 110 },
    { left: '45%', dur: '5.6s', delay: '3.4s', drift: '-6px', w: 80, h: 130 },
  ]
  return (
    <div aria-hidden className={`pointer-events-none absolute ${className}`}>
      {wisps.map((w, i) => (
        <span
          key={i}
          className="steam-wisp absolute bottom-0 block rounded-[50%] bg-cream/70 blur-2xl"
          style={
            {
              left: w.left,
              width: w.w,
              height: w.h,
              '--dur': w.dur,
              '--delay': w.delay,
              '--drift': w.drift,
              opacity: 0,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
