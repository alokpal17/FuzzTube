import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  Pause,
  Play,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Captions,
  Settings,
  MonitorSpeaker,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  toggleVideoLike,
  fetchVideoById,
  toggleSubscription,
  getChannelProfile,
  getStoredUser,
  // createCommentNotification,
  type Video,
} from "@/services/api";

const SKIP_SECONDS = 10;
const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type QualityId = "source" | "high" | "medium" | "low";

function isCloudinaryVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("res.cloudinary.com") && u.pathname.includes("/video/upload/");
  } catch {
    return false;
  }
}

function isProbablyTransformSegment(seg: string): boolean {
  if (!seg || seg.includes(".")) return false;
  if (/^v\d+$/.test(seg)) return false;
  return (
    seg.includes(",") ||
    /^(?:w_\d|c_limit|c_scale|c_fill|br_|q_|vs_|fps_|bitrate_|streaming_bitrate_|f_\w)/i.test(seg)
  );
}

/** Insert Cloudinary transformation before the public-id path (`/video/upload/[v#/]TRANSFORM/rest…`). */
function cloudinaryTransformedUrl(originalUrl: string, transformation: string): string | null {
  try {
    const u = new URL(originalUrl);
    const marker = "/video/upload/";
    const markerPos = u.pathname.indexOf(marker);
    if (markerPos === -1) return null;
    const before = u.pathname.slice(0, markerPos + marker.length);
    const rest = u.pathname.slice(markerPos + marker.length);
    const segments = rest.split("/").filter(Boolean);
    let segPos = 0;
    const prefix: string[] = [];
    if (segments[0]?.match(/^v\d+$/)) {
      prefix.push(segments[0]);
      segPos = 1;
    }
    while (segPos < segments.length && isProbablyTransformSegment(segments[segPos])) segPos += 1;
    const publicIdParts = segments.slice(segPos);
    const cleaned = transformation.replace(/^\/+|\/+$/g, "");
    const newSegments = [...prefix, cleaned, ...publicIdParts].filter(Boolean);
    u.pathname = before + newSegments.join("/");
    return u.toString();
  } catch {
    return null;
  }
}

function buildPlaybackSrc(canonicalVideoUrl: string | undefined, quality: QualityId): string {
  if (!canonicalVideoUrl) return "";
  if (quality === "source" || !isCloudinaryVideoUrl(canonicalVideoUrl)) return canonicalVideoUrl;
  const t =
    quality === "high"
      ? "q_auto:best,f_auto"
      : quality === "medium"
        ? "w_960,c_limit,q_auto:good,f_auto"
        : "w_640,c_limit,q_auto:low,f_auto";
  return cloudinaryTransformedUrl(canonicalVideoUrl, t) ?? canonicalVideoUrl;
}

function formatPlaybackClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const pendingSeekAfterSrcRef = useRef<number | null>(null);

  const [canonicalVideoUrl, setCanonicalVideoUrl] = useState(activeVideo.videoUrl);
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [qualityId, setQualityId] = useState<QualityId>("source");
  const [captionTrackIx, setCaptionTrackIx] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playbackSrc = useMemo(
    () => buildPlaybackSrc(canonicalVideoUrl ?? activeVideo.videoUrl, qualityId),
    [canonicalVideoUrl, activeVideo.videoUrl, qualityId]
  );
  const hasQualityMenu = !!(canonicalVideoUrl && isCloudinaryVideoUrl(canonicalVideoUrl));

  useEffect(() => {
    setCanonicalVideoUrl(activeVideo.videoUrl);
    setQualityId("source");
    setCaptionTrackIx(() => {
      const tr = activeVideo.captionsTracks;
      if (!tr?.length) return null;
      const d = tr.findIndex((x) => x.default);
      return d >= 0 ? d : null;
    });
    setPaused(false);
  }, [activeVideo.videoUrl, activeVideo.id, activeVideo.captionsTracks]);

  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }, []);

  const skipBy = useCallback((deltaSeconds: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + deltaSeconds), duration);
  }, [duration]);

  const changeQualityId = useCallback(
    (q: QualityId) => {
      if (q === qualityId) return;
      if (!(canonicalVideoUrl ?? activeVideo.videoUrl)) return;
      const v = videoRef.current;
      if (v) pendingSeekAfterSrcRef.current = v.currentTime;
      setQualityId(q);
    },
    [canonicalVideoUrl, activeVideo.videoUrl, qualityId]
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const syncCaptions = () => {
      const v = videoRef.current;
      if (!v?.textTracks?.length) return;
      const tracks = Array.from(v.textTracks);
      tracks.forEach((track, idx) => {
        track.mode = captionTrackIx !== null && idx === captionTrackIx ? "showing" : "disabled";
      });
    };
    syncCaptions();
    const vid = videoRef.current;
    if (!vid) return;
    vid.addEventListener("loadedmetadata", syncCaptions);
    return () => vid.removeEventListener("loadedmetadata", syncCaptions);
  }, [captionTrackIx, playbackSrc, activeVideo.captionsTracks]);

  useEffect(() => {
    const onFullscreen = () => {
      const el = document.fullscreenElement;
      setIsFullscreen(!!playerShellRef.current && el === playerShellRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, button[role=combobox], [role=slider]"))
        return;
      if (!activeVideo.videoUrl || !playbackSrc) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skipBy(-SKIP_SECONDS);
          break;
        case "ArrowRight":
          e.preventDefault();
          skipBy(SKIP_SECONDS);
          break;
        case "ArrowUp":
          if (volume < 1) {
            e.preventDefault();
            setMuted(false);
            setVolume((prev) => Math.min(1, prev + 0.05));
          }
          break;
        case "ArrowDown":
          if (volume > 0) {
            e.preventDefault();
            setMuted(false);
            setVolume((prev) => Math.max(0, prev - 0.05));
          }
          break;
        case "KeyM":
          e.preventDefault();
          setMuted((m) => !m);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVideo.videoUrl, playbackSrc, togglePlayPause, skipBy, volume]);

  const toggleFullscreen = useCallback(async () => {
    const el = playerShellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* fullscreen may fail in insecure contexts */
    }
  }, []);

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
    // TODO: call your actual API to save comment
    // await addComment(activeVideo.id, comment.trim())

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
    console.error("Failed to post comment:", error);
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

        {/* ── Video area (custom controls) ── */}
        <div ref={playerShellRef} data-player-shell className="relative bg-black w-full aspect-video group">
          {playbackSrc ? (
            <>
              <video
                key={playbackSrc}
                ref={videoRef}
                src={playbackSrc}
                poster={activeVideo?.thumbnail || ""}
                playsInline
                autoPlay
                className="w-full h-full object-contain bg-black cursor-pointer outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                onPlay={() => setPaused(false)}
                onPause={() => setPaused(true)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => {
                  const el = e.currentTarget;
                  setDuration(Number.isFinite(el.duration) ? el.duration : 0);
                  const pend = pendingSeekAfterSrcRef.current;
                  if (pend != null) {
                    el.currentTime = pend;
                    pendingSeekAfterSrcRef.current = null;
                  }
                }}
                onEnded={() => setPaused(true)}
              >
                {activeVideo.captionsTracks?.map((c, ix) => (
                  <track
                    key={`${c.srclang}-${ix}-${c.src.slice(0, 40)}`}
                    kind="captions"
                    src={c.src}
                    srcLang={c.srclang}
                    label={c.label}
                  />
                ))}
              </video>

              {paused && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <button
                    type="button"
                    aria-label="Play"
                    className="pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/95 text-primary-foreground shadow-xl shadow-black/60 transition hover:scale-105"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                  >
                    <Play className="h-10 w-10 ml-1 fill-current" />
                  </button>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/55 to-transparent pt-14 pb-2 opacity-95 transition-opacity group-hover:opacity-100">
                <div className="px-3 sm:px-4 pb-1">
                  <Slider
                    className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                    max={duration > 0 ? duration : 1}
                    step={duration > 30 ? 0.01 : 0.1}
                    value={[Math.min(currentTime, duration > 0 ? duration : Math.max(currentTime, 1))]}
                    onValueChange={(vals) => {
                      const v = vals[0];
                      if (videoRef.current) videoRef.current.currentTime = v;
                      setCurrentTime(v);
                    }}
                  />
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/80 font-medium tabular-nums">
                    <span>{formatPlaybackClock(currentTime)}</span>
                    <span>/</span>
                    <span>{formatPlaybackClock(duration)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-2 sm:px-3 pb-2 text-white" data-player-controls>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition"
                    aria-label={paused ? "Play" : "Pause"}
                  >
                    {paused ? <Play className="h-4 w-4 fill-current ml-px" /> : <Pause className="h-4 w-4" />}
                  </button>

                  <button
                    type="button"
                    title={`Back ${SKIP_SECONDS}s`}
                    onClick={(e) => {
                      e.stopPropagation();
                      skipBy(-SKIP_SECONDS);
                    }}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                    aria-label={`Rewind ${SKIP_SECONDS} seconds`}
                  >
                    <Rewind className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    title={`Forward ${SKIP_SECONDS}s`}
                    onClick={(e) => {
                      e.stopPropagation();
                      skipBy(SKIP_SECONDS);
                    }}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                    aria-label={`Forward ${SKIP_SECONDS} seconds`}
                  >
                    <FastForward className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMuted((m) => !m);
                    }}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                    aria-label={muted ? "Unmute" : "Mute"}
                    title={muted ? "Unmute (M)" : "Mute (M)"}
                  >
                    {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>

                  <div data-player-volume-zone className="hidden sm:flex w-24 lg:w-32 items-center pr-2">
                    <Slider
                      className="w-full [&_[role=slider]]:h-2.5 [&_[role=slider]]:w-2.5 [&_.bg-primary]:bg-white"
                      max={100}
                      step={2}
                      value={[muted ? 0 : Math.round(volume * 100)]}
                      onValueChange={(vals) => {
                        setMuted(false);
                        setVolume(vals[0] / 100);
                      }}
                      aria-label="Volume"
                    />
                  </div>

                  <div className="flex-1 min-w-[8px]" aria-hidden />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        title="Caption settings"
                        className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition ${captionTrackIx !== null ? "text-primary" : ""}`}
                        aria-label="Captions"
                      >
                        <Captions className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-[#1a1a1a] border-white/10 text-white z-[110]">
                      <DropdownMenuLabel className="text-white/90">Captions</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/15" />
                      <DropdownMenuRadioGroup
                        value={captionTrackIx === null ? "__off__" : String(captionTrackIx)}
                        onValueChange={(val) =>
                          val === "__off__" ? setCaptionTrackIx(null) : setCaptionTrackIx(parseInt(val, 10))
                        }
                      >
                        <DropdownMenuRadioItem value="__off__" className="text-white focus:bg-white/10 focus:text-white">
                          Off
                        </DropdownMenuRadioItem>
                        {activeVideo.captionsTracks?.map((tr, ix) => (
                          <DropdownMenuRadioItem
                            key={`${ix}-${tr.srclang}`}
                            value={String(ix)}
                            className="text-white focus:bg-white/10 focus:text-white"
                          >
                            {tr.label || tr.srclang}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      {!activeVideo.captionsTracks?.length ? (
                        <p className="px-3 pt-2 pb-1 text-xs text-white/50 leading-snug border-t border-white/10 mt-1">
                          No caption files on this video yet. Serve WebVTT (.vtt) URLs from your API via{" "}
                          <span className="text-white/70">captionsTracks</span> to enable subtitles here.
                        </p>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        title="Playback settings"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                        aria-label="Playback settings"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-white/10 text-white z-[110]">
                      <DropdownMenuLabel className="text-white/90 flex items-center gap-2">
                        <MonitorSpeaker className="h-4 w-4" />
                        Audio &amp; quality
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/15" />
                      <div className="px-2 pb-3 pt-1 space-y-2">
                        <p className="text-[11px] uppercase tracking-wide text-white/50">Volume</p>
                        <Slider
                          max={100}
                          step={2}
                          value={[muted ? 0 : Math.round(volume * 100)]}
                          onValueChange={(vals) => {
                            setMuted(false);
                            setVolume(vals[0] / 100);
                          }}
                          className="[&_[role=slider]]:w-3 [&_[role=slider]]:h-3"
                        />
                      </div>
                      <DropdownMenuSeparator className="bg-white/15" />
                      <DropdownMenuLabel className="text-white/90">Quality</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={qualityId}
                        onValueChange={(v) => changeQualityId(v as QualityId)}
                      >
                        <DropdownMenuRadioItem
                          value="source"
                          className="text-white focus:bg-white/10 focus:text-white"
                        >
                          Original (best)
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="high" disabled={!hasQualityMenu} className="text-white focus:bg-white/10 focus:text-white">
                          High · lower bandwidth
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem
                          value="medium"
                          disabled={!hasQualityMenu}
                          className="text-white focus:bg-white/10 focus:text-white"
                        >
                          Medium 960p capped
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="low" disabled={!hasQualityMenu} className="text-white focus:bg-white/10 focus:text-white">
                          Low · data saver
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                      {!hasQualityMenu && (
                        <p className="px-3 pb-2 pt-1 text-[11px] text-white/50">
                          Quality ladders apply to Cloudinary URLs only; other hosts use single stream.
                        </p>
                      )}
                      <DropdownMenuSeparator className="bg-white/15" />
                      <DropdownMenuLabel className="text-white/90">Speed</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={String(playbackRate)}
                        onValueChange={(val) => setPlaybackRate(parseFloat(val))}
                      >
                        {PLAYBACK_RATES.map((r) => (
                          <DropdownMenuRadioItem
                            key={`s-${r}`}
                            value={String(r)}
                            className="text-white focus:bg-white/10 focus:text-white"
                          >
                            {r === 1 ? "Normal (1×)" : `${r}×`}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void toggleFullscreen();
                    }}
                    className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                    aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <img
                src={activeVideo?.thumbnail || ""}
                alt={activeVideo?.title || "Video"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "";
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="h-20 w-20 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30 opacity-75">
                  <Play className="h-9 w-9 text-primary-foreground ml-1 fill-current" />
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
