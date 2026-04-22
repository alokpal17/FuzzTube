import { useState, useEffect, useRef } from "react";
import { Bell, BellRing, MessageSquare, Heart, Share2, User, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type Notification,
} from "@/services/api";

const Notifications = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from API with fallback to mock data
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notificationList = await fetchNotifications();
        setNotifications(notificationList);
        setUnreadCount(notificationList.filter(n => !n.read).length);
      } catch (error) {
        console.log('API not available, using mock notifications:', error);
        // Fallback to mock notifications when API is not available
        const mockNotifications: Notification[] = [
          {
            id: '1',
            type: 'comment',
            message: 'commented on your video',
            user: { name: 'John Doe', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
            videoTitle: 'My Awesome Video',
            videoId: '1',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
            read: false
          },
          {
            id: '2',
            type: 'like',
            message: 'liked your video',
            user: { name: 'Jane Smith', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane' },
            videoTitle: 'Another Great Video',
            videoId: '2',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            read: false
          },
          {
            id: '3',
            type: 'follow',
            message: 'started following you',
            user: { name: 'Mike Johnson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
            timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
            read: true
          },
          {
            id: '4',
            type: 'comment',
            message: 'replied to your comment',
            user: { name: 'Sarah Wilson', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
            videoTitle: 'My Awesome Video',
            videoId: '1',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            read: true
          }
        ];
        
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.read).length);
      }
    };

    loadNotifications();
    
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'follow':
        return <User className="h-4 w-4 text-green-500" />;
      case 'share':
        return <Share2 className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Try API first, fallback to local state
      await markNotificationAsRead(notificationId);
    } catch (error) {
      console.log('API not available, updating local state:', error);
    }
    
    // Always update local state
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    try {
      // Try API first, fallback to local state
      await markAllNotificationsAsRead();
    } catch (error) {
      console.log('API not available, updating local state:', error);
    }
    
    // Always update local state
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-secondary/80 transition-colors"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-primary" />
        ) : (
          <Bell className="h-5 w-5 text-muted-foreground" />
        )}
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-bounce-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 glass-card-enhanced rounded-xl shadow-2xl border border-border/50 z-50 animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Mark all as read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-secondary/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 hover:bg-secondary/30 transition-colors cursor-pointer",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                      <div className="relative">
                        <img
                          src={notification.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${notification.user.name}`}
                          alt={notification.user.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{notification.user.name}</span>
                          <span className="text-muted-foreground"> {notification.message}</span>
                          {notification.videoTitle && (
                            <span className="text-primary font-medium"> "{notification.videoTitle}"</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.read && (
                        <div className="h-2 w-2 bg-primary rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
