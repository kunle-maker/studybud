import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";

export default function AssignmentJoin() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"joining" | "success" | "error">("joining");
  const [message, setMessage] = useState("");
  const [assignmentId, setAssignmentId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      // Redirect to login; after auth the user can come back via the share link
      setLocation(`/login?redirect=/assignments/join/${token}`);
      return;
    }

    const join = async () => {
      try {
        const { data } = await api.post(`/assignments/join/${token}`);
        const id = data.data?.assignment?._id || data.data?._id;
        setAssignmentId(id || null);
        setStatus("success");
        setMessage("You've successfully joined the assignment!");
        // Auto-redirect after a short moment
        if (id) {
          setTimeout(() => setLocation("/assignments"), 1800);
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || "Invalid or expired share link.";
        setStatus("error");
        setMessage(msg);
      }
    };

    join();
  }, [authLoading, user, token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #0047cc 0%, #0066f5 45%, #5b21b6 100%)" }}>
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)" }}>
          <i className={`fa-solid ${
            status === "joining" ? "fa-spinner fa-spin" :
            status === "success" ? "fa-circle-check text-emerald-300" :
            "fa-circle-exclamation text-red-300"
          } text-2xl text-white`} />
        </div>

        <div className="rounded-2xl p-8 space-y-4"
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(28px)" }}>
          <h1 className="text-xl font-bold text-white">
            {status === "joining" ? "Joining assignment…" :
             status === "success" ? "You're in!" :
             "Couldn't join"}
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{message}</p>

          {status === "success" && (
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Redirecting you to assignments…
            </div>
          )}

          {status !== "joining" && (
            <button
              onClick={() => setLocation("/assignments")}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
            >
              <i className="fa-solid fa-clipboard-list mr-2" />
              Go to Assignments
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
