/** Reusable loading spinner */
const Loader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 rounded-full border-2 border-secondary" />
      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
    </div>
  </div>
);

export default Loader;
