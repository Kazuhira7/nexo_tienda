// Public sales page at "/" for visitors (signed-in users never see it: app/page.tsx sends them home).
// Price and WhatsApp come from lib/site.ts. Mobile-first: most visits arrive from a link shared on WhatsApp.
import Link from "next/link";
import {
  ArrowRightIcon, BanknoteIcon, CalculatorIcon, ChartColumnIcon, CheckIcon, ChefHatIcon, ChevronDownIcon,
  ClipboardListIcon, CoinsIcon, FileSpreadsheetIcon, HandCoinsIcon, KeyRoundIcon, LayoutGridIcon, MapPinIcon,
  MessageCircleIcon, MonitorSmartphoneIcon, PackageIcon, ReceiptTextIcon, ShieldCheckIcon, ShoppingCartIcon,
  SmartphoneIcon, SplitIcon, StoreIcon, UserRoundCheckIcon, UsersIcon, UtensilsCrossedIcon, WalletIcon,
} from "lucide-react";
import BrandBackdrop from "@/components/auth/brand-backdrop";
import NexoNetwork from "@/components/auth/nexo-network";
import { Wordmark } from "@/components/auth/hero-parts";
import { CollectivePreview, RestaurantPreview } from "@/components/landing/product-previews";
import PwaRedirect from "@/components/landing/pwa-redirect";
import { SALES, formatNio, whatsappUrl } from "@/lib/site";

type Style = React.CSSProperties & Record<`--${string}`, string | number>;
type Feature = { icon: typeof StoreIcon; title: string; text: string };

const PRICE = formatNio(SALES.monthlyPriceNio);
const DEMO_MESSAGE = "Hola, quiero conocer nexo para mi negocio.";
const START_MESSAGE = "Hola, quiero empezar mi mes gratis de nexo.";

const PAINS: Feature[] = [
  { icon: ClipboardListIcon, title: "Todo va al cuaderno",
    text: "Cada venta anotada a mano y, al final del día, a sumar todo otra vez." },
  { icon: BanknoteIcon, title: "La caja no cuadra",
    text: "Y no sabes si fue un vuelto, un fiado o una venta que no se anotó." },
  { icon: CalculatorIcon, title: "Las cuentas te quitan horas",
    text: "Liquidar a cada marca o saber qué se vendió más es trabajo de una noche entera." },
];

const COLLECTIVE: Feature[] = [
  { icon: ShoppingCartIcon, title: "Vende en segundos",
    text: "Busca el producto, cobra en efectivo, POS o transferencia y entrega el recibo." },
  { icon: PackageIcon, title: "Inventario por marca",
    text: "Cada producto con su marca, precio y existencias. Te avisa cuando algo se está agotando." },
  { icon: CalculatorIcon, title: "Liquidaciones sin sacar cuentas",
    text: "Cada quincena ves cuánto vendió cada marca y su cuota, listo para pagarle." },
  { icon: UsersIcon, title: "Un acceso para cada marca",
    text: "Cada marca entra con su usuario y ve sus ventas, su inventario y su estado de cuenta. Solo lo suyo." },
  { icon: WalletIcon, title: "Estado de cuenta por marca",
    text: "Cuotas, pagos y saldos de cada marca en un solo lugar, sin hojas sueltas." },
  { icon: FileSpreadsheetIcon, title: "Tu inventario desde Excel",
    text: "Si ya tienes tus productos en una hoja de cálculo, se cargan todos de una vez." },
];

