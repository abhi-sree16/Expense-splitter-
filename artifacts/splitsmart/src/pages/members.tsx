import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetGroup, useListMembers, getListMembersQueryKey, useAddMember, useUpdateMember, useDeleteMember,
} from "@workspace/api-client-react";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Pencil, Users } from "lucide-react";

const AVATAR_COLORS = [
  "#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#8b5cf6","#14b8a6","#f97316","#84cc16",
];

export default function MembersPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: group } = useGetGroup(groupId, { query: { enabled: !!groupId } });
  const { data: members, isLoading } = useListMembers(groupId, { query: { enabled: !!groupId } });
  const addMember = useAddMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<{ id: number; name: string; email: string; avatarColor: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", avatarColor: AVATAR_COLORS[0] });

  function handleAdd() {
    if (!form.name.trim()) return;
    addMember.mutate(
      { groupId, data: { name: form.name, email: form.email, avatarColor: form.avatarColor } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMembersQueryKey(groupId) });
          setShowAdd(false);
          setForm({ name: "", email: "", avatarColor: AVATAR_COLORS[0] });
          toast({ title: "Member added" });
        },
        onError: () => toast({ title: "Error adding member", variant: "destructive" }),
      }
    );
  }

  function handleUpdate() {
    if (!editMember || !editMember.name.trim()) return;
    updateMember.mutate(
      { groupId, id: editMember.id, data: { name: editMember.name, email: editMember.email, avatarColor: editMember.avatarColor } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMembersQueryKey(groupId) });
          setEditMember(null);
          toast({ title: "Member updated" });
        },
      }
    );
  }

  function handleDelete(mId: number, name: string) {
    deleteMember.mutate(
      { groupId, id: mId },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMembersQueryKey(groupId) });
          toast({ title: "Member removed", description: name });
        },
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/groups/${groupId}`)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <div className="font-bold text-base">{group?.name}</div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        ) : !members || members.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-1">No members yet</h3>
            <p className="text-muted-foreground text-sm mb-6">Add members to split expenses with.</p>
            <Button onClick={() => setShowAdd(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Add Member</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="group flex items-center gap-3 px-4 py-3 bg-card border border-card-border rounded-xl hover:border-primary/30 transition-all">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: m.avatarColor || "#6366f1" }}
                >
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.name}</div>
                  {m.email && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditMember({ id: m.id, name: m.name, email: m.email || "", avatarColor: m.avatarColor })}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id, m.name)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add member dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="Optional" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Avatar color</Label>
              <div className="flex gap-2 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, avatarColor: c })}
                    className={`w-7 h-7 rounded-full transition-all ${form.avatarColor === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name.trim() || addMember.isPending}>
              {addMember.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit member dialog */}
      <Dialog open={!!editMember} onOpenChange={() => setEditMember(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          {editMember && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={editMember.name} onChange={(e) => setEditMember({ ...editMember, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editMember.email} onChange={(e) => setEditMember({ ...editMember, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Avatar color</Label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditMember({ ...editMember, avatarColor: c })}
                      className={`w-7 h-7 rounded-full transition-all ${editMember.avatarColor === c ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!editMember?.name.trim() || updateMember.isPending}>
              {updateMember.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
