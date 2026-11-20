// Pieces of the sign-in hero: wordmark and the reveal headline (CSS motion, nx-* in globals.css).

type Style = React.CSSProperties & Record<`--${string}`, string | number>;

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-baseline gap-2 nx-fade ${className ?? ""}`} style={{ "--d": "0s" } as Style}>
      <span className="font-heading text-3xl font-bold tracking-tight">nexo</span>
      <span className="text-xs font-medium text-white/60 tracking-wide">by AG Systems</span>
    </div>
  );
}

// The brief's copy, split into words so they reveal one after another
const LEAD = ["Restaurantes,", "tiendas,", "almacenes,"];
const BODY = ["administra", "cualquier", "negocio,", "todo", "en", "un", "solo", "lugar,"];

function Words({ words, from }: { words: string[]; from: number }) {
  return (
    <>
      {words.map((w, i) => (
        <span key={i} className="nx-word" style={{ "--w": from + i } as Style}>
          {w}&nbsp;
        </span>
      ))}
    </>
  );
}

export function Headline({ className }: { className?: string }) {
  const finalAt = LEAD.length + BODY.length;
  return (
    <div className={className}>
      <h1 className="font-heading font-bold leading-[1.05] tracking-tight text-[1.9rem] sm:text-4xl lg:text-[2.75rem]">
        <Words words={LEAD} from={0} />
      </h1>
      <p className="mt-2 lg:mt-3 text-white/80 text-base sm:text-lg lg:text-xl leading-snug">
        <Words words={BODY} from={LEAD.length} />
      </p>
      <p className="mt-1 lg:mt-2 font-heading font-bold tracking-tight text-[1.9rem] sm:text-4xl lg:text-[2.75rem] leading-tight">
        <span className="nx-word" style={{ "--w": finalAt } as Style}>¡todo&nbsp;</span>
        <span className="nx-word" style={{ "--w": finalAt + 1 } as Style}>en&nbsp;</span>
        <span className="nx-word relative" style={{ "--w": finalAt + 2 } as Style}>
          nexo!
          {/* the spark lands here */}
          <svg aria-hidden viewBox="0 0 120 12" preserveAspectRatio="none"
            className="absolute left-0 -bottom-1.5 w-[86%] h-2.5 overflow-visible">
            <path d="M2 8 C 30 2, 70 2, 118 6" pathLength={1} fill="none" stroke="#FF5C1A" strokeWidth={4}
              strokeLinecap="round" className="nx-line" style={{ "--d": `${0.9 + (finalAt + 3) * 0.07}s` } as Style} />
          </svg>
        </span>
      </p>
    </div>
  );
}
