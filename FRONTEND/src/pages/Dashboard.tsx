import { useState, useEffect } from "react";
import { Twitter, Youtube, TrendingUp, Activity, Search, ThumbsUp } from "lucide-react";
import Navbar from "@/components/Navbar";
import DashboardSidebar, { type Section } from "@/components/DashboardSidebar";
import TweetCard from "@/components/TweetCard";
import VideoCard from "@/components/VideoCard";
import VideoPlayer from "@/components/VideoPlayer";
import SkeletonCard from "@/components/SkeletonCard";
import MyVideos from "@/components/MyVideos";
import MyTweets from "@/components/MyTweets";
import Playlists from "@/components/Playlists";
import { fetchTweets, fetchVideos, fetchChannelStats, type Tweet, type Video, type ChannelStats } from "@/services/api";

const StatCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) => (
  <div className="glass-card-enhanced rounded-xl p-6 flex items-center gap-4 hover-lift group">
    <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${color} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
      <Icon className="h-7 w-7" />
    </div>
    <div className="flex-1">
      <p className="text-3xl font-bold text-foreground tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
    </div>
    <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse" />
  </div>
);

const sectionLabels: { key: Section; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "tweets", label: "Explore Tweets" },
  { key: "my-tweets", label: "My Tweets" },
  { key: "videos", label: "Explore Videos" },
  { key: "my-videos", label: "My Videos" },
  { key: "playlists", label: "Playlists" },
];

const Dashboard = () => {
  const [section, setSection] = useState<Section>("dashboard");
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoSearch, setVideoSearch] = useState("");

  const [stats, setStats] = useState<ChannelStats | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [t, v, s] = await Promise.all([fetchTweets(), fetchVideos(), fetchChannelStats()]);
        setTweets(t);
        setVideos(v);
        setStats(s);
      } catch {
        setTweets([]);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const renderSkeleton = (count: number, variant?: 'tweet' | 'video' | 'stat') =>
    Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} variant={variant} />);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <DashboardSidebar active={section} onNavigate={setSection} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl">
          {/* Mobile tab bar */}
          <div className="flex md:hidden gap-3 mb-8 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            {sectionLabels.map((s) => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`px-5 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 shrink-0 ${
                  section === s.key 
                    ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                    : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Dashboard overview */}
          {section === "dashboard" && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2 text-gradient">Dashboard</h1>
                  <p className="text-base text-muted-foreground">Your social media analytics at a glance</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Live data</span>
                </div>
              </div>
              
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {renderSkeleton(4, 'stat')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <StatCard icon={Activity} label="Subscribers" value={String(stats?.totalSubscribers || 0)} color="bg-primary/10 text-primary" />
                  <StatCard icon={Youtube} label="Total Videos" value={String(stats?.totalVideos || 0)} color="bg-destructive/10 text-destructive" />
                  <StatCard icon={TrendingUp} label="Total Views" value={String(stats?.totalViews || 0)} color="bg-primary/10 text-primary" />
                  <StatCard icon={ThumbsUp} label="Total Likes" value={String(stats?.totalLikes || 0)} color="bg-primary/10 text-primary" />
                </div>
              )}
              
              <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-10">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">Recent Tweets</h2>
                    <button className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">View all</button>
                  </div>
                  <div className="space-y-4">
                    {loading ? renderSkeleton(3, 'tweet') : tweets.slice(0, 3).map((t, i) => <TweetCard key={t.id} tweet={t} index={i} />)}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">Recent Videos</h2>
                    <button className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">View all</button>
                  </div>
                  <div className="space-y-4">
                    {loading
                      ? renderSkeleton(2, 'video')
                      : videos.slice(0, 2).map((v, i) => (
                          <VideoCard key={v.id} video={v} index={i} onClick={() => setSelectedVideo(v)} />
                        ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explore Tweets */}
          {section === "tweets" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Explore Tweets</h1>
                <p className="text-base text-muted-foreground">Discover tweets from users around the world</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {loading ? renderSkeleton(6, 'tweet') : tweets.map((t, i) => <TweetCard key={t.id} tweet={t} index={i} />)}
              </div>
            </div>
          )}

          {/* My Tweets */}
          {section === "my-tweets" && <MyTweets />}

          {/* Explore Videos */}
          {section === "videos" && (
            <div className="space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">Explore Videos</h1>
                  <p className="text-base text-muted-foreground">Watch videos from creators worldwide</p>
                </div>
                <div className="relative w-full lg:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search videos..."
                    value={videoSearch}
                    onChange={(e) => setVideoSearch(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
                  />
                </div>
              </div>
              {(() => {
                const filtered = videos.filter(
                  (v) =>
                    v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
                    v.channel.toLowerCase().includes(videoSearch.toLowerCase())
                );
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {loading
                      ? renderSkeleton(8, 'video')
                      : filtered.length === 0
                        ? (
                          <div className="col-span-full flex flex-col items-center justify-center py-12 sm:py-16">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                              <Search className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                            </div>
                            <p className="text-base sm:text-lg text-muted-foreground font-medium">No videos found</p>
                            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search terms</p>
                          </div>
                        )
                        : filtered.map((v, i) => (
                            <VideoCard key={v.id} video={v} index={i} onClick={() => setSelectedVideo(v)} />
                          ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* My Videos */}
          {section === "my-videos" && <MyVideos />}

          {/* Playlists */}
          {section === "playlists" && <Playlists allVideos={videos} />}
        </main>
      </div>

      {selectedVideo && <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    </div>
  );
};

export default Dashboard;