const RESTAURANT: Feature[] = [
  { icon: LayoutGridIcon, title: "El salón de un vistazo",
    text: "Qué mesas están libres, ocupadas o pidiendo la cuenta, en todos tus dispositivos." },
  { icon: SmartphoneIcon, title: "Órdenes en pocos toques",
    text: "El mesero toma la orden en el celular, con una mano, junto a la mesa." },
  { icon: ChefHatIcon, title: "Comandas a cocina",
    text: "En pantalla o impresas: la cocina recibe cada orden al momento, sin papelitos." },
  { icon: SplitIcon, title: "Cuentas divididas",
    text: "Divide la cuenta entre varias personas y cobra en efectivo, POS o transferencia." },
  { icon: KeyRoundIcon, title: "Cada quien con su PIN",
    text: "Tu equipo entra con un PIN de 4 dígitos y solo hace lo que su puesto permite." },
  { icon: ChartColumnIcon, title: "Reportes que sí usas",
    text: "Ventas del día, platillos más vendidos, ventas por mesero y por forma de pago." },
];

const CORE: Feature[] = [
  { icon: HandCoinsIcon, title: "Apertura y cierre de caja",
    text: "Abre con tu fondo inicial y cuadra el efectivo al final del día." },
  { icon: CoinsIcon, title: "Córdobas o dólares",
    text: "Eliges en qué moneda ver tus montos, con tu propia tasa de cambio." },
  { icon: MonitorSmartphoneIcon, title: "Celular, tablet o computadora",
    text: "Sin instalar nada. También lo puedes poner en tu pantalla de inicio como una app." },
  { icon: ShieldCheckIcon, title: "Tu información, protegida",
    text: "Cada negocio ve solo lo suyo; cada marca y cada empleado, solo lo que le toca." },
  { icon: UserRoundCheckIcon, title: "Tus clientes",
    text: "Guarda a tus clientes frecuentes y sus datos de contacto." },
  { icon: ReceiptTextIcon, title: "Recibos",
    text: "Cada venta con su recibo, listo para imprimir." },
];

const STEPS = [
  { title: "Escríbenos",
    text: "Te mostramos nexo funcionando, en persona o por videollamada, con ejemplos de tu tipo de negocio." },
  { title: "Lo dejamos listo contigo",
    text: "Creamos tu negocio, cargamos tus productos o tu menú y te enseñamos a usarlo." },
  { title: "Empiezas a vender",
    text: "Desde el primer día tienes tus ventas, tu caja y tus reportes al día." },
];

const INCLUDED = [
  "Todas las funciones de tu tipo de negocio",
  "Usuarios sin límite: tú, tus marcas y tu equipo",
  "Configuración inicial y carga de tus productos o menú",
  "Soporte por WhatsApp",
  "Mejoras y actualizaciones incluidas",
  "Sin contrato: cancelas cuando quieras",
];

const FAQS = [
  { q: "¿Necesito comprar equipo o instalar algo?",
    a: "No. nexo funciona en el navegador del celular, la tablet o la computadora que ya tienes. Si quieres imprimir recibos o comandas, te ayudamos a configurar tu impresora." },
  { q: "¿Puedo probarlo antes de pagar?",
    a: "Sí. El primer mes es gratis y lo usas con tus datos reales. Si nexo no te sirve, no pagas nada." },
  { q: "¿Funciona sin internet?",
    a: "Necesita conexión a internet. Funciona bien con wifi o con los datos del celular." },
  { q: "¿Mi información está segura?",
    a: "Cada negocio tiene su información separada de los demás. Dentro de tu negocio, cada marca solo ve lo suyo y cada empleado solo lo que su puesto permite." },
  { q: "¿Puedo ver mis montos en dólares?",
    a: "Sí. Eliges si nexo te muestra los montos en córdobas o en dólares, con tu propia tasa de cambio." },
  { q: "Tengo otro tipo de negocio, ¿me sirve?",
    a: "Escríbenos. Si tienes una tienda, una cafetería u otro negocio, vemos juntos si nexo ya cubre lo que necesitas." },
];

const CONTAINER = "mx-auto w-full max-w-6xl px-5 sm:px-8";
const CTA_PRIMARY =
  "group h-14 px-8 rounded-2xl bg-[#FF5C1A] text-white text-base font-semibold inline-flex items-center justify-center gap-2 " +
  "shadow-[0_14px_32px_-12px_rgba(255,92,26,0.85)] hover:brightness-110 active:scale-[0.97] transition-all duration-150";
