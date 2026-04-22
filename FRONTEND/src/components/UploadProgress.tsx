import { useState, useEffect, useRef } from "react";
import { Upload, CheckCircle2, Clock, Zap, FileVideo, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatTime } from "@/lib/utils";

interface UploadProgressProps {
  file: File;
  thumbnail?: File;
  onComplete: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  title: string;
  description: string;
}

interface UploadState {
  progress: number;
  uploaded: number;
  speed: number;
  timeRemaining: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

const UploadProgress = ({ 
  file, 
  thumbnail, 
  onComplete, 
  onCancel, 
  onRetry,
  title, 
  description 
}: UploadProgressProps) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    uploaded: 0,
    speed: 0,
    timeRemaining: 0,
    status: 'uploading'
  });

  const startTime = useRef(Date.now());
  const lastUpdate = useRef(Date.now());
  const uploadedBytes = useRef(0);

  // Simulate upload progress with realistic metrics
  useEffect(() => {
    if (uploadState.status !== 'uploading') return;

    const interval = setInterval(() => {
      try {
        const now = Date.now();
        const elapsed = (now - startTime.current) / 1000;
        const totalSize = file?.size || 0 + (thumbnail?.size || 0);
        
        if (totalSize === 0) {
          setUploadState(prev => ({ 
            ...prev, 
            status: 'error', 
            error: 'Invalid file size' 
          }));
          return;
        }
        
        // Simulate varying upload speed (2-8 MB/s with fluctuations)
        const baseSpeed = 5 * 1024 * 1024; // 5 MB/s base
        const speedVariation = Math.sin(elapsed * 0.5) * 2 * 1024 * 1024; // ±2 MB/s variation
        const currentSpeed = Math.max(1 * 1024 * 1024, baseSpeed + speedVariation);
        
        // Calculate uploaded bytes
        const elapsedSinceLastUpdate = (now - lastUpdate.current) / 1000;
        const bytesInInterval = currentSpeed * elapsedSinceLastUpdate;
        uploadedBytes.current = Math.min(totalSize, uploadedBytes.current + bytesInInterval);
        
        const progress = (uploadedBytes.current / totalSize) * 100;
        const speed = currentSpeed;
        const remainingBytes = totalSize - uploadedBytes.current;
        const timeRemaining = remainingBytes / speed;

        setUploadState({
          progress: Math.min(100, Math.max(0, progress)),
          uploaded: uploadedBytes.current,
          speed,
          timeRemaining: Math.max(0, timeRemaining),
          status: 'uploading'
        });

        lastUpdate.current = now;

        // Complete upload when progress reaches 100%
        if (progress >= 100) {
          setUploadState(prev => ({ ...prev, status: 'processing' }));
          
          // Simulate processing time
          setTimeout(() => {
            setUploadState(prev => ({ ...prev, status: 'completed' }));
            setTimeout(onComplete, 1500);
          }, 2000);
        }
      } catch (error) {
        console.error('Upload progress error:', error);
        setUploadState(prev => ({ 
          ...prev, 
          status: 'error', 
          error: 'Upload progress failed' 
        }));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [file?.size, thumbnail?.size, onComplete, uploadState.status]);

  const totalSize = (file?.size || 0) + (thumbnail?.size || 0);
  const isCompleted = uploadState.status === 'completed';
  const isProcessing = uploadState.status === 'processing';
  const hasError = uploadState.status === 'error';

  return (
    <div className="glass-card-enhanced rounded-xl p-6 space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">Uploading Video</h3>
          <p className="text-sm text-muted-foreground">{title}</p>
        </div>
        {uploadState.status === 'uploading' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Files Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
          <FileVideo className="h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>
        {thumbnail && (
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <Image className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{thumbnail.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(thumbnail.size)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {isCompleted ? 'Completed!' : isProcessing ? 'Processing...' : 'Uploading...'}
            </span>
            <span className="font-medium text-foreground">
              {Math.round(uploadState.progress)}%
            </span>
          </div>
          <Progress 
            value={uploadState.progress} 
            className="h-3"
            // @ts-ignore
            style={{
              background: 'hsl(var(--secondary))',
            }}
          />
        </div>

        {/* Upload Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Upload className="h-3 w-3" />
              <span>Uploaded</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatBytes(uploadState.uploaded)}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Speed</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {formatBytes(uploadState.speed)}/s
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Time Left</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              {isCompleted || isProcessing ? '--' : formatTime(uploadState.timeRemaining)}
            </p>
          </div>
        </div>

        {/* Total Size */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total size</span>
            <span className="font-medium text-foreground">
              {formatBytes(uploadState.uploaded)} / {formatBytes(totalSize)}
            </span>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {isProcessing && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-primary">Processing video... This may take a moment.</p>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg animate-fade-up">
          <X className="h-6 w-6 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive">Upload failed</p>
            <p className="text-xs text-muted-foreground">{uploadState.error || 'An error occurred during upload'}</p>
          </div>
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Retry
            </Button>
          )}
        </div>
      )}
      
      {isCompleted && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg animate-bounce-in">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-500">Upload completed successfully!</p>
            <p className="text-xs text-muted-foreground">Your video is now available.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadProgress;
