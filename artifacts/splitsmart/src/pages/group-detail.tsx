import { useLocation, useParams } from "wouter";
import { useGetGroup, useGetGroupSummary, useGetGroupBalances, useGetOptimalSettlements, useListExpenses, useListMembers } from "@workspace/api-client-react";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Receipt, ArrowRightLeft, TrendingUp, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const [, navigate] = useLocation();

  const { data: group, isLoading: loadingGroup } = useGetGroup(groupId, { query: { enabled: !!groupId } });
  const { data: summary } = useGetGroupSummary(groupId, { query: { enabled: !!groupId } });
  const { data: balances } = useGetGroupBalances(groupId, { query: { enabled: !!groupId } });
  const { data: settlements } = useGetOptimalSettlements(groupId, { query: { enabled: !!groupId } });
  const { data: expenses } = useListExpenses(groupId, { query: { enabled: !!groupId } });
  const { data: members } = useListMembers(groupId, { query: { enabled: !!groupId } });

  if (loadingGroup) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!group) return <div className="p-8 text-center text-muted-foreground">Group not found.</div>;

  const memberMap = new Map((members || []).map((m) => [m.id, m]));
  const recentExpenses = (expenses || []).slice(-5).reverse();
  const pieData = (summary?.categoryBreakdown || []).map((c) => ({ name: c.category, value: c.total }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xl">{group.emoji}</span>
              <span className="font-bold text-base truncate">{group.name}</span>
            </div>
            <div className="text-xs text-muted-foreground capitalize">{group.category} · {group.currency}</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Spent", value: summary ? formatCurrency(summary.totalSpent, group.currency) : "—" },
            { label: "Expenses", value: summary?.expenseCount ?? "—" },
            { label: "Members", value: summary?.memberCount ?? "—" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-card-border rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-primary">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Receipt, label: "Expenses", path: `/groups/${groupId}/expenses` },
            { icon: Users, label: "Members", path: `/groups/${groupId}/members` },
            { icon: ArrowRightLeft, label: "Settle Up", path: `/groups/${groupId}/settle` },
          ].map(({ icon: Icon, label, path }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-4 bg-card border border-card-border rounded-xl hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Balances */}
        {balances && balances.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Balances</h2>
            </div>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              {balances.map((b, i) => (
                <div key={b.memberId} className={`flex items-center gap-3 px-4 py-3 ${i < balances.length - 1 ? "border-b border-border" : ""}`}>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: b.avatarColor || "#6366f1" }}
                  >
                    {initials(b.memberName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{b.memberName}</div>
                    <div className="text-xs text-muted-foreground">Paid {formatCurrency(b.paid, group.currency)}</div>
                  </div>
                  <div className={`font-bold text-sm ${b.netBalance > 0 ? "text-emerald-500" : b.netBalance < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {b.netBalance > 0 ? "+" : ""}{formatCurrency(b.netBalance, group.currency)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Settlement suggestions */}
        {settlements && settlements.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Suggested Settlements</h2>
              <button onClick={() => navigate(`/groups/${groupId}/settle`)} className="text-xs text-primary hover:underline">
                Settle up →
              </button>
            </div>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              {settlements.map((s, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < settlements.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {initials(s.fromMemberName)}
                  </div>
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{s.fromMemberName}</span>
                    <span className="text-muted-foreground"> owes </span>
                    <span className="font-medium">{s.toMemberName}</span>
                  </div>
                  <span className="font-bold text-sm text-primary">{formatCurrency(s.amount, group.currency)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Category breakdown */}
        {pieData.length > 0 && (
          <section>
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Spending by Category</h2>
            <div className="bg-card border border-card-border rounded-xl p-4 flex gap-6 items-center">
              <div className="w-36 h-36 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={30} paddingAngle={2}>
                      {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v, group.currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.slice(0, 5).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="flex-1 capitalize truncate text-muted-foreground">{d.name}</span>
                    <span className="font-medium">{formatCurrency(d.value, group.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Recent expenses */}
        {recentExpenses.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Recent Expenses</h2>
              <button onClick={() => navigate(`/groups/${groupId}/expenses`)} className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="bg-card border border-card-border rounded-xl overflow-hidden">
              {recentExpenses.map((e, i) => {
                const payer = memberMap.get(e.paidById);
                return (
                  <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${i < recentExpenses.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{e.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {payer?.name} · {formatDate(e.date)} · <span className="capitalize">{e.category}</span>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-foreground">{formatCurrency(e.amount, group.currency)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