const CTA_GHOST =
  "h-14 px-8 rounded-2xl border border-white/30 bg-white/10 text-white text-base font-semibold inline-flex items-center " +
  "justify-center backdrop-blur-sm hover:bg-white/15 active:scale-[0.97] transition-all duration-150";

// WhatsApp when a sales number is configured; otherwise straight to self-service signup.
function PrimaryCta({ href, label, fallbackLabel = "Crear mi negocio" }: {
  href: string | null;
  label: string;
  fallbackLabel?: string;
}) {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={CTA_PRIMARY}>
        <MessageCircleIcon className="size-5" />
        {label}
      </a>
    );
  }
  return (
    <Link href="/registro" className={CTA_PRIMARY}>
      {fallbackLabel}
      <ArrowRightIcon className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}

function SectionHeading({ eyebrow, title, text, center }: {
  eyebrow?: { icon: typeof StoreIcon; label: string };
  title: string;
  text?: string;
  center?: boolean;
}) {
  const Icon = eyebrow?.icon;
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && Icon && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          <Icon className="size-4" />
          {eyebrow.label}
        </p>
      )}
      <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight text-balance">{title}</h2>
      {text && <p className="mt-3 text-lg text-muted-foreground text-pretty">{text}</p>}
    </div>
  );
}

