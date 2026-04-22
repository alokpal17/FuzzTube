/** Skeleton loading card for content placeholders */
interface SkeletonCardProps {
  variant?: 'tweet' | 'video' | 'stat';
}

const SkeletonCard = ({ variant = 'tweet' }: SkeletonCardProps) => {
  if (variant === 'video') {
    return (
      <div className="glass-card-enhanced rounded-xl overflow-hidden animate-fade-up">
        <div className="skeleton-pulse aspect-video" />
        <div className="p-5 space-y-3">
          <div className="skeleton-pulse h-4 w-full" />
          <div className="skeleton-pulse h-4 w-3/4" />
          <div className="skeleton-pulse h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className="glass-card-enhanced rounded-xl p-6 flex items-center gap-4 animate-fade-up">
        <div className="skeleton-pulse h-14 w-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton-pulse h-8 w-20" />
          <div className="skeleton-pulse h-3 w-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-enhanced rounded-xl p-6 space-y-4 animate-fade-up">
      <div className="flex items-start gap-4">
        <div className="skeleton-pulse h-12 w-12 rounded-full" />
        <div className="space-y-3 flex-1">
          <div className="skeleton-pulse h-4 w-1/3" />
          <div className="skeleton-pulse h-3 w-1/4" />
        </div>
        <div className="skeleton-pulse h-3 w-16" />
      </div>
      <div className="space-y-3">
        <div className="skeleton-pulse h-3 w-full" />
        <div className="skeleton-pulse h-3 w-4/5" />
        <div className="skeleton-pulse h-3 w-2/3" />
      </div>
      <div className="flex items-center gap-8">
        <div className="skeleton-pulse h-4 w-8" />
        <div className="skeleton-pulse h-4 w-8" />
        <div className="skeleton-pulse h-4 w-8" />
      </div>
    </div>
  );
};

export default SkeletonCard;
