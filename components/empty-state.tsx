import { type ReactNode } from "react";

const ICONS = {
  box: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-muted-foreground/30">
      <rect x="10" y="30" width="60" height="40" rx="4" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M10 40h60M25 30V20a15 15 0 0130 0v10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M32 50h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-muted-foreground/30">
      <path d="M20 10h40v60l-8-6-8 6-8-6-8 6-8-6V10z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M30 28h20M30 40h20M30 52h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-muted-foreground/30">
      <circle cx="32" cy="28" r="12" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M10 66c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="58" cy="30" r="9" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M52 66c0-9.94 5.37-18.6 13-23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  store: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-muted-foreground/30">
      <path d="M10 35l6-20h48l6 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 35v30h60V35" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
      <rect x="30" y="45" width="20" height="20" rx="2" stroke="currentColor" strokeWidth="2.5"/>
      <path d="M10 35c0 5.52 4.48 10 10 10s10-4.48 10-10M30 35c0 5.52 4.48 10 10 10s10-4.48 10-10M50 35c0 5.52 4.48 10 10 10s10-4.48 10-10" stroke="currentColor" strokeWidth="2.5"/>
    </svg>
  ),
  cart: (
    <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20 text-muted-foreground/30">
      <path d="M10 16h8l10 34h30l8-24H26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="36" cy="60" r="4" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="56" cy="60" r="4" stroke="currentColor" strokeWidth="2.5"/>
    </svg>
  ),
};

interface Props {
  icon?: keyof typeof ICONS;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon = "box", title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4">{ICONS[icon]}</div>
      <h3 className="font-semibold text-base text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
