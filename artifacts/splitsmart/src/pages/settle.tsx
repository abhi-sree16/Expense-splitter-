import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGroup, useGetOptimalSettlements, getGetOptimalSettlementsQueryKey, useListSettlements,
  getListSettlementsQueryKey, useCreateSettlement, useDeleteSettlement, useListMembers,
} from "@workspace/api-client-react";
import { formatCurrency, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Plus, Trash2, ArrowRight, PartyPopper } from "lucide-react";

export default function SettlePage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: group } = useGetGroup(groupId, { query: { enabled: !!groupId } });
  const { data: suggestions, isLoading: loadingSugg } = useGetOptimalSettlements(groupId, { query: { enabled: !!groupId } });
  const { data: settlements, isLoading: loadingSetl } = useListSettlements(groupId, { query: { enabled: !!groupId } });
  const { data: members } = useListMembers(groupId, { query: { enabled: !!groupId } });
  const createSettlement = useCreateSettlement();
  const deleteSettlement = useDeleteSettlement();

  const [showCustom, setShowCustom] = useState(false);
  const [form, setForm] = useState({ fromMemberId: "", toMemberId: "", amount: "", note: "" });

  function handleRecord(fromId: number, toId: number, amount: number) {
    createSettlement.mutate(
      { groupId, data: { fromMemberId: fromId, toMemberId: toId, amount } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetOptimalSettlementsQueryKey(groupId) });
          qc.invalidateQueries({ queryKey: getListSettlementsQueryKey(groupId) });
          toast({ title: "Payment recorded" });
        },
        onError: () => toast({ title: "Error recording payment", variant: "destructive" }),
      }
    );
  }

  function handleCustomRecord() {
    if (!form.fromMemberId || !form.toMemberId || !form.amount) return;
    createSettlement.mutate(
      { groupId, data: { fromMemberId: Number(form.fromMemberId), toMemberId: Number(form.toMemberId), amount: Number(form.amount), note: form.note } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetOptimalSettlementsQueryKey(groupId) });
          qc.invalidateQueries({ queryKey: getListSettlementsQueryKey(groupId) });
          setShowCustom(false);
          setForm({ fromMemberId: "", toMemberId: "", amount: "", note: "" });
          toast({ title: "Payment recorded" });
        },
      }
    );
  }

  function handleDeleteSettlement(setlId: number) {
    deleteSettlement.mutate(
      { groupId, id: setlId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetOptimalSettlementsQueryKey(groupId) });
          qc.invalidateQueries({ queryKey: getListSettlementsQueryKey(groupId) });
          toast({ title: "Settlement removed" });
        },
      }
    );
  }

  const memberMap = new Map((members || []).map((m) => [m.id, m]));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/groups/${groupId}`)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <div className="font-bold text-base">{group?.name}</div>
            <div className="text-xs text-muted-foreground">Settle Up</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowCustom(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Custom
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Optimal suggestions */}
        <section>
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Suggested Payments</h2>
          {loadingSugg ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
          ) : !suggestions || suggestions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-emerald-200 dark:border-emerald-900 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20">
              <PartyPopper className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">All settled up!</h3>
              <p className="text-sm text-muted-foreground mt-1">No outstanding balances in this group.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s, i) => {
                const from = memberMap.get(s.fromMemberId);
                const to = memberMap.get(s.toMemberId);
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3.5 bg-card border border-card-border rounded-xl hover:border-primary/30 transition-all">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: from?.avatarColor || "#ef4444" }}
                    >
                      {initials(s.fromMemberName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        <span>{s.fromMemberName}</span>
                        <ArrowRight className="inline h-3.5 w-3.5 mx-1.5 text-muted-foreground" />
                        <span>{s.toMemberName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">pays {formatCurrency(s.amount, group?.currency)}</div>
                    </div>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: to?.avatarColor || "#10b981" }}
                    >
                      {initials(s.toMemberName)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRecord(s.fromMemberId, s.toMemberId, s.amount)}
                      disabled={createSettlement.isPending}
                      className="gap-1.5 ml-2"
                    >
                      <Check className="h-3.5 w-3.5" /> Done
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past settlements */}
        {settlements && settlements.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Past Settlements</h2>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              {[...settlements].reverse().map((s, i) => {
                const from = memberMap.get(s.fromMemberId);
                const to = memberMap.get(s.toMemberId);
                return (
                  <div key={s.id} className={`group flex items-center gap-3 px-4 py-3 ${i < settlements.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: from?.avatarColor || "#6366f1" }}>
                      {initials(from?.name || s.fromMemberId.toString())}
                    </div>
                    <div className="flex-1 min-w-0 text-sm">
                      <span className="font-medium">{from?.name ?? `#${s.fromMemberId}`}</span>
                      <span className="text-muted-foreground"> paid </span>
                      <span className="font-medium">{to?.name ?? `#${s.toMemberId}`}</span>
                      {s.note && <div className="text-xs text-muted-foreground truncate">{s.note}</div>}
                    </div>
                    <span className="font-semibold text-sm text-emerald-600">{formatCurrency(s.amount, group?.currency)}</span>
                    <button
                      onClick={() => handleDeleteSettlement(s.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <Dialog open={showCustom} onOpenChange={setShowCustom}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Record Custom Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>From (who paid)</Label>
              <Select value={form.fromMemberId} onValueChange={(v) => setForm({ ...form, fromMemberId: v })}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{(members || []).map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To (who received)</Label>
              <Select value={form.toMemberId} onValueChange={(v) => setForm({ ...form, toMemberId: v })}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{(members || []).map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input placeholder="Optional" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustom(false)}>Cancel</Button>
            <Button onClick={handleCustomRecord} disabled={!form.fromMemberId || !form.toMemberId || !form.amount || createSettlement.isPending}>
              {createSettlement.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
