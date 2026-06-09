import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import EmailAuth from "@/pages/EmailAuth";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Summaries from "@/pages/Summaries";
import TeacherChat from "@/pages/TeacherChat";
import Topics from "@/pages/Topics";
import OCR from "@/pages/OCR";
import Flashcards from "@/pages/Flashcards";
import Quiz from "@/pages/Quiz";
import Videos from "@/pages/Videos";
import Profile from "@/pages/Profile";
import Premium from "@/pages/Premium";
import Admin from "@/pages/Admin";
import Subjects from "@/pages/Subjects";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "hsl(217 91% 48%)" }}>
            <i className="fa-solid fa-graduation-cap text-white text-lg" />
          </div>
          <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/login/email" component={EmailAuth} />
      <Route path="/register" component={Register} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/summaries" component={() => <ProtectedRoute component={Summaries} />} />
      <Route path="/teacher" component={() => <ProtectedRoute component={TeacherChat} />} />
      <Route path="/topics" component={() => <ProtectedRoute component={Topics} />} />
      <Route path="/ocr" component={() => <ProtectedRoute component={OCR} />} />
      <Route path="/flashcards" component={() => <ProtectedRoute component={Flashcards} />} />
      <Route path="/quiz" component={() => <ProtectedRoute component={Quiz} />} />
      <Route path="/videos" component={() => <ProtectedRoute component={Videos} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/premium" component={() => <ProtectedRoute component={Premium} />} />
      <Route path="/admin"    component={() => <ProtectedRoute component={Admin} />} />
      <Route path="/subjects" component={() => <ProtectedRoute component={Subjects} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
        </ThemeProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
