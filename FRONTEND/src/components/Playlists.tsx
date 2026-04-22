import { useState, useEffect, useCallback } from "react";
import { Plus, Play, Trash2, ListVideo, ChevronRight, Eye, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoPlayer from "@/components/VideoPlayer";
import {
  addVideoToPlaylistApi,
  createPlaylistApi,
  deletePlaylistApi,
  fetchPlaylistDetail,
  fetchUserPlaylists,
  getStoredUser,
  removeVideoFromPlaylistApi,
  type PlaylistSummary,
  type Video,
} from "@/services/api";

interface PlaylistsProps {
  allVideos: Video[];
}

const Playlists = ({ allVideos }: PlaylistsProps) => {
  const user = getStoredUser();
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [openPlaylist, setOpenPlaylist] = useState<PlaylistSummary | null>(null);
  const [openVideos, setOpenVideos] = useState<Video[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddVideos, setShowAddVideos] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [mutating, setMutating] = useState(false);

  const loadPlaylists = useCallback(async () => {
    if (!user?._id) {
      setPlaylists([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      const list = await fetchUserPlaylists(user._id);
      setPlaylists(list);
    } catch {
      setPlaylists([]);
    } finally {
      setListLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  const openDetail = async (pl: PlaylistSummary) => {
    setOpenPlaylist(pl);
    setDetailLoading(true);
    setOpenVideos([]);
    try {
      const { summary, videos } = await fetchPlaylistDetail(pl.id);
      setOpenPlaylist(summary);
      setOpenVideos(videos);
    } catch {
      setOpenPlaylist(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const created = await createPlaylistApi(newName.trim(), "");
      setPlaylists((prev) => [created, ...prev]);
      setNewName("");
      setShowCreate(false);
    } catch {
      /* toast */
    } finally {
      setCreating(false);
    }
  };

  const addToPlaylist = async (video: Video) => {
    if (!openPlaylist) return;
    setMutating(true);
    try {
      const videos = await addVideoToPlaylistApi(openPlaylist.id, video.id);
      setOpenVideos(videos);
      await loadPlaylists();
    } catch {
      /* toast */
    } finally {
      setMutating(false);
    }
  };

  const removeFromPlaylist = async (videoId: string) => {
    if (!openPlaylist) return;
    setMutating(true);
    try {
      const videos = await removeVideoFromPlaylistApi(openPlaylist.id, videoId);
      setOpenVideos(videos);
      await loadPlaylists();
    } catch {
      /* toast */
    } finally {
      setMutating(false);
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      await deletePlaylistApi(id);
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      if (openPlaylist?.id === id) {
        setOpenPlaylist(null);
        setOpenVideos([]);
      }
    } catch {
      /* toast */
    }
  };

  if (openPlaylist) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setOpenPlaylist(null);
              setShowAddVideos(false);
              loadPlaylists();
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-1">{openPlaylist.name}</h1>
            <p className="text-sm text-muted-foreground">
              {detailLoading ? "Loading…" : `${openVideos.length} video${openVideos.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAddVideos(!showAddVideos)}
            className="gap-2"
            disabled={mutating}
          >
            <Plus className="h-4 w-4" /> Add Videos
          </Button>
        </div>

        {showAddVideos && (
          <div className="glass-card rounded-lg p-5 space-y-3 animate-fade-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Select videos to add</h3>
              <button
                type="button"
                onClick={() => setShowAddVideos(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {allVideos
                .filter((v) => !openVideos.find((pv) => pv.id === v.id))
                .map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => addToPlaylist(v)}
                    disabled={mutating}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors text-left disabled:opacity-50"
                  >
                    <img src={v.thumbnail} alt={v.title} className="w-16 h-10 object-cover rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{v.channel}</p>
                    </div>
                    <Plus className="h-4 w-4 text-primary shrink-0" />
                  </button>
                ))}
              {allVideos.filter((v) => !openVideos.find((pv) => pv.id === v.id)).length === 0 && (
                <p className="col-span-full text-xs text-muted-foreground text-center py-4">
                  All videos already added
                </p>
              )}
            </div>
          </div>
        )}

        {detailLoading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : openVideos.length === 0 ? (
          <div className="glass-card rounded-lg p-12 text-center">
            <ListVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">This playlist is empty. Add some videos!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openVideos.map((v, i) => (
              <div
                key={v.id}
                className="glass-card rounded-lg p-3 flex items-center gap-4 animate-fade-up group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="text-xs text-muted-foreground w-6 text-center font-medium">{i + 1}</span>
                <div
                  className="relative w-28 aspect-video bg-secondary rounded overflow-hidden cursor-pointer shrink-0"
                  onClick={() => setSelectedVideo(v)}
                >
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-background/0 group-hover:bg-background/30 transition-all">
                    <Play className="h-6 w-6 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{v.title}</h3>
                  <p className="text-xs text-muted-foreground">{v.channel}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" /> {v.views}
                    </span>
                    <span>{v.duration}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromPlaylist(v.id)}
                  disabled={mutating}
                  className="text-destructive hover:text-destructive/80 transition-colors shrink-0 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedVideo && <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Playlists</h1>
          <p className="text-sm text-muted-foreground">Organize your favorite videos into playlists</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="glow-button gap-2">
          <Plus className="h-4 w-4" /> New Playlist
        </Button>
      </div>

      {showCreate && (
        <div className="glass-card rounded-lg p-5 flex gap-3 animate-fade-up flex-wrap">
          <Input
            placeholder="Playlist name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 min-w-[200px]"
          />
          <Button onClick={handleCreate} disabled={!newName.trim() || creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
          <Button variant="outline" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
        </div>
      )}

      {listLoading ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : playlists.length === 0 && !showCreate ? (
        <div className="glass-card rounded-lg p-12 text-center">
          <ListVideo className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No playlists yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl, i) => (
            <div
              key={pl.id}
              className="glass-card rounded-lg overflow-hidden animate-fade-up group"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => openDetail(pl)}
              >
                <div className="relative aspect-video bg-secondary">
                  <div className="w-full h-full flex items-center justify-center">
                    <ListVideo className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="absolute inset-y-0 right-0 w-24 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                    <span className="text-lg font-bold text-foreground">{pl.videoIds.length}</span>
                    <ListVideo className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{pl.name}</h3>
                    <p className="text-xs text-muted-foreground">{pl.createdAt}</p>
                  </div>
                </div>
              </button>
              <div className="px-4 pb-4 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePlaylist(pl.id);
                  }}
                  className="text-destructive hover:text-destructive/80 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Playlists;
