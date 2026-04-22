import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, User, Mail, Lock, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { registerUser } from "@/services/api";

const Register = () => {
  const navigate = useNavigate();
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullname.trim() || !username.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!avatar) {
      toast.error("Avatar image is required");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        fullname: fullname.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        avatar,
        coverImage,
      });
      toast.success("Account created. Please sign in.");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-primary/5 blur-[100px]" />

      <div className="w-full max-w-md animate-fade-up">
        <div className="flex items-center justify-center gap-2 mb-10">
          <Zap className="h-8 w-8 text-primary glow-text" />
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Pulse<span className="text-primary">Hub</span>
          </span>
        </div>

        <div className="glass-card rounded-xl p-8">
          <h1 className="text-xl font-semibold text-foreground mb-1">Create account</h1>
          <p className="text-sm text-muted-foreground mb-8">Register to start posting and watching</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="fullname">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="fullname"
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john"
                  className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="avatar">
                Avatar (required)
              </label>
              <div className="relative">
                <ImagePlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAvatar(e.target.files?.[0] ?? null)}
                  className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="coverImage">
                Cover image (optional)
              </label>
              <input
                id="coverImage"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] ?? null)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-sm text-foreground cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="glow-button w-full rounded-lg py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating…" : "Sign Up"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;

