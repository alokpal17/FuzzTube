import { Play, Eye } from "lucide-react";
import type { Video } from "@/services/api";

interface VideoCardProps {
  video: Video;
  index: number;
  onClick?: () => void;
}

const VideoCard = ({ video, index, onClick }: VideoCardProps) => (
  <div
    onClick={onClick}
    className="glass-card-enhanced rounded-xl overflow-hidden transition-all duration-500 hover:border-primary/30 animate-fade-up group cursor-pointer hover-lift"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="relative aspect-video bg-secondary overflow-hidden">
      <img
        src={video?.thumbnail || ''}
        alt={video?.title || 'Video'}
        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = '';
          e.currentTarget.style.display = 'none';
        }}
      />
      <span className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-md text-xs font-semibold px-3 py-1.5 rounded-full border border-border/50 shadow-lg transition-all duration-300 group-hover:scale-105">
        {video?.duration || '0:00'}
      </span>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
        <div className="h-16 w-16 rounded-full bg-primary/95 flex items-center justify-center scale-75 group-hover:scale-100 transition-all duration-500 shadow-2xl group-hover:shadow-primary/25">
          <Play className="h-7 w-7 text-primary-foreground ml-1" />
        </div>
      </div>
    </div>
    <div className="p-5 space-y-3">
      <h3 className="font-semibold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors duration-300">{video?.title || 'Untitled Video'}</h3>
      <p className="text-xs text-muted-foreground font-medium group-hover:text-foreground transition-colors duration-300">{video?.channel || 'Unknown Channel'}</p>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 group-hover:text-primary transition-colors duration-300">
          <Eye className="h-4 w-4" /> 
          <span className="font-medium">{video?.views || '0 views'}</span>
        </span>
        <span className="group-hover:text-foreground transition-colors duration-300">{video?.date || 'Recently'}</span>
      </div>
    </div>
  </div>
);

export default VideoCard;
