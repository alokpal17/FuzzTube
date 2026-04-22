import { useState, useEffect, useCallback } from "react";
import { PenSquare, Trash2, Heart, Repeat2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createTweet,
  deleteTweetApi,
  fetchUserTweets,
  getStoredUser,
  type Tweet,
} from "@/services/api";

const MyTweets = () => {
  const [myTweets, setMyTweets] = useState<Tweet[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const user = getStoredUser();

  const load = useCallback(async () => {
    if (!user?._id) {
      setMyTweets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await fetchUserTweets(user._id);
      setMyTweets(list);
    } catch {
      setMyTweets([]);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const tweet = await createTweet(content.trim());
      setMyTweets((prev) => [tweet, ...prev]);
      setContent("");
      setShowCompose(false);
    } catch {
      /* toast from interceptor */
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTweetApi(id);
      setMyTweets((prev) => prev.filter((x) => x.id !== id));
    } catch {
      /* toast from interceptor */
    }
  };

  const initial = user?.fullname?.charAt(0) || user?.username?.charAt(0) || "Y";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">My Tweets</h1>
          <p className="text-sm text-muted-foreground">Compose and manage your tweets</p>
        </div>
        <Button onClick={() => setShowCompose(!showCompose)} className="glow-button gap-2">
          <PenSquare className="h-4 w-4" /> Compose
        </Button>
      </div>

      {showCompose && (
        <div className="glass-card rounded-lg p-6 space-y-4 animate-fade-up">
          <Textarea
            placeholder="What's happening?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={280}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{content.length}/280</span>
            <div className="flex gap-3">
              <Button onClick={handlePost} disabled={!content.trim() || posting}>
                {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tweet"}
              </Button>
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : myTweets.length === 0 && !showCompose ? (
        <div className="glass-card rounded-lg p-12 text-center">
          <PenSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No tweets yet. Compose your first tweet!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myTweets.map((t, i) => (
            <div
              key={t.id}
              className="glass-card rounded-lg p-5 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start gap-3 mb-3">
                {t.avatar ? (
                  <img
                    src={t.avatar}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover shrink-0 border border-border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{t.username}</p>
                      <p className="text-sm text-muted-foreground">@{t.handle}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed mb-3">{t.content}</p>
              <div className="flex items-center gap-6 text-muted-foreground text-sm">
                <span className="flex items-center gap-1.5">
                  <Heart className="h-4 w-4" /> {t.likes}
                </span>
                <span className="flex items-center gap-1.5">
                  <Repeat2 className="h-4 w-4" /> {t.retweets}
                </span>
                <span className="ml-auto text-xs">{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTweets;
