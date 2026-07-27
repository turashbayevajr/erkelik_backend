const PIECES = [
  { top: 80, left: '10%', size: 9, round: false, color: 'bg-accent', dur: 1.8, delay: 0 },
  { top: 70, left: '30%', size: 8, round: false, color: 'bg-confetti2', dur: 2.1, delay: 0.3 },
  { top: 90, left: '51%', size: 10, round: false, color: 'bg-confetti3', dur: 1.9, delay: 0.15 },
  { top: 66, left: '72%', size: 8, round: false, color: 'bg-accent', dur: 2.2, delay: 0.5 },
  { top: 96, left: '85%', size: 9, round: false, color: 'bg-confetti2', dur: 1.7, delay: 0.2 },
  { top: 76, left: '20%', size: 7, round: true, color: 'bg-confetti3', dur: 2.0, delay: 0.65 },
  { top: 88, left: '64%', size: 7, round: true, color: 'bg-accent', dur: 1.85, delay: 0.4 },
  { top: 72, left: '41%', size: 8, round: false, color: 'bg-confetti2', dur: 2.05, delay: 0.85 },
];

export function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
      {PIECES.map((p, i) => (
        <div
          key={i}
          className={`absolute ${p.color} ${p.round ? 'rounded-full' : 'rounded-[2px]'}`}
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            animation: `conf-fall ${p.dur}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
