import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Portal from "./pages/Portal.tsx";
import Signup from "./pages/Signup.tsx";
import SetPassword from "./pages/SetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import DemoLauncher from "./pages/DemoLauncher.tsx";
import { RoleGuard } from "./components/RoleGuard.tsx";
import { RecoveryRedirect } from "./components/RecoveryRedirect.tsx";

const queryClient = new QueryClient();

const App = () => (
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
          <Route path="/admin" element={<RoleGuard required="admin"><Portal role="admin" /></RoleGuard>} />
          <Route path="/manager" element={<RoleGuard required="manager"><Portal role="manager" /></RoleGuard>} />
          <Route path="/employee" element={<RoleGuard required="employee"><Portal role="employee" /></RoleGuard>} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/demo" element={<DemoLauncher />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
