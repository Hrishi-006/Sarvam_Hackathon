'use client';

import { motion } from 'framer-motion';

export interface PricePoint {
  turn: number;
  vendor: number | null;
  customer: number | null;
  threat?: boolean;
}

export function PriceChart({
  points,
  target,
  limit,
  open,
}: {
  points: PricePoint[];
  target: number;
  limit: number;
  open: number;
}) {
  const width = 600;
  const height = 220;
  const padding = { top: 16, right: 16, bottom: 24, left: 48 };
  const maxX = Math.max(points.length - 1, 1);
  const maxY = open;
  const minY = 0;

  const x = (i: number) => padding.left + (i / maxX) * (width - padding.left - padding.right);
  const y = (v: number) =>
    padding.top + (1 - (v - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);

  const vendorPts = points
    .map((p, i) => (p.vendor != null ? `${x(i)},${y(p.vendor)}` : null))
    .filter(Boolean)
    .join(' ');
  const customerPts = points
    .map((p, i) => (p.customer != null ? `${x(i)},${y(p.customer)}` : null))
    .filter(Boolean)
    .join(' ');

  const threatIndex = points.findIndex((p) => p.threat);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Price chart showing vendor asking price and customer offer converging over rounds"
    >
      {[target, limit].map((v, idx) => (
        <g key={idx}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeDasharray="4 4"
            strokeWidth={1}
          />
          <text x={width - padding.right} y={y(v) - 4} textAnchor="end" fontSize="10" fill="var(--ink-soft)">
            {idx === 0 ? `target ₹${v}` : `limit ₹${v}`}
          </text>
        </g>
      ))}

      {threatIndex >= 0 && (
        <line
          x1={x(threatIndex)}
          x2={x(threatIndex)}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="var(--chilli)"
          strokeWidth={1.5}
          strokeDasharray="2 3"
        />
      )}

      <motion.polyline
        points={vendorPts}
        fill="none"
        stroke="var(--chilli)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4 }}
      />
      <motion.polyline
        points={customerPts}
        fill="none"
        stroke="var(--teal)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4 }}
      />

      {points.map((p, i) =>
        p.vendor != null ? <circle key={`v${i}`} cx={x(i)} cy={y(p.vendor)} r={3.5} fill="var(--chilli)" /> : null,
      )}
      {points.map((p, i) =>
        p.customer != null ? <circle key={`c${i}`} cx={x(i)} cy={y(p.customer)} r={3.5} fill="var(--teal)" /> : null,
      )}
    </svg>
  );
}
