import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Mail, Lock } from "lucide-react";
import { loginUser } from "@/services/api";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (localStorage.getItem("auth_token")) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(email, password);
      if (data?.accessToken) {
        localStorage.setItem("auth_token", data.accessToken);
        localStorage.setItem("auth_user", JSON.stringify(data.user));
      }
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch {
      // Error toast is handled by the API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-primary/5 blur-[100px]" />

      <div className="w-full max-w-md animate-fade-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Zap className="h-8 w-8 text-primary glow-text" />
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Pulse<span className="text-primary">Hub</span>
          </span>
        </div>

        {/* Login card */}
        <div className="glass-card rounded-xl p-8">
          <h1 className="text-xl font-semibold text-foreground mb-1">Sign in</h1>
          <p className="text-sm text-muted-foreground mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glow-button w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Don&apos;t have an account? Sign up
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          API:{" "}
          {import.meta.env.VITE_API_BASE_URL?.trim() ||
            (import.meta.env.DEV
              ? "/api/v1 → proxy → http://127.0.0.1:8000"
              : "set VITE_API_BASE_URL for production")}
        </p>
      </div>
    </div>
  );
};

export default Login;
