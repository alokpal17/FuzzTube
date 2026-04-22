import { useState, useEffect, useCallback, useRef } from "react";
import { Upload, Play, Trash2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import VideoPlayer from "@/components/VideoPlayer";
import UploadProgress from "@/components/UploadProgress";
import {
  deleteVideoApi,
  fetchDashboardVideos,
  getStoredUser,
  publishVideo,
  type Video,
} from "@/services/api";

const MyVideos = () => {
  const user = getStoredUser();
  const [myVideos, setMyVideos] = useState<Video[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    file: File;
    thumbnail?: File;
    title: string;
    description: string;
  } | null>(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const channel = user?.username || "You";
      const list = await fetchDashboardVideos(channel);
      setMyVideos(list);
    } catch {
      setMyVideos([]);
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = () => {
    if (!form.title.trim()) {
      toast.error("Please enter a video title.");
      return;
    }
    const videoFile = videoInputRef.current?.files?.[0];
    const thumbnail = thumbInputRef.current?.files?.[0];
    if (!videoFile) {
      toast.error("Please select a video file.");
      return;
    }
    if (!thumbnail) {
      toast.error("Please select a thumbnail image.");
      return;
    }

    // Validate video file type
    const supportedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedExtensions = ['.mp4', '.webm', '.mov'];
    const fileExtension = videoFile.name.toLowerCase().substring(videoFile.name.lastIndexOf('.'));
    
    if (!supportedVideoTypes.includes(videoFile.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error("Unsupported video format. Please use MP4, WebM, or MOV files.");
      return;
    }

    // Validate thumbnail file type
    const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedImageTypes.includes(thumbnail.type)) {
      toast.error("Unsupported image format. Please use JPEG, PNG, or WebP files.");
      return;
    }

    // Check file size (max 200MB for video, 10MB for thumbnail)
    const maxVideoSize = 200 * 1024 * 1024; // 200MB
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    
    if (videoFile.size > maxVideoSize) {
      toast.error("Video file is too large. Maximum size is 200MB.");
      return;
    }
    
    if (thumbnail.size > maxImageSize) {
      toast.error("Thumbnail file is too large. Maximum size is 10MB.");
      return;
    }

    // Start upload progress
    setUploadProgress({
      file: videoFile,
      thumbnail,
      title: form.title.trim(),
      description: form.description.trim() || "—"
    });
    setUploading(true);
  };

  const handleUploadComplete = async () => {
    if (!uploadProgress) return;
    
    try {
      const created = await publishVideo({
        title: uploadProgress.title,
        description: uploadProgress.description,
        videoFile: uploadProgress.file,
        thumbnail: uploadProgress.thumbnail!,
      });
      
      // Check if the response is valid before adding to state
      if (created && created.id) {
        setMyVideos((prev) => [created, ...prev]);
        toast.success("Video uploaded successfully!");
      } else {
        toast.error("Upload failed: Invalid response from server");
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Error toast will be shown by the interceptor, but we add a fallback
      if (!(error as any)?.response?.data?.message) {
        toast.error("Upload failed. Please try again.");
      }
    } finally {
      setUploadProgress(null);
      setUploading(false);
      setForm({ title: "", description: "" });
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (thumbInputRef.current) thumbInputRef.current.value = "";
      setShowUpload(false);
    }
  };

  const handleUploadCancel = () => {
    setUploadProgress(null);
    setUploading(false);
    toast.info("Upload cancelled");
  };

  const handleUploadRetry = () => {
    // Reset upload state and restart
    setUploadProgress(prev => prev ? {
      ...prev,
      progress: 0,
      uploaded: 0,
      speed: 0,
      timeRemaining: 0,
      status: 'uploading',
      error: undefined
    } : null);
    toast.info("Retrying upload...");
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVideoApi(id);
      setMyVideos((prev) => prev.filter((x) => x.id !== id));
    } catch {
      /* toast from interceptor */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">My Videos</h1>
          <p className="text-sm text-muted-foreground">Upload and manage your videos</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} className="glow-button gap-2">
          <Upload className="h-4 w-4" /> Upload Video
        </Button>
      </div>

      {showUpload && !uploadProgress && (
        <div className="glass-card-enhanced rounded-xl p-6 space-y-6 animate-fade-up">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-2">Upload New Video</h3>
            <p className="text-sm text-muted-foreground">Share your content with the world</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Video Title</label>
              <Input
                placeholder="Enter an engaging title..."
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="h-12"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
              <Textarea
                placeholder="Tell viewers about your video..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="min-h-24"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Video File</label>
                <Input 
                  ref={videoInputRef} 
                  type="file" 
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" 
                  className="cursor-pointer h-12" 
                />
                <p className="text-xs text-muted-foreground">Supported formats: MP4, WebM, MOV (Max 200MB)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Thumbnail</label>
                <Input 
                  ref={thumbInputRef} 
                  type="file" 
                  accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp" 
                  className="cursor-pointer h-12" 
                />
                <p className="text-xs text-muted-foreground">Supported formats: JPEG, PNG, WebP (Max 10MB)</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button 
              onClick={handleUpload} 
              disabled={!form.title.trim() || uploading}
              className="glow-button flex-1"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting Upload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Start Upload
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowUpload(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {uploadProgress && (
        <UploadProgress
          file={uploadProgress.file}
          thumbnail={uploadProgress.thumbnail}
          title={uploadProgress.title}
          description={uploadProgress.description}
          onComplete={handleUploadComplete}
          onCancel={handleUploadCancel}
          onRetry={handleUploadRetry}
        />
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your videos...</p>
        </div>
      ) : myVideos.length === 0 && !showUpload ? (
        <div className="glass-card-enhanced rounded-xl p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Upload className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No videos yet</h3>
          <p className="text-muted-foreground mb-6">Upload your first video to get started!</p>
          <Button onClick={() => setShowUpload(true)} className="glow-button">
            <Upload className="h-4 w-4 mr-2" />
            Upload Your First Video
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {myVideos.filter(v => v && v.id).map((v, i) => (
            <div
              key={v?.id || `video-${i}`}
              className="glass-card-enhanced rounded-xl overflow-hidden animate-fade-up group hover-lift"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div
                className="relative aspect-video bg-secondary overflow-hidden cursor-pointer"
                onClick={() => v && setSelectedVideo(v)}
              >
                <img
                  src={v?.thumbnail || ''}
                  alt={v?.title || 'Video'}
                  className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-full border border-border/50 shadow-lg transition-all duration-300 group-hover:scale-105">
                  {v?.duration || '0:00'}
                </span>
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                  <div className="h-16 w-16 rounded-full bg-primary/95 flex items-center justify-center scale-75 group-hover:scale-100 transition-all duration-500 shadow-2xl group-hover:shadow-primary/25">
                    <Play className="h-7 w-7 text-primary-foreground ml-1" />
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-300">{v?.title || 'Untitled Video'}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 group-hover:text-primary transition-colors duration-300">
                    <Eye className="h-4 w-4" /> 
                    <span className="font-medium">{v?.views || '0 views'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => v && handleDelete(v.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors p-1 rounded hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVideo && <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
    </div>
  );
};

export default MyVideos;