function FeatureGrid({ items }: { items: Feature[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
      {items.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function LandingPage() {
  const demoHref = whatsappUrl(DEMO_MESSAGE);
  const startHref = whatsappUrl(START_MESSAGE);
  const hasWhatsapp = demoHref !== null;

  return (
    <main className="flex-1">
      <PwaRedirect />

      {/* ───────────── Hero ───────────── */}
      <section className="relative overflow-hidden bg-[#0B1E66] text-white">
        <BrandBackdrop />
        <div className={`relative z-10 ${CONTAINER}`}>
          <header className="flex items-center justify-between gap-4 pt-[max(env(safe-area-inset-top),1.25rem)] pb-2">
            <Wordmark />
            <nav className="flex items-center gap-6 text-sm font-medium">
              <a href="#colectivos" className="hidden md:inline text-white/75 hover:text-white transition-colors">Tiendas colectivas</a>
              <a href="#restaurantes" className="hidden md:inline text-white/75 hover:text-white transition-colors">Restaurantes</a>
              <a href="#precio" className="hidden md:inline text-white/75 hover:text-white transition-colors">Precio</a>
              <Link href="/login"
                className="h-10 px-4 rounded-xl border border-white/30 bg-white/10 font-semibold inline-flex items-center
                           hover:bg-white/15 active:scale-[0.97] transition-all duration-150">
                Iniciar sesión
              </Link>
            </nav>
          </header>

          <div className="grid items-center gap-4 pt-8 pb-12 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-14 lg:pb-24">
            <div>
              <p className="nx-fade inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs sm:text-sm font-medium text-white/85"
                style={{ "--d": "0.1s" } as Style}>
                <MapPinIcon className="size-3.5" />
                Hecho en Nicaragua · colectivos y restaurantes
              </p>
              <h1 className="nx-fade mt-5 font-heading font-bold tracking-tight text-balance text-[2.35rem] leading-[1.05] sm:text-5xl lg:text-[3.5rem]"
                style={{ "--d": "0.2s" } as Style}>
                Deja el cuaderno. Lleva tu negocio en{" "}
                <span className="relative inline-block">
                  nexo
                  <svg aria-hidden viewBox="0 0 120 12" preserveAspectRatio="none"
                    className="absolute left-0 -bottom-1.5 h-2.5 w-full overflow-visible">
                    <path d="M2 8 C 30 2, 70 2, 118 6" pathLength={1} fill="none" stroke="#FF5C1A" strokeWidth={4}
                      strokeLinecap="round" className="nx-line" style={{ "--d": "0.7s" } as Style} />
                  </svg>
                </span>.
              </h1>
              <p className="nx-fade mt-5 max-w-xl text-lg text-white/80 text-pretty" style={{ "--d": "0.35s" } as Style}>
                Vende desde el celular, controla tu inventario y cuadra la caja cada día. Cada venta queda registrada
                al momento, sin sumar a mano.
              </p>
              <div className="nx-fade mt-8 flex flex-col sm:flex-row gap-3" style={{ "--d": "0.5s" } as Style}>
                <PrimaryCta href={demoHref} label="Pide una demo por WhatsApp" />
                {hasWhatsapp
                  ? <Link href="/registro" className={CTA_GHOST}>Crear mi negocio</Link>
                  : <a href="#precio" className={CTA_GHOST}>Ver precio</a>}
              </div>
              <ul className="nx-fade mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80" style={{ "--d": "0.65s" } as Style}>
                {["Primer mes gratis", `Luego ${PRICE} al mes`, "Sin contrato"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CheckIcon className="size-4 text-[#FF5C1A]" strokeWidth={3} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <NexoNetwork className="h-auto w-full max-w-[560px] max-h-[44svh] lg:max-h-none" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── Pains ───────────── */}
      <section className="py-16 sm:py-24">
        <div className={CONTAINER}>
          <SectionHeading center title="¿Te suena alguna de estas?" />
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {PAINS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-3xl border bg-card p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-10 max-w-2xl text-center text-lg font-medium text-pretty">
            Con <span className="font-heading font-bold text-primary">nexo</span> cada venta queda registrada en el
            momento. Las cuentas ya están hechas cuando las necesitas.
          </p>
        </div>
      </section>

      {/* ───────────── Tiendas colectivas ───────────── */}
      {/* Phones: heading → preview → features. Desktop: preview beside heading + features. */}
      <section id="colectivos" className="scroll-mt-6 border-t py-16 sm:py-24">
        <div className={`${CONTAINER} grid gap-10 lg:grid-cols-2 lg:gap-x-16`}>
          <div className="lg:col-start-2 lg:row-start-1">
            <SectionHeading
              eyebrow={{ icon: StoreIcon, label: "Tiendas colectivas" }}
              title="Cada marca, sus ventas y sus cuentas claras"
              text="Para tiendas donde varias marcas venden bajo un mismo techo. Tú vendes; nexo lleva la cuenta de cada una."
            />
          </div>
          <div className="mx-auto w-full max-w-md lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-center">
            <CollectivePreview />
          </div>
          <div className="lg:col-start-2 lg:row-start-2">
            <FeatureGrid items={COLLECTIVE} />
          </div>
        </div>
      </section>

      {/* ───────────── Restaurantes ───────────── */}
      <section id="restaurantes" className="scroll-mt-6 border-t bg-muted/40 py-16 sm:py-24">
        <div className={`${CONTAINER} grid gap-10 lg:grid-cols-2 lg:gap-x-16`}>
          <div className="lg:col-start-1 lg:row-start-1">
            <SectionHeading
              eyebrow={{ icon: UtensilsCrossedIcon, label: "Restaurantes" }}
              title="Del pedido a la cocina, sin papelitos"
              text="Para restaurantes, cafeterías y comedores. El mesero toma la orden en el celular y la cocina la recibe al instante."
            />
          </div>
          <div className="mx-auto w-full max-w-md lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
            <RestaurantPreview />
          </div>
          <div className="lg:col-start-1 lg:row-start-2">
            <FeatureGrid items={RESTAURANT} />
          </div>
        </div>
      </section>

      {/* ───────────── Core: every business ───────────── */}
      <section className="border-t py-16 sm:py-24">
        <div className={CONTAINER}>
          <SectionHeading center title="Lo básico de todo negocio, incluido"
            text="Sin importar tu rubro, nexo trae lo que necesitas para el día a día." />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CORE.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-3xl border bg-card p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── How to start ───────────── */}
      <section id="empezar" className="scroll-mt-6 border-t bg-muted/40 py-16 sm:py-24">
        <div className={CONTAINER}>
          <SectionHeading center title="Empezar es fácil"
            text="No lo haces solo: te acompañamos desde el primer día." />
          <ol className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative text-center sm:px-2">
                {i < STEPS.length - 1 && (
                  <span aria-hidden className="absolute top-6 left-[calc(50%+2rem)] hidden h-px w-[calc(100%-2.5rem)] bg-border sm:block" />
                )}
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary font-heading text-lg font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-heading text-lg font-bold">{s.title}</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-muted-foreground leading-relaxed">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Price ───────────── */}
      <section id="precio" className="scroll-mt-6 border-t py-16 sm:py-24">
        <div className={CONTAINER}>
          <SectionHeading center title="Un solo precio, todo incluido"
            text="Sin costos de instalación ni letra pequeña." />
          <div className="mx-auto mt-10 max-w-md rounded-3xl border-2 border-primary bg-card p-6 sm:p-8 shadow-[0_30px_60px_-30px_rgba(27,79,255,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-lg font-bold">Plan nexo</p>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Primer mes gratis</span>
            </div>
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="font-heading text-5xl font-bold tracking-tight tabular-nums">{PRICE}</span>
              <span className="text-lg text-muted-foreground">/ mes</span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">por negocio</p>
            <ul className="mt-6 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="size-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col">
              <PrimaryCta href={startHref} label="Empezar mi mes gratis" fallbackLabel="Empezar mi mes gratis" />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Pagas desde el segundo mes, solo si nexo te sirve.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section id="preguntas" className="scroll-mt-6 border-t bg-muted/40 py-16 sm:py-24">
        <div className={CONTAINER}>
          <SectionHeading center title="Preguntas frecuentes" />
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group rounded-2xl border bg-card px-5 open:pb-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Closing CTA ───────────── */}
      <section className="relative overflow-hidden bg-[#0B1E66] text-white">
        <BrandBackdrop />
        <div className={`relative z-10 ${CONTAINER} py-16 sm:py-24 text-center`}>
          <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-balance">¿Vemos nexo con tu negocio?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80 text-pretty">
            {hasWhatsapp
              ? "Te lo mostramos en una llamada corta, sin compromiso. Si te convence, empiezas tu mes gratis ese mismo día."
              : "Crea tu negocio en un minuto y úsalo gratis el primer mes, con tus datos reales."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <PrimaryCta href={demoHref} label="Escríbenos por WhatsApp" />
            {hasWhatsapp && <Link href="/registro" className={CTA_GHOST}>Crear mi negocio</Link>}
          </div>
        </div>
      </section>

      <footer className="border-t pt-8 pb-[max(env(safe-area-inset-bottom),2rem)]">
        <div className={`${CONTAINER} flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-sm text-muted-foreground`}>
          <p>
            <span className="font-heading font-bold text-foreground/80">nexo</span>
            <span className="mx-1.5">·</span>
            Desarrollado por <span className="font-medium text-foreground/80">AG Systems</span>
            <span className="mx-1.5">·</span>
            Hecho en Nicaragua
          </p>
          <nav className="flex items-center gap-5">
            <Link href="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link>
            <Link href="/registro" className="hover:text-foreground transition-colors">Crear mi negocio</Link>
          </nav>
        </div>
      </footer>

      {/* Floating WhatsApp shortcut */}
      {demoHref && (
        <a href={demoHref} target="_blank" rel="noopener noreferrer" aria-label="Escríbenos por WhatsApp"
          className="fixed z-40 right-4 bottom-[max(env(safe-area-inset-bottom),1rem)] grid size-14 place-items-center rounded-full
                     bg-[#FF5C1A] text-white shadow-[0_14px_32px_-10px_rgba(255,92,26,0.9)] hover:brightness-110 active:scale-95 transition-all">
          <MessageCircleIcon className="size-6" />
        </a>
      )}
    </main>
  );
}
