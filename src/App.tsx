import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppWidget } from "./components/WhatsAppWidget";
import { lazyWithRetry } from "./lib/utils/lazyRetry";

// Lazy load pages with retry mechanism
const Login = lazyWithRetry(() => import("./pages/Login"));
const Register = lazyWithRetry(() => import("./pages/Register"));
const Documents = lazyWithRetry(() => import("./pages/Documents"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Plans = lazyWithRetry(() => import("./pages/Plans"));
const PlansSuccess = lazyWithRetry(() => import("./pages/plans/Success"));
const PlansCancel = lazyWithRetry(() => import("./pages/plans/Cancel"));
const Billing = lazyWithRetry(() => import("./pages/Billing"));
const Forum = lazyWithRetry(() => import("./pages/Forum"));
const ForumNew = lazyWithRetry(() => import("./pages/ForumNew"));
const ForumTopic = lazyWithRetry(() => import("./pages/ForumTopic"));
const WhatsAppCommunity = lazyWithRetry(() => import("./pages/WhatsAppCommunity"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const Announcements = lazyWithRetry(() => import("./pages/Announcements"));
const Suggestions = lazyWithRetry(() => import("./pages/Suggestions"));
const DocumentView = lazyWithRetry(() => import("./pages/DocumentView"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Loading component with retry mechanism
function PageLoadingSkeleton() {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan border-r-transparent"></div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mx-auto" />
            <p className="text-sm text-muted-foreground">Carregando página...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error fallback component
function ErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-foreground">Erro ao carregar página</h2>
          <p className="text-sm text-muted-foreground">
            {error.message || "Ocorreu um erro inesperado"}
          </p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-cyan text-white rounded-lg hover:bg-cyan/90 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AuthProvider>
              <NotificationProvider>
                <Toaster />
                <Sonner />
                <Suspense fallback={<PageLoadingSkeleton />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/auth" element={<Register />} />
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Documents />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/documents/:id"
                      element={
                        <ProtectedRoute>
                          <DocumentView />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/plans"
                      element={
                        <ProtectedRoute requireSubscription={false}>
                          <Plans />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/plans/success"
                      element={
                        <ProtectedRoute requireSubscription={false}>
                          <PlansSuccess />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/plans/cancel"
                      element={
                        <ProtectedRoute requireSubscription={false}>
                          <PlansCancel />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/billing"
                      element={
                        <ProtectedRoute>
                          <Billing />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/forum"
                      element={
                        <ProtectedRoute>
                          <Forum />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/forum/new"
                      element={
                        <ProtectedRoute>
                          <ForumNew />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/forum/:id"
                      element={
                        <ProtectedRoute>
                          <ForumTopic />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/whatsapp-community"
                      element={
                        <ProtectedRoute>
                          <WhatsAppCommunity />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute adminOnly>
                          <Admin />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/announcements"
                      element={
                        <ProtectedRoute>
                          <Announcements />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/suggestions"
                      element={
                        <ProtectedRoute>
                          <Suggestions />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
            <WhatsAppWidget />
            </NotificationProvider>
          </AuthProvider>
        </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
