"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import BrandBackdrop from "@/components/auth/brand-backdrop";
import NexoNetwork from "@/components/auth/nexo-network";
import { Headline, Wordmark } from "@/components/auth/hero-parts";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";

type Tab = "login" | "register";

const HASH: Record<Tab, string> = { login: "#entrar", register: "#crear" };
const EASE = "ease-[cubic-bezier(0.2,0.8,0.2,1)]";

interface Props {
  /** Which tab opens first. "intro" shows the welcome screen until the user taps a button. */
  initial?: "intro" | Tab;
  /** Fixed panel content (recuperar / restablecer): opens straight away, no tabs. */
  children?: React.ReactNode;
}

// Welcome screen (brand + "red de nexo" + message) → tap "Iniciar sesión" →
// phones: the hero shrinks up and a sheet rises; desktop: the hero narrows and a panel slides in.
export default function AuthExperience({ initial = "intro", children }: Props) {
  const isStatic = children !== undefined;
  const [open, setOpen] = useState(isStatic || initial !== "intro");
  const [tab, setTab] = useState<Tab>(initial === "register" ? "register" : "login");
  const sheetRef = useRef<HTMLDivElement>(null);

  // Phone back button closes the sheet (hash history), like an app
  useEffect(() => {
    if (isStatic) return;
    const sync = () => {
      const h = window.location.hash;
      if (h === HASH.login) { setTab("login"); setOpen(true); }
      else if (h === HASH.register) { setTab("register"); setOpen(true); }
      else if (initial === "intro") setOpen(false);
    };
    const frame = requestAnimationFrame(sync); // deep link: /login#crear
    window.addEventListener("popstate", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("popstate", sync);
    };
  }, [isStatic, initial]);

  const openTab = useCallback((t: Tab) => {
    setTab(t);
    setOpen(true);
    if (window.location.hash !== HASH[t]) {
      window.history[window.location.hash ? "replaceState" : "pushState"](null, "", HASH[t]);
    }
  }, []);

  const close = useCallback(() => {
    if (isStatic) return;
    if (window.location.hash) window.history.back();
    else setOpen(false);
  }, [isStatic]);

  // Desktop: focus the first field once the panel is in (phones: no auto keyboard)
  useEffect(() => {
    if (!open || !window.matchMedia("(min-width: 1024px)").matches) return;
    const id = setTimeout(() => sheetRef.current?.querySelector<HTMLInputElement>("input")?.focus(), 450);
    return () => clearTimeout(id);
  }, [open, tab]);

  useEffect(() => {
    if (!open || isStatic) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isStatic, close]);

  return (
    <div className="relative h-[100svh] w-full overflow-hidden bg-[#0B1E66]">
      {/* ───────────── Hero / welcome ───────────── */}
      <section
        className={`absolute inset-y-0 left-0 w-full text-white overflow-hidden transition-[width] duration-700 ${EASE} ${
          open ? "lg:w-[56%]" : ""
        }`}
      >
        <BrandBackdrop />
        <div className="relative z-10 h-full flex flex-col px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)] lg:px-12 lg:py-10">
          <Wordmark />

          {/* Network: shrinks up on phones when the sheet opens */}
          <div className={`flex-1 min-h-0 flex items-center justify-center py-2 transition-transform duration-700 ${EASE} origin-top ${
            open ? "scale-[0.6] -translate-y-[17%] lg:scale-100 lg:translate-y-0" : ""
          }`}>
            <NexoNetwork className="w-full max-w-[600px] h-auto max-h-[44svh] lg:max-h-[54vh]" />
          </div>

          {/* Message (hidden behind the sheet on phones, stays on desktop) */}
          <div className={`transition-all duration-500 ${EASE} ${
            open ? "opacity-0 translate-y-6 pointer-events-none lg:opacity-100 lg:translate-y-0 lg:pointer-events-auto" : ""
          }`}>
            <Headline className="max-w-xl" />
          </div>

          {/* Welcome actions */}
          {/* outer: entrance (nx-fade fills opacity) · inner: hide when the sheet opens */}
          <div className="nx-fade" style={{ "--d": "1.9s" } as React.CSSProperties}>
          <div className={`mt-7 flex flex-col sm:flex-row gap-3 transition-all duration-500 ${EASE} ${
            open ? "opacity-0 translate-y-8 pointer-events-none max-h-0 mt-0 overflow-hidden" : "max-h-40"
          }`} aria-hidden={open}>
            <button type="button" onClick={() => openTab("login")} tabIndex={open ? -1 : 0}
              className="group h-14 sm:px-10 rounded-2xl bg-[#FF5C1A] text-white text-base font-semibold flex items-center justify-center gap-2
                         shadow-[0_14px_32px_-12px_rgba(255,92,26,0.85)] hover:brightness-110 active:scale-[0.97] transition-all duration-150">
              Iniciar sesión
              <ArrowRightIcon className="size-5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => openTab("register")} tabIndex={open ? -1 : 0}
              className="h-14 sm:px-8 rounded-2xl border border-white/30 bg-white/10 text-white text-base font-semibold backdrop-blur-sm
                         hover:bg-white/15 active:scale-[0.97] transition-all duration-150">
              Crear mi negocio
            </button>
          </div>
          </div>

          <p className={`mt-5 text-center sm:text-left text-xs text-white/50 transition-opacity duration-300 ${open ? "opacity-0 lg:opacity-100" : ""}`}>
            Desarrollado por AG Systems
          </p>
        </div>

        {/* Phones: tapping the visible hero closes the sheet */}
        {open && !isStatic && (
          <button type="button" aria-label="Volver a la bienvenida" onClick={close}
            className="lg:hidden absolute inset-x-0 top-0 h-[22svh] z-20" />
        )}
      </section>

      {/* ───────────── Sheet (phones) / panel (desktop) ───────────── */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal={false}
        aria-label={isStatic ? "Acceso" : tab === "login" ? "Iniciar sesión" : "Crear negocio"}
        inert={!open}
        className={`absolute z-30 inset-x-0 bottom-0 h-[76svh] rounded-t-[28px] bg-background flex flex-col
                    shadow-[0_-18px_50px_-18px_rgba(11,30,102,0.6)] transition-transform duration-500 ${EASE}
                    lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:w-[44%] lg:rounded-none lg:shadow-[-30px_0_70px_-30px_rgba(11,30,102,0.5)]
                    ${open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-y-0 lg:translate-x-full"}`}
      >
        <div className="lg:hidden mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-muted-foreground/25" aria-hidden />

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="min-h-full flex flex-col px-6 pt-4 pb-6 lg:py-10 lg:justify-center">
            <div className="w-full max-w-sm mx-auto space-y-6">
              <div className="space-y-4">
                {isStatic ? (
                  <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeftIcon className="size-4" /> Volver al inicio de sesión
                  </Link>
                ) : (
                  <>
                    <button type="button" onClick={close}
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowLeftIcon className="size-4" /> Volver
                    </button>
                    {/* Segmented switch with a sliding pill */}
                    <div className="relative grid grid-cols-2 rounded-2xl bg-muted p-1" role="tablist">
                      <span aria-hidden
                        className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-xl bg-card shadow-sm transition-transform duration-300 ${EASE} ${
                          tab === "register" ? "translate-x-full" : ""
                        }`} />
                      {(["login", "register"] as Tab[]).map((t) => (
                        <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => openTab(t)}
                          className={`relative z-10 h-11 rounded-xl text-sm font-semibold transition-colors duration-200 ${
                            tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}>
                          {t === "login" ? "Iniciar sesión" : "Crear negocio"}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {isStatic ? (
                children
              ) : (
                <div key={tab} className={`animate-in fade-in duration-300 ${tab === "login" ? "slide-in-from-left-4" : "slide-in-from-right-4"}`}>
                  {tab === "login" ? <LoginForm /> : <RegisterForm />}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 text-center text-xs text-muted-foreground">
          <span className="font-heading font-bold text-foreground/80">nexo</span>
          <span className="mx-1.5">·</span>
          Desarrollado por <span className="font-medium text-foreground/80">AG Systems</span>
        </p>
      </div>
    </div>
  );
}
