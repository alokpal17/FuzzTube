import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Video as VideoIcon, MessageSquareText } from "lucide-react";
import Navbar from "@/components/Navbar";
import TweetCard from "@/components/TweetCard";
import VideoCard from "@/components/VideoCard";
import VideoPlayer from "@/components/VideoPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchUserTweets,
  fetchVideos,
  getChannelProfile,
  toggleSubscription,
  type ChannelProfile,
  type Tweet,
  type Video,
} from "@/services/api";

const Channel = () => {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ChannelProfile | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [subBusy, setSubBusy] = useState(false);
  const [tab, setTab] = useState<"videos" | "tweets">("videos");

  const handle = useMemo(() => username.replace(/^@/, "").toLowerCase(), [username]);

  useEffect(() => {
    const load = async () => {
      if (!handle) return;
      setLoading(true);
      try {
        const p = await getChannelProfile(handle);
        setProfile(p);
        const [t, v] = await Promise.all([
          fetchUserTweets(p._id),
          fetchVideos({ userId: p._id, limit: 24 }),
        ]);
        setTweets(t);
        setVideos(v);
      } catch {
        setProfile(null);
        setTweets([]);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [handle]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Channel</h1>
            <p className="text-sm text-muted-foreground">@{handle}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !profile ? (
          <div className="glass-card rounded-lg p-10 text-center text-muted-foreground">
            Channel not found.
          </div>
        ) : (
          <>
            <section className="glass-card rounded-xl overflow-hidden">
              {profile.coverImage ? (
                <div className="h-52 w-full bg-secondary overflow-hidden">
                  <img src={profile.coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-52 w-full bg-secondary" />
              )}
              <div className="p-6 flex items-start gap-4">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt=""
                    className="-mt-14 h-20 w-20 rounded-full object-cover border border-border bg-background"
                  />
                ) : (
                  <div className="-mt-14 h-20 w-20 rounded-full bg-secondary border border-border" />
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-foreground truncate">{profile.fullname}</h2>
                  <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{profile.subscribersCount ?? 0} subscribers</span>
                    <span>{profile.channelSubscribedCount ?? 0} subscribed</span>
                  </div>
                </div>
                <div className="ml-auto">
                  <button
                    type="button"
                    disabled={subBusy}
                    onClick={async () => {
                      if (!profile._id) return;
                      setSubBusy(true);
                      const next = !profile.isSubscribed;
                      setProfile((p) =>
                        p
                          ? {
                              ...p,
                              isSubscribed: next,
                              subscribersCount: Math.max(0, (p.subscribersCount ?? 0) + (next ? 1 : -1)),
                            }
                          : p
                      );
                      try {
                        await toggleSubscription(profile._id);
                      } catch {
                        // revert
                        setProfile((p) =>
                          p
                            ? {
                                ...p,
                                isSubscribed: !next,
                                subscribersCount: Math.max(0, (p.subscribersCount ?? 0) + (next ? -1 : 1)),
                              }
                            : p
                        );
                      } finally {
                        setSubBusy(false);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                      profile.isSubscribed ? "bg-secondary text-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {profile.isSubscribed ? "Unsubscribe" : "Subscribe"}
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <Tabs value={tab} onValueChange={(v) => setTab(v as "videos" | "tweets")}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="text-lg font-semibold text-foreground">Content</h3>
                  <TabsList>
                    <TabsTrigger value="videos" className="gap-2">
                      <VideoIcon className="h-4 w-4" /> Videos
                    </TabsTrigger>
                    <TabsTrigger value="tweets" className="gap-2">
                      <MessageSquareText className="h-4 w-4" /> Tweets
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="videos" className="mt-4">
                  {videos.length === 0 ? (
                    <div className="glass-card rounded-lg p-10 text-center text-muted-foreground">No videos yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {videos.map((v, i) => (
                        <VideoCard key={v.id} video={v} index={i} onClick={() => setSelectedVideo(v)} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="tweets" className="mt-4">
                  {tweets.length === 0 ? (
                    <div className="glass-card rounded-lg p-10 text-center text-muted-foreground">No tweets yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {tweets.map((t, i) => (
                        <TweetCard key={t.id} tweet={t} index={i} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </section>
          </>
        )}
      </main>

      {selectedVideo && <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    </div>
  );
};

export default Channel;

