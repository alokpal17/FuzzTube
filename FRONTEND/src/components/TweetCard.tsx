import { Heart, Repeat2, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { toggleTweetLike, type Tweet } from "@/services/api";

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
        onClick={() => toast.message("Comments UI is demo-only for now.")} 
        className="flex items-center gap-2 hover:text-primary transition-all duration-300 hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </div>
  </div>
  );
};

export default TweetCard;
