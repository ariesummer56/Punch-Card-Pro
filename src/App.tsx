import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SubscriptionGate } from "@/components/SubscriptionGate";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Portal from "./pages/Portal.tsx";
import Signup from "./pages/Signup.tsx";
import SetPassword from "./pages/SetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import DemoLauncher from "./pages/DemoLauncher.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import { RoleGuard } from "./components/RoleGuard.tsx";
import { RecoveryRedirect } from "./components/RecoveryRedirect.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RecoveryRedirect />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sign-up" element={<Signup mode="signup" />} />
            <Route path="/request-demo" element={<Signup mode="demo" />} />
            <Route path="/admin-login" element={<Login portal="admin" />} />
            <Route path="/manager-login" element={<Login portal="manager" />} />
            <Route path="/employee-login" element={<Login portal="employee" />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/admin" element={<RoleGuard required="admin"><SubscriptionGate><Portal role="admin" /></SubscriptionGate></RoleGuard>} />
            <Route path="/manager" element={<RoleGuard required="manager"><SubscriptionGate><Portal role="manager" /></SubscriptionGate></RoleGuard>} />
            <Route path="/employee" element={<RoleGuard required="employee"><SubscriptionGate><Portal role="employee" /></SubscriptionGate></RoleGuard>} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/demo" element={<DemoLauncher />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
