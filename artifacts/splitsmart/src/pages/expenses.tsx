import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGroup, useListExpenses, getListExpensesQueryKey, useListMembers,
  useCreateExpense, useDeleteExpense,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate, initials, CATEGORIES, SPLIT_TYPES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Receipt } from "lucide-react";

export default function ExpensesPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: group } = useGetGroup(groupId, { query: { enabled: !!groupId } });
  const { data: expenses, isLoading } = useListExpenses(groupId, { query: { enabled: !!groupId } });
  const { data: members } = useListMembers(groupId, { query: { enabled: !!groupId } });
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "", amount: "", category: "other", splitType: "equal",
    paidById: "", notes: "", date: new Date().toISOString().split("T")[0],
  });

  const memberMap = new Map((members || []).map((m) => [m.id, m]));

  function handleCreate() {
    if (!form.title.trim() || !form.amount || !form.paidById) return;
    createExpense.mutate(
      {
        groupId,
        data: {
          title: form.title, amount: Number(form.amount), category: form.category,
          splitType: form.splitType, paidById: Number(form.paidById),
          notes: form.notes, date: form.date,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListExpensesQueryKey(groupId) });
          setShowCreate(false);
          setForm({ title: "", amount: "", category: "other", splitType: "equal", paidById: "", notes: "", date: new Date().toISOString().split("T")[0] });
          toast({ title: "Expense added" });
        },
        onError: () => toast({ title: "Error adding expense", variant: "destructive" }),
      }
    );
  }

  function handleDelete(expId: number, title: string) {
    deleteExpense.mutate(
      { groupId, id: expId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListExpensesQueryKey(groupId) });
          toast({ title: "Expense deleted", description: title });
        },
      }
    );
  }

  const total = (expenses || []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/groups/${groupId}`)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <div className="font-bold text-base">{group?.name}</div>
            <div className="text-xs text-muted-foreground">Expenses</div>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {expenses && expenses.length > 0 && (
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{expenses.length} expense{expenses.length !== 1 ? "s" : ""}</span>
            <span className="font-bold text-primary">{formatCurrency(total, group?.currency)}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !expenses || expenses.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <Receipt className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No expenses yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Add your first expense to start tracking.</p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Expense</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...expenses].reverse().map((e) => {
              const payer = memberMap.get(e.paidById);
              return (
                <div key={e.id} className="group flex items-center gap-3 px-4 py-3 bg-card border border-card-border rounded-xl hover:border-primary/30 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      {payer && (
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: payer.avatarColor || "#6366f1" }}
                        >
                          {initials(payer.name)}
                        </span>
                      )}
                      <span>{payer?.name}</span>
                      <span>·</span>
                      <span>{formatDate(e.date)}</span>
                      <span>·</span>
                      <span className="capitalize">{e.category}</span>
                      <span>·</span>
                      <span className="capitalize">{e.splitType}</span>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(e.amount, group?.currency)}</span>
                  <button
                    onClick={() => handleDelete(e.id, e.title)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Dinner at Spice Route" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <Input type="number" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Paid by *</Label>
              <Select value={form.paidById} onValueChange={(v) => setForm({ ...form, paidById: v })}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {(members || []).map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Split type</Label>
                <Select value={form.splitType} onValueChange={(v) => setForm({ ...form, splitType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SPLIT_TYPES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional note" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || !form.amount || !form.paidById || createExpense.isPending}>
              {createExpense.isPending ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
