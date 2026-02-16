import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import SelectRole from "./pages/SelectRole";
import BuilderDashboard from "./pages/BuilderDashboard";
import ContractorDashboard from "./pages/ContractorDashboard";
import CreateProject from "./pages/CreateProject";
import ProjectDetail from "./pages/ProjectDetail";
import BrowseProjects from "./pages/BrowseProjects";
import SubmitQuote from "./pages/SubmitQuote";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
            <Route path="/builder" element={<ProtectedRoute requiredRole="builder"><BuilderDashboard /></ProtectedRoute>} />
            <Route path="/builder/create-project" element={<ProtectedRoute requiredRole="builder"><CreateProject /></ProtectedRoute>} />
            <Route path="/contractor" element={<ProtectedRoute requiredRole="contractor"><ContractorDashboard /></ProtectedRoute>} />
            <Route path="/contractor/browse" element={<ProtectedRoute requiredRole="contractor"><BrowseProjects /></ProtectedRoute>} />
            <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="/projects/:projectId/submit-quote" element={<ProtectedRoute requiredRole="contractor"><SubmitQuote /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
