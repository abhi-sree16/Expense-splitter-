import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGroups,
  getListGroupsQueryKey,
  useCreateGroup,
  useDeleteGroup,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, ChevronRight, LayoutGrid } from "lucide-react";
import { CATEGORIES } from "@/lib/format";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"];

export default function GroupsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: groups, isLoading } = useListGroups();
  const createGroup = useCreateGroup();
  const deleteGroup = useDeleteGroup();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", currency: "INR", category: "general", emoji: "" });

  function handleCreate() {
    if (!form.name.trim()) return;
    createGroup.mutate(
      { data: { name: form.name, description: form.description, currency: form.currency, category: form.category, emoji: form.emoji } },
      {
        onSuccess: (g) => {
          qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          setShowCreate(false);
          setForm({ name: "", description: "", currency: "INR", category: "general", emoji: "" });
          toast({ title: "Group created", description: g.name });
          navigate(`/groups/${g.id}`);
        },
        onError: () => toast({ title: "Error creating group", variant: "destructive" }),
      }
    );
  }

  function handleDelete(e: React.MouseEvent, id: number, name: string) {
    e.stopPropagation();
    deleteGroup.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListGroupsQueryKey() });
          toast({ title: "Group deleted", description: name });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">SplitSmart</span>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Group
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Your Groups</h1>
          <p className="text-muted-foreground text-sm mt-1">Track and split expenses with anyone.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No groups yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Create your first group to start splitting expenses.</p>
            <Button onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Create a Group
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/groups/${g.id}`)}
                className="group flex items-center gap-4 p-4 bg-card border border-card-border rounded-xl cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-accent flex items-center justify-center text-xl font-bold text-primary">
                  {g.emoji || g.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{g.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="capitalize">{g.category}</span>
                    <span>·</span>
                    <span>{g.currency}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, g.id, g.name)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a new group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label>Group name *</Label>
                <Input placeholder="e.g. Goa Trip" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Emoji</Label>
                <Input placeholder="e.g. ✈️" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-20 text-center" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional note" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim() || createGroup.isPending}>
              {createGroup.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
