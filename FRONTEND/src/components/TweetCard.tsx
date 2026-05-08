import { Heart, Repeat2, MessageCircle, Loader2, Trash2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  addTweetComment,
  deleteTweetCommentApi,
  fetchTweetComments,
  getStoredUser,
  toggleTweetLike,
  type Tweet,
  type TweetComment,
} from "@/services/api";

interface TweetCardProps {
  tweet: Tweet;
  index: number;
}

/** Individual tweet card with glassmorphism styling */
const TweetCard = ({ tweet, index }: TweetCardProps) => {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(tweet.likes);
  const [reposted, setReposted] = useState(false);
  const [reposts, setReposts] = useState(tweet.retweets);
  const [busy, setBusy] = useState(false);
  const currentUser = getStoredUser();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<TweetComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const authorPath = useMemo(() => `/channel/${tweet.handle}`, [tweet.handle]);
  const repostKey = useMemo(() => `reposted:${tweet.id}`, [tweet.id]);

  useEffect(() => {
    setLiked(Boolean(tweet.isLiked));
  }, [tweet.isLiked]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(repostKey) === "1";
      setReposted(saved);
      if (saved) {
        setReposts((n) => n + 1);
      }
    } catch {
      // ignore
    }
  }, [repostKey]);

  const handleLike = async () => {
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      await toggleTweetLike(tweet.id);
    } catch {
      // revert on failure
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  const handleRepost = () => {
    const next = !reposted;
    setReposted(next);
    setReposts((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      localStorage.setItem(repostKey, next ? "1" : "0");
    } catch {
      // ignore
    }
    toast.message(next ? "Reposted (local-only)." : "Repost removed (local-only).");
  };

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const list = await fetchTweetComments(tweet.id, { page: 1, limit: 50 });
      setComments(list);
    } catch {
      // toast handled by interceptor
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  const toggleComments = async () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && comments.length === 0 && !commentsLoading) {
      await loadComments();
    }
  };

  const handleAddComment = async () => {
    if (commentBusy) return;
    const content = commentText.trim();
    if (!content) return;
    setCommentBusy(true);
    try {
      const created = await addTweetComment(tweet.id, content);
      setComments((prev) => [created, ...prev]);
      setCommentText("");
    } catch {
      // toast handled by interceptor
    } finally {
      setCommentBusy(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteTweetCommentApi(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      // toast handled by interceptor
    }
  };

  return (
    <div
      className="glass-card-enhanced rounded-xl p-6 transition-all duration-500 hover:border-primary/30 animate-fade-up group hover-lift"
      style={{ animationDelay: `${index * 100}ms` }}
    >
    {/* Header: avatar + user info */}
    <div className="flex items-start gap-4 mb-4">
      {tweet.avatar ? (
        <img
          src={tweet.avatar}
          alt=""
          className="h-12 w-12 rounded-full object-cover shrink-0 border-2 border-border transition-all duration-300 group-hover:scale-105 group-hover:border-primary/50"
        />
      ) : (
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 border-2 border-border transition-all duration-300 group-hover:scale-105 group-hover:border-primary/50">
          {tweet.username.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => navigate(authorPath)}
          className="font-semibold text-foreground truncate hover:text-primary transition-colors duration-300 text-left text-base"
        >
          {tweet.username}
        </button>
        <button
          type="button"
          onClick={() => navigate(authorPath)}
          className="block text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 text-left"
        >
          @{tweet.handle}
        </button>
      </div>
      <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap font-medium">{tweet.date}</span>
    </div>

    {/* Content */}
    <p className="text-sm text-foreground/90 leading-relaxed mb-6 group-hover:text-foreground transition-colors duration-300">{tweet.content}</p>

    {/* Engagement stats */}
    <div className="flex items-center gap-8 text-muted-foreground text-sm">
      <button
        type="button"
        onClick={handleLike}
        disabled={busy}
        className={`flex items-center gap-2 transition-all duration-300 disabled:opacity-50 hover:scale-105 ${
          liked ? "text-primary" : "hover:text-primary"
        }`}
      >
        <Heart className={`h-5 w-5 transition-all duration-300 ${liked ? 'fill-current scale-110' : ''}`} /> 
        <span className="font-medium">{likes}</span>
      </button>
      <button 
        type="button" 
        onClick={handleRepost} 
        className="flex items-center gap-2 hover:text-primary transition-all duration-300 hover:scale-105"
      >
        <Repeat2 className={`h-5 w-5 transition-all duration-300 ${reposted ? 'fill-current scale-110' : ''}`} /> 
        <span className="font-medium">{reposts}</span>
      </button>
      <button 
        type="button" 
        onClick={toggleComments}
        className="flex items-center gap-2 hover:text-primary transition-all duration-300 hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium">{comments.length}</span>
      </button>
    </div>

    {/* Comments panel */}
    {commentsOpen && (
      <div className="mt-5 border-t border-border/40 pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Comments</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadComments}
            disabled={commentsLoading}
            className="h-8 px-2"
          >
            {commentsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {/* Add comment */}
        <div className="space-y-2">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment…"
            className="min-h-[72px] resize-none"
            maxLength={280}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{commentText.length}/280</span>
            <Button onClick={handleAddComment} disabled={!commentText.trim() || commentBusy} className="gap-2">
              {commentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post
            </Button>
          </div>
        </div>

        {/* Comments list */}
        {commentsLoading && comments.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No comments yet.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => {
              const name = c.owner?.fullName || c.owner?.username || "User";
              const canDelete = currentUser?._id && String(currentUser._id) === String(c.owner?._id);
              return (
                <div key={c.id} className="flex items-start gap-3">
                  {c.owner?.avatar ? (
                    <img src={c.owner.avatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0 border border-border" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0 border border-border">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{c.owner?.username || "user"}</p>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-destructive hover:text-destructive/80 transition-colors"
                          aria-label="Delete comment"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}
  </div>
  );
};

export default TweetCard;
