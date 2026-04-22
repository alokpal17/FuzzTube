import { useState, useMemo, useEffect, useRef } from "react";
import {
  X,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Send,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Bell,
  Flag,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  toggleVideoLike,
  fetchVideoById,
  toggleSubscription,
  getChannelProfile,
  getStoredUser,
  createCommentNotification,
  type Video,
} from "@/services/api";

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

interface CommentItem {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  time: string;
  likes: number;
  liked: boolean;
}

const AVATAR_COLORS = [
  "bg-violet-600",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-pink-600",
  "bg-cyan-600",
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const VideoPlayer = ({ video, onClose }: VideoPlayerProps) => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [disliked, setDisliked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [channelAvatar, setChannelAvatar] = useState<string | undefined>();
  const [activeVideo, setActiveVideo] = useState<Video>(video);
  const [descExpanded, setDescExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [likeBusy, setLikeBusy] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const channelPath = useMemo(() => `/channel/${activeVideo?.channel || 'unknown'}`, [activeVideo?.channel]);

  // Close "more" menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Fetch full video data (records view)
  useEffect(() => {
    if (video.id) {
      fetchVideoById(video.id)
        .then((v) => {
          setActiveVideo(v);
        })
        .catch(console.error);
    }
  }, [video.id]);

  // Fetch channel profile for avatar & subscriber count
  useEffect(() => {
    if (!activeVideo.channel) return;
    getChannelProfile(activeVideo.channel)
      .then((ch) => {
        setChannelId(ch._id);
        setSubscriberCount(ch.subscribersCount ?? null);
        setChannelAvatar(ch.avatar);
        setSubscribed(ch.isSubscribed ?? false);
      })
      .catch(() => {});
  }, [activeVideo.channel]);

  const handleLike = async () => {
    if (likeBusy) return;
    setLikeBusy(true);
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    if (disliked) setDisliked(false);
    try {
      await toggleVideoLike(activeVideo.id);
    } catch {
      setLiked(!next);
      setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
    } finally {
      setLikeBusy(false);
    }
  };

  const handleDislike = () => {
    setDisliked(!disliked);
    if (liked) {
      setLiked(false);
      setLikeCount((n) => Math.max(0, n - 1));
    }
  };

  const handleSubscribe = async () => {
    if (!channelId || subLoading) return;
    setSubLoading(true);
    const next = !subscribed;
    setSubscribed(next);
    setSubscriberCount((n) => (n != null ? Math.max(0, n + (next ? 1 : -1)) : null));
    try {
      await toggleSubscription(channelId);
      toast.success(next ? "Subscribed!" : "Unsubscribed");
    } catch {
      setSubscribed(!next);
      setSubscriberCount((n) => (n != null ? Math.max(0, n + (next ? -1 : 1)) : null));
    } finally {
      setSubLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      // Create notification for video owner (if commenter is not the owner)
      if (currentUser && activeVideo.channel !== currentUser.username) {
        try {
          await createCommentNotification(activeVideo.id || '', comment.trim());
        } catch (notifError) {
          console.log('Notification API not available:', notifError);
          // Comment still works even if notification fails
        }
      }
      
      const newComment: CommentItem = {
        id: Date.now().toString(),
        user: currentUser?.fullname || currentUser?.username || "You",
        avatar: currentUser?.avatar,
        text: comment.trim(),
        time: "Just now",
        likes: 0,
        liked: false,
      };
      setComments((prev) => [newComment, ...prev]);
      setComment("");
    } catch (error) {
      console.error('Failed to post comment:', error);
      // Still add the comment locally even if notification fails
      const newComment: CommentItem = {
        id: Date.now().toString(),
        user: currentUser?.fullname || currentUser?.username || "You",
        avatar: currentUser?.avatar,
        text: comment.trim(),
        time: "Just now",
        likes: 0,
        liked: false,
      };
      setComments((prev) => [newComment, ...prev]);
      setComment("");
    }
  };

  const handleCommentLike = (id: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, liked: !c.liked, likes: Math.max(0, c.likes + (c.liked ? -1 : 1)) }
          : c
      )
    );
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    toast.success("Link copied to clipboard");
  };

  const isOwnChannel = currentUser?.username === activeVideo.channel;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/85 backdrop-blur-md overflow-y-auto py-4 px-2"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Video player"
    >
      {/* Main container — stops click propagation */}
      <div
        className="relative w-full max-w-6xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0f0f0f] animate-fade-up"
        style={{ marginTop: "env(safe-area-inset-top, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 h-9 w-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          aria-label="Close video player"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ── Video area ── */}
        <div className="relative bg-black w-full aspect-video">
          {activeVideo?.videoUrl ? (
            <video
              src={activeVideo.videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full"
              poster={activeVideo?.thumbnail || ''}
            />
          ) : (
            <>
              <img
                src={activeVideo?.thumbnail || ''}
                alt={activeVideo?.title || 'Video'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '';
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="h-20 w-20 rounded-full bg-primary/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                  <svg className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Info panel ── */}
        <div className="p-5 lg:p-6 space-y-4 bg-[#0f0f0f]">

          {/* Title */}
          <h1 className="text-base sm:text-lg font-bold text-white leading-snug pr-8">
            {activeVideo?.title || 'Untitled Video'}
          </h1>

          {/* Channel row + action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

            {/* Channel info */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <button
                type="button"
                onClick={() => navigate(channelPath)}
                aria-label={`Go to ${activeVideo.channel}'s channel`}
              >
                {channelAvatar ? (
                  <img
                    src={channelAvatar}
                    alt={activeVideo.channel}
                    className="h-10 w-10 rounded-full object-cover border-2 border-white/10 hover:border-primary/60 transition-colors"
                  />
                ) : (
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getColor(activeVideo.channel)} border-2 border-white/10`}
                  >
                    {activeVideo.channel.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* Name & subs */}
              <div>
                <button
                  type="button"
                  onClick={() => navigate(channelPath)}
                  className="font-semibold text-white text-sm hover:text-primary transition-colors text-left"
                >
                  {activeVideo.channel}
                </button>
                {subscriberCount != null && (
                  <p className="text-xs text-gray-400">
                    {fmtCount(subscriberCount)} subscribers
                  </p>
                )}
              </div>

              {/* Subscribe button */}
              {!isOwnChannel && (
                <button
                  onClick={handleSubscribe}
                  disabled={subLoading}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all disabled:opacity-60 ${
                    subscribed
                      ? "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                      : "bg-white text-black hover:bg-gray-200"
                  }`}
                >
                  {subscribed ? (
                    <>
                      <Bell className="h-4 w-4" />
                      Subscribed
                    </>
                  ) : (
                    "Subscribe"
                  )}
                </button>
              )}
            </div>

            {/* Interaction buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Like / Dislike pill */}
              <div className="flex items-center rounded-full bg-white/10 border border-white/10 overflow-hidden">
                <button
                  onClick={handleLike}
                  disabled={likeBusy}
                  aria-label={liked ? "Unlike" : "Like"}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all disabled:opacity-50 border-r border-white/10 ${
                    liked ? "text-primary bg-primary/20" : "text-white hover:bg-white/10"
                  }`}
                >
                  <ThumbsUp className={`h-4 w-4 ${liked ? "fill-primary stroke-primary" : ""}`} />
                  {likeCount > 0 ? fmtCount(likeCount) : "Like"}
                </button>
                <button
                  onClick={handleDislike}
                  aria-label={disliked ? "Remove dislike" : "Dislike"}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-all ${
                    disliked ? "text-red-400 bg-red-400/10" : "text-white hover:bg-white/10"
                  }`}
                >
                  <ThumbsDown className={`h-4 w-4 ${disliked ? "fill-red-400 stroke-red-400" : ""}`} />
                </button>
              </div>

              {/* Share */}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-medium hover:bg-white/20 transition-all"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>

              {/* More options */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="More options"
                  className="h-9 w-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl z-30 overflow-hidden animate-fade-up">
                    <button
                      type="button"
                      onClick={() => { toast.message("Report submitted (demo)."); setShowMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors text-left"
                    >
                      <Flag className="h-4 w-4" />
                      Report
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Description box ── */}
          <div className="rounded-xl bg-white/5 border border-white/8 p-4 cursor-pointer select-none" onClick={() => setDescExpanded(!descExpanded)}>
            {/* Meta line */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-semibold text-white">{activeVideo.views}</span>
              <span className="text-sm text-gray-400">{activeVideo.date}</span>
            </div>
            <p
              className={`text-sm text-gray-300 whitespace-pre-wrap leading-relaxed transition-all ${
                descExpanded ? "" : "line-clamp-2"
              }`}
            >
              {activeVideo.description || "No description provided."}
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-white flex items-center gap-1 hover:text-primary transition-colors"
              onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
            >
              {descExpanded ? (
                <><ChevronUp className="h-3.5 w-3.5" />Show less</>
              ) : (
                <><ChevronDown className="h-3.5 w-3.5" />Show more</>
              )}
            </button>
          </div>

          {/* ── Comments ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-white">
                {comments.length > 0 ? `${comments.length} Comment${comments.length !== 1 ? "s" : ""}` : "Comments"}
              </h2>
            </div>

            {/* Add comment */}
            <div className="flex items-start gap-3">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/10" />
              ) : (
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getColor(currentUser?.fullname || "U")}`}>
                  {(currentUser?.fullname || currentUser?.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent border-b border-white/20 focus:border-primary pb-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors"
                />
                {comment.trim() && (
                  <button
                    onClick={handleAddComment}
                    className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition shrink-0"
                    aria-label="Post comment"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Comment list */}
            {comments.length > 0 && (
              <div className="space-y-5 max-h-64 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    {c.avatar ? (
                      <img src={c.avatar} alt="" className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/10" />
                    ) : (
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${getColor(c.user)}`}>
                        {c.user.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-white">{c.user}</span>
                        <span className="text-xs text-gray-500">{c.time}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed break-words">{c.text}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <button
                          type="button"
                          onClick={() => handleCommentLike(c.id)}
                          className={`flex items-center gap-1 text-xs transition-colors ${c.liked ? "text-primary" : "text-gray-500 hover:text-white"}`}
                          aria-label="Like comment"
                        >
                          <ThumbsUp className={`h-3.5 w-3.5 ${c.liked ? "fill-primary" : ""}`} />
                          {c.likes > 0 && c.likes}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {comments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-10 w-10 text-white/20 mb-2" />
                <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
