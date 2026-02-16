import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import SelectRole from "./pages/SelectRole";
import BuilderDashboard from "./pages/BuilderDashboard";
import ContractorDashboard from "./pages/ContractorDashboard";
import CreateProject from "./pages/CreateProject";
import ProjectDetail from "./pages/ProjectDetail";
import BrowseProjects from "./pages/BrowseProjects";
import SubmitQuote from "./pages/SubmitQuote";
import Milestones from "./pages/Milestones";
import EscrowDashboard from "./pages/EscrowDashboard";
import AITools from "./pages/AITools";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedWithLayout({ children, requiredRole }: { children: React.ReactNode; requiredRole?: "builder" | "contractor" }) {
  return (
    <ProtectedRoute requiredRole={requiredRole}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/select-role" element={<SelectRole />} />
            <Route path="/builder" element={<ProtectedWithLayout requiredRole="builder"><BuilderDashboard /></ProtectedWithLayout>} />
            <Route path="/builder/create-project" element={<ProtectedWithLayout requiredRole="builder"><CreateProject /></ProtectedWithLayout>} />
            <Route path="/contractor" element={<ProtectedWithLayout requiredRole="contractor"><ContractorDashboard /></ProtectedWithLayout>} />
            <Route path="/contractor/browse" element={<ProtectedWithLayout requiredRole="contractor"><BrowseProjects /></ProtectedWithLayout>} />
            <Route path="/projects/:id" element={<ProtectedWithLayout><ProjectDetail /></ProtectedWithLayout>} />
            <Route path="/projects/:projectId/submit-quote" element={<ProtectedWithLayout requiredRole="contractor"><SubmitQuote /></ProtectedWithLayout>} />
            <Route path="/milestones" element={<ProtectedWithLayout><Milestones /></ProtectedWithLayout>} />
            <Route path="/escrow" element={<ProtectedWithLayout><EscrowDashboard /></ProtectedWithLayout>} />
            <Route path="/ai-tools" element={<ProtectedWithLayout><AITools /></ProtectedWithLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
