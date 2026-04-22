import { LogOut, Sun, Moon, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { logoutUser } from "@/services/api";
import { getStoredUser } from "@/services/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Notifications from "@/components/Notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const user = getStoredUser();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      /* session may already be invalid */
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-2.5">
          {/* FuzzTube custom logo mark */}
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_16px_hsl(48_100%_50%/0.4)] shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M4 8C4 6.34315 5.34315 5 7 5H17C18.6569 5 20 6.34315 20 8V16C20 17.6569 18.6569 19 17 19H7C5.34315 19 4 17.6569 4 16V8Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10 9.5L15.5 12L10 14.5V9.5Z" fill="currentColor"/>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Fuzz<span className="text-primary">Tube</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Notifications />
          
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                aria-label="Account"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user?.avatar} alt="" />
                  <AvatarFallback className="text-xs">{(user?.fullname || user?.username || "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
