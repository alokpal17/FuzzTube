import { LayoutDashboard, Twitter, Youtube, Upload, PenSquare, ListVideo } from "lucide-react";

export type Section = "dashboard" | "tweets" | "videos" | "my-videos" | "my-tweets" | "playlists";

interface DashboardSidebarProps {
  active: Section;
  onNavigate: (section: Section) => void;
}

const items: { key: Section; label: string; icon: React.ElementType; group?: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "tweets", label: "Explore Tweets", icon: Twitter, group: "Tweets" },
  { key: "my-tweets", label: "My Tweets", icon: PenSquare },
  { key: "videos", label: "Explore Videos", icon: Youtube, group: "Videos" },
  { key: "my-videos", label: "My Videos", icon: Upload },
  { key: "playlists", label: "Playlists", icon: ListVideo },
];

const DashboardSidebar = ({ active, onNavigate }: DashboardSidebarProps) => {
  let lastGroup = "";

  return (
    <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar min-h-[calc(100vh-4rem)] p-4 gap-1">
      {items.map(({ key, label, icon: Icon, group }) => {
        const showDivider = group && group !== lastGroup;
        if (group) lastGroup = group;
        return (
          <div key={key}>
            {showDivider && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2 px-4">
                {group}
              </p>
            )}
            <button
              onClick={() => onNavigate(key)}
              className={`sidebar-item w-full ${active === key ? "active" : ""}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          </div>
        );
      })}
    </aside>
  );
};

export default DashboardSidebar;
