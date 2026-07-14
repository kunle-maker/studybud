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
import QuizSession from "@/pages/QuizSession";
import Videos from "@/pages/Videos";
import Profile from "@/pages/Profile";
import Premium from "@/pages/Premium";
import Admin from "@/pages/Admin";
import AdminLogin from "@/pages/AdminLogin";
import Subjects from "@/pages/Subjects";
import Roadmaps from "@/pages/Roadmaps";
import RoadmapChapter from "@/pages/RoadmapChapter";
import RoadmapExam from "@/pages/RoadmapExam";
import Assignments from "@/pages/Assignments";
import AssignmentJoin from "@/pages/AssignmentJoin";
import Notifications from "@/pages/Notifications";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function FootballLoader() {
  return (
    <>
      <style>{`
        @keyframes wcLoadBounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes wcLoadFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wcLoadSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5" style={{ animation: "wcLoadFade 0.4s ease-out both" }}>
          <div style={{ animation: "wcLoadBounce 1s ease-in-out infinite" }}>
            <img src="/wc-logo.svg" alt="Loading…" width={60} height={60}
              style={{ animation: "wcLoadSpin 2.4s linear infinite", filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.2))", display: "block" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <FootballLoader />;
  if (!user)   return <Redirect to="/login" />;
  return <Layout><Component /></Layout>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login"                  component={Login} />
      <Route path="/login/email"            component={EmailAuth} />
      <Route path="/login/admin"            component={AdminLogin} />
      <Route path="/register"               component={Register} />
      <Route path="/auth/callback"          component={AuthCallback} />

      <Route path="/"                       component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/summaries"              component={() => <ProtectedRoute component={Summaries} />} />
      <Route path="/teacher"                component={() => <ProtectedRoute component={TeacherChat} />} />
      <Route path="/chat/tutor/:id"         component={() => <ProtectedRoute component={TeacherChat} />} />
      <Route path="/topics"                 component={() => <ProtectedRoute component={Topics} />} />
      <Route path="/ocr"                    component={() => <ProtectedRoute component={OCR} />} />
      <Route path="/flashcards"             component={() => <ProtectedRoute component={Flashcards} />} />
      <Route path="/quiz"                   component={() => <ProtectedRoute component={Quiz} />} />
      <Route path="/quiz/:id"               component={() => <ProtectedRoute component={QuizSession} />} />
      <Route path="/videos"                 component={() => <ProtectedRoute component={Videos} />} />
      <Route path="/profile"                component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/premium"                component={() => <ProtectedRoute component={Premium} />} />
      <Route path="/admin"                  component={() => <ProtectedRoute component={Admin} />} />
      <Route path="/subjects"               component={() => <ProtectedRoute component={Subjects} />} />
      <Route path="/chat/subject/:id"       component={() => <ProtectedRoute component={Subjects} />} />
      <Route path="/roadmaps"               component={() => <ProtectedRoute component={Roadmaps} />} />
      <Route path="/roadmaps/:roadmapId"   component={() => <ProtectedRoute component={Roadmaps} />} />
      <Route path="/roadmaps/:roadmapId/chapter/:lessonId" component={() => <ProtectedRoute component={RoadmapChapter} />} />
      <Route path="/roadmaps/:roadmapId/exam"              component={() => <ProtectedRoute component={RoadmapExam} />} />
      <Route path="/assignments"            component={() => <ProtectedRoute component={Assignments} />} />
      <Route path="/assignment/:id"         component={() => <ProtectedRoute component={Assignments} />} />
      <Route path="/assignments/join/:token" component={AssignmentJoin} />
      <Route path="/notifications"          component={() => <ProtectedRoute component={Notifications} />} />
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
