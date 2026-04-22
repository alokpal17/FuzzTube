import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getCurrentUser,
  getStoredUser,
  updateAvatar,
  updateCoverImage,
  updateProfile,
  type ApiUser,
} from "@/services/api";
import { toast } from "sonner";

const Profile = () => {
  const [user, setUser] = useState<ApiUser | null>(getStoredUser());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullname: "", email: "" });
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(() => {
    const name = user?.fullname || user?.username || "U";
    return name.trim().charAt(0).toUpperCase();
  }, [user?.fullname, user?.username]);

  const syncLocal = (u: ApiUser) => {
    localStorage.setItem("auth_user", JSON.stringify(u));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getCurrentUser();
      setUser(u);
      syncLocal(u);
      setForm({ fullname: u.fullname || "", email: u.email || "" });
    } catch {
      // interceptor handles toast
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    if (!form.fullname.trim() || !form.email.trim()) {
      toast.error("Full name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const u = await updateProfile({ fullname: form.fullname.trim(), email: form.email.trim() });
      setUser(u);
      syncLocal(u);
      toast.success("Profile updated.");
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const onAvatar = async (file: File) => {
    setSaving(true);
    try {
      const u = await updateAvatar(file);
      setUser(u);
      syncLocal(u);
      toast.success("Avatar updated.");
    } finally {
      setSaving(false);
    }
  };

  const onCover = async (file: File) => {
    setSaving(true);
    try {
      const u = await updateCoverImage(file);
      setUser(u);
      syncLocal(u);
      toast.success("Cover updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto p-6 lg:p-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !user ? (
          <div className="glass-card rounded-lg p-10 text-center text-muted-foreground">No profile loaded.</div>
        ) : (
          <>
            <section className="glass-card rounded-xl overflow-hidden">
              <div className="relative h-48 bg-secondary">
                {user.coverImage ? (
                  <img src={user.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" />
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={saving}
                    onClick={() => coverRef.current?.click()}
                    className="backdrop-blur"
                  >
                    Change cover
                  </Button>
                  <input
                    ref={coverRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onCover(f);
                      if (e.currentTarget) e.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>

              <div className="p-6 flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="-mt-14 flex items-end gap-3">
                  <div className="relative">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="h-24 w-24 rounded-full object-cover border border-border bg-background"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-foreground border border-border">
                        {initials}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarRef.current?.click()}
                      disabled={saving}
                      className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      aria-label="Change avatar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <input
                      ref={avatarRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onAvatar(f);
                        if (e.currentTarget) e.currentTarget.value = "";
                      }}
                    />
                  </div>
                  <div className="pb-1">
                    <h1 className="text-2xl font-bold text-foreground">{user.fullname}</h1>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>

                <div className="sm:ml-auto flex gap-2">
                  {!editing ? (
                    <Button variant="secondary" onClick={() => setEditing(true)} disabled={saving}>
                      Edit profile
                    </Button>
                  ) : (
                    <>
                      <Button onClick={onSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditing(false);
                          setForm({ fullname: user.fullname || "", email: user.email || "" });
                        }}
                        disabled={saving}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Account</h2>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Full name</label>
                    <Input
                      value={form.fullname}
                      onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
                      disabled={!editing || saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Email</label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      disabled={!editing || saving}
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Security</h2>
                <p className="text-sm text-muted-foreground">
                  Password changes are supported by the backend endpoint, but the UI is not added yet.
                </p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;

