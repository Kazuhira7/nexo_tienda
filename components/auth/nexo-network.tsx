// "La red de nexo": every kind of business connects to one place.
// Pure SVG + CSS (keyframes nx-* in app/globals.css) — no client JS, respects reduced motion.
import {
  UtensilsCrossedIcon, ShoppingBagIcon, WarehouseIcon, CoffeeIcon, WrenchIcon, StoreIcon,
} from "lucide-react";

const CENTER = { x: 320, y: 196 };

const NODES = [
  { label: "Restaurante", icon: UtensilsCrossedIcon, x: 128, y: 86  },
  { label: "Tienda",      icon: ShoppingBagIcon,     x: 508, y: 70  },
  { label: "Almacén",     icon: WarehouseIcon,       x: 566, y: 236 },
  { label: "Cafetería",   icon: CoffeeIcon,          x: 78,  y: 244 },
  { label: "Ferretería",  icon: WrenchIcon,          x: 196, y: 372 },
  { label: "Colectivo",   icon: StoreIcon,           x: 456, y: 368 },
];

const R = 30; // node radius

type Style = React.CSSProperties & Record<`--${string}`, string | number>;

export default function NexoNetwork({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 430" className={className} role="img"
      aria-label="Restaurantes, tiendas, almacenes y más negocios conectados a nexo">
      {/* Connections + sparks traveling toward nexo */}
      {NODES.map((n, i) => {
        const d = 0.25 + i * 0.12;
        return (
          <g key={`l-${n.label}`}>
            <line x1={n.x} y1={n.y} x2={CENTER.x} y2={CENTER.y} pathLength={1}
              className="nx-line" stroke="rgba(255,255,255,0.28)" strokeWidth={1.5}
              style={{ "--d": `${d}s` } as Style} />
            <line x1={n.x} y1={n.y} x2={CENTER.x} y2={CENTER.y} pathLength={1}
              className="nx-spark" stroke="#FF5C1A" strokeWidth={3} strokeLinecap="round"
              style={{ "--d": `${d}s`, "--t": `${2.2 + (i % 3) * 0.5}s` } as Style} />
          </g>
        );
      })}

      {/* Business nodes */}
      {NODES.map((n, i) => {
        const Icon = n.icon;
        const d = 0.15 + i * 0.12;
        // fly in from further out, along the line to the center
        const fx = Math.round((n.x - CENTER.x) * 0.35);
        const fy = Math.round((n.y - CENTER.y) * 0.35);
        return (
          <g key={n.label} className="nx-node" style={{ "--d": `${d}s`, "--fx": `${fx}px`, "--fy": `${fy}px` } as Style}>
            <g className="nx-float" style={{ "--d": `${d}s`, "--t": `${5 + (i % 3)}s` } as Style}>
              <circle cx={n.x} cy={n.y} r={R} fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} />
              <Icon x={n.x - 13} y={n.y - 13} width={26} height={26} color="#fff" strokeWidth={1.75} aria-hidden />
              <text x={n.x} y={n.y + R + 22} textAnchor="middle" fill="rgba(255,255,255,0.8)"
                fontWeight={500} className="nx-label" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
                {n.label}
              </text>
            </g>
          </g>
        );
      })}

      {/* nexo — the center everything connects to */}
      <circle cx={CENTER.x} cy={CENTER.y} r={46} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} className="nx-ring" />
      <g className="nx-center">
        <circle cx={CENTER.x} cy={CENTER.y} r={46} fill="#fff" />
        <svg x={CENTER.x - 30} y={CENTER.y - 30} width={60} height={60} viewBox="0 0 512 512" aria-hidden>
          <path d="M168 376V196M168 268c0-56 38-92 92-92s88 36 88 96v104" stroke="#1B4FFF" strokeWidth={64}
            strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </g>
    </svg>
  );
}
