"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { updateBilling, recordPayment, deletePayment, addNote } from "@/app/(admin)/admin/[orgId]/actions";
import { PAYMENT_METHOD_LABEL } from "@/components/admin/billing-status";
import type { SubscriptionPaymentMethod } from "@/types/database";

interface BillingProps {
  orgId:         string;
  active:        boolean;
  exempt:        boolean;
  monthlyFee:    number | null;
  defaultFee:    number | null;
  ownerPhone:    string | null;
  trialEndsAt:   string | null; // YYYY-MM-DD (Managua)
}

/** Access + price for one business: pause, exempt, custom fee, contact phone, trial end. */
export function BillingForm(props: BillingProps) {
  const [active, setActive] = useState(props.active);
  const [exempt, setExempt] = useState(props.exempt);
  const [fee, setFee] = useState(props.monthlyFee?.toString() ?? "");
  const [phone, setPhone] = useState(props.ownerPhone ?? "");
  const [trialEnd, setTrialEnd] = useState(props.trialEndsAt ?? "");
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const result = await updateBilling(props.orgId, {
        active,
        billing_exempt: exempt,
        monthly_fee:    fee.trim() === "" ? null : Number(fee),
        owner_phone:    phone.trim() || null,
        trial_ends_at:  trialEnd || null,
      });
      if (result?.error) toast.error(result.error);
      else toast.success("Cobro actualizado");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>Acceso activo</Label>
          <p className="text-xs text-muted-foreground">Apágalo para pausar el negocio sin borrar nada.</p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>Sin cobro</Label>
          <p className="text-xs text-muted-foreground">Demos, pruebas internas o acuerdos especiales.</p>
        </div>
        <Switch checked={exempt} onCheckedChange={setExempt} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="fee">Mensualidad (C$)</Label>
          <Input id="fee" type="number" min={0} step="0.01" value={fee} onChange={(e) => setFee(e.target.value)}
            placeholder={props.defaultFee != null ? `${props.defaultFee} (general)` : "General"} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trial">Fin de la prueba</Label>
          <Input id="trial" type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">WhatsApp del dueño</Label>
        <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8888 8888" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="size-4 animate-spin" />} Guardar cobro
      </Button>
    </form>
  );
}

/** Record a monthly payment: extends paid_until from the end of the current period. */
export function PaymentForm({ orgId, suggestedAmount, today }: { orgId: string; suggestedAmount: number | null; today: string }) {
  const [method, setMethod] = useState<SubscriptionPaymentMethod>("transferencia");
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("method", method);
    start(async () => {
      const result = await recordPayment(orgId, fd);
      if (result?.error) { toast.error(result.error); return; }
      toast.success(result.until ? `Pago registrado. Pagado hasta el ${result.until}` : "Pago registrado");
      form.reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Monto (C$)</Label>
          <Input id="amount" name="amount" type="number" min={0} step="0.01" required
            defaultValue={suggestedAmount ?? undefined} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="months">Meses</Label>
          <Input id="months" name="months" type="number" min={1} max={24} defaultValue={1} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Forma de pago</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as SubscriptionPaymentMethod)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHOD_LABEL).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paid_at">Fecha de pago</Label>
          <Input id="paid_at" name="paid_at" type="date" defaultValue={today} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Nota (opcional)</Label>
        <Input id="notes" name="notes" maxLength={500} placeholder="Referencia de la transferencia…" />
      </div>
      <Button type="submit" variant="cta" className="w-full" disabled={pending}>
        {pending && <Loader2Icon className="size-4 animate-spin" />} Registrar pago
      </Button>
    </form>
  );
}

export function DeletePaymentButton({ orgId, paymentId }: { orgId: string; paymentId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label="Anular pago"
      onClick={() => {
        if (!confirm("¿Anular este pago? La fecha de \"pagado hasta\" se recalcula.")) return;
        start(async () => {
          const result = await deletePayment(orgId, paymentId);
          if (result?.error) toast.error(result.error);
          else toast.success("Pago anulado");
        });
      }}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
    </Button>
  );
}

export function NoteForm({ orgId }: { orgId: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <form className="space-y-2" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const result = await addNote(orgId, body);
        if (result?.error) toast.error(result.error);
        else setBody("");
      });
    }}>
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={2}
        placeholder="Ej.: prometió pagar el viernes; prefiere que le escriban en la tarde…" />
      <Button type="submit" size="sm" variant="outline" disabled={pending || !body.trim()}>
        {pending && <Loader2Icon className="size-4 animate-spin" />} Agregar nota
      </Button>
    </form>
  );
}
