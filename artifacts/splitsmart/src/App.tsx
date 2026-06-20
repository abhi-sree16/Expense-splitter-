import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import GroupsPage from "@/pages/groups";
import GroupDetailPage from "@/pages/group-detail";
import ExpensesPage from "@/pages/expenses";
import MembersPage from "@/pages/members";
import SettlePage from "@/pages/settle";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={GroupsPage} />
      <Route path="/groups/:id" component={GroupDetailPage} />
      <Route path="/groups/:id/expenses" component={ExpensesPage} />
      <Route path="/groups/:id/members" component={MembersPage} />
      <Route path="/groups/:id/settle" component={SettlePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
