import axios, { type AxiosResponse } from "axios";
import { toast } from "sonner";

/** Backend wraps payloads in `{ statusCode, data, message, success }` */
export interface ApiEnvelope<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

export interface ApiUser {
  _id: string;
  username: string;
  email: string;
  fullname: string;
  avatar: string;
  coverImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

function resolveApiBaseURL(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (import.meta.env.DEV) return "/api/v1";

  return "https://fuzztube.onrender.com/api/v1";
}

const api = axios.create({
  baseURL: resolveApiBaseURL(),
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetwork =
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error" ||
      (!error.response && error.request);
    const message = isNetwork
      ? "Cannot reach the API. Start the backend (port 8000) and try again."
      : error.response?.data?.message || error.message || "Something went wrong";
    const reqUrl = error.config?.url || "";
    const isAuthRoute =
      reqUrl.includes("/users/login") ||
      reqUrl.includes("/users/register") ||
      reqUrl.includes("/users/logout");
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/login";
    }
    toast.error(typeof message === "string" ? message : "Something went wrong");
    return Promise.reject(error);
  }
);

export function unwrap<T>(res: AxiosResponse<ApiEnvelope<T>>): T {
  return res.data.data;
}

export function formatDuration(seconds: number | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(Math.abs(seconds) / 60);
  const s = Math.floor(Math.abs(seconds) % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatViews(n: number | undefined): string {
  const v = (n != null && !Number.isNaN(n) && n >= 0) ? n : 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M views`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K views`;
  return `${v} views`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ——— Domain types (UI) ———

export interface Tweet {
  id: string;
  username: string;
  handle: string;
  content: string;
  likes: number;
  retweets: number;
  date: string;
  avatar?: string;
  isLiked?: boolean;
}

export interface Video {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  views: string;
  duration: string;
  date: string;
  videoUrl?: string;
  description?: string;
}

interface TweetOwner {
  username?: string;
  fullname?: string;
  avatar?: string;
}

interface TweetDoc {
  _id: string;
  content: string;
  owner?: TweetOwner | string;
  createdAt?: string;
  likesCount?: number;
  isLiked?: boolean;
}

interface VideoOwnerDoc {
  username?: string;
  avatar?: string;
}

interface VideoDoc {
  _id: string;
  title: string;
  description?: string;
  thumbnail: string;
  videoFile: string;
  duration?: number;
  views?: number;
  createdAt?: string;
  owner?: VideoOwnerDoc | string;
}

export function mapTweetDoc(t: TweetDoc): Tweet {
  // Handle null/undefined owner safely
  let fullname = "User";
  let username = "user";
  let avatar = undefined;
  
  if (t.owner && typeof t.owner === "object" && t.owner) {
    fullname = t.owner.fullname || t.owner.username || "User";
    username = t.owner.username || "user";
    avatar = t.owner.avatar;
  } else if (typeof t.owner === "string" && t.owner) {
    username = t.owner;
    fullname = t.owner;
  }
  
  return {
    id: String(t._id || ''),
    username: fullname,
    handle: username,
    content: t.content || '',
    likes: t.likesCount ?? 0,
    retweets: 0,
    date: formatDate(t.createdAt) || 'Just now',
    avatar: avatar,
    isLiked: t.isLiked ?? false,
  };
}

export function mapVideoDoc(v: VideoDoc, channelFallback = "Channel"): Video {
  // Handle null/undefined owner safely
  let username = channelFallback;
  if (v.owner && typeof v.owner === "object" && v.owner.username) {
    username = v.owner.username;
  } else if (typeof v.owner === "string" && v.owner) {
    username = v.owner;
  }
  
  return {
    id: String(v._id || ''),
    title: v.title || 'Untitled Video',
    channel: username,
    thumbnail: v.thumbnail || '',
    views: formatViews(v.views),
    duration: formatDuration(v.duration),
    date: formatDate(v.createdAt),
    videoUrl: v.videoFile || '',
    description: v.description || '',
  };
}

// ——— Auth ———

export interface LoginResult {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

export const loginUser = async (email: string, password: string): Promise<LoginResult> => {
  const res = await api.post<ApiEnvelope<LoginResult>>("/users/login", { email, password });
  return unwrap(res);
};

export const logoutUser = async (): Promise<void> => {
  await api.post<ApiEnvelope<unknown>>("/users/logout");
};

export const getCurrentUser = async (): Promise<ApiUser> => {
  const res = await api.get<ApiEnvelope<ApiUser>>("/users/current-user");
  return unwrap(res);
};

export const updateProfile = async (input: { fullname?: string; email?: string }): Promise<ApiUser> => {
  const res = await api.patch<ApiEnvelope<ApiUser>>("/users/update-profile", input);
  return unwrap(res);
};

export const updateAvatar = async (avatar: File): Promise<ApiUser> => {
  const body = new FormData();
  body.append("avatar", avatar);
  const res = await api.patch<ApiEnvelope<ApiUser>>("/users/update-avatar", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res);
};

export const updateCoverImage = async (coverImage: File): Promise<ApiUser> => {
  const body = new FormData();
  body.append("coverImage", coverImage);
  const res = await api.patch<ApiEnvelope<ApiUser>>("/users/update-cover-image", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res);
};

export interface RegisterInput {
  fullname: string;
  email: string;
  username: string;
  password: string;
  avatar: File;
  coverImage?: File | null;
}

export const registerUser = async (input: RegisterInput): Promise<ApiUser> => {
  const body = new FormData();
  body.append("fullname", input.fullname);
  body.append("email", input.email);
  body.append("username", input.username);
  body.append("password", input.password);
  body.append("avatar", input.avatar);
  if (input.coverImage) body.append("coverImage", input.coverImage);

  const res = await api.post<ApiEnvelope<ApiUser>>("/users/register", body, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res);
};

export interface ChannelProfile {
  _id: string;
  fullname: string;
  username: string;
  email?: string;
  avatar?: string;
  coverImage?: string;
  subscribersCount?: number;
  channelSubscribedCount?: number;
  isSubscribed?: boolean;
}

export const getChannelProfile = async (username: string): Promise<ChannelProfile> => {
  const res = await api.get<ApiEnvelope<ChannelProfile>>(`/users/c/${encodeURIComponent(username)}`);
  return unwrap(res);
};

export const toggleTweetLike = async (tweetId: string): Promise<void> => {
  await api.post<ApiEnvelope<unknown>>(`/likes/toggle/t/${tweetId}`);
};

export const toggleVideoLike = async (videoId: string): Promise<void> => {
  await api.post<ApiEnvelope<unknown>>(`/likes/toggle/v/${videoId}`);
};

export const toggleSubscription = async (channelId: string): Promise<void> => {
  await api.post<ApiEnvelope<unknown>>(`/subscriptions/c/${channelId}`);
};

// ——— Tweets ———

export const fetchTweets = async (): Promise<Tweet[]> => {
  const res = await api.get<ApiEnvelope<TweetDoc[]>>("/tweets");
  return unwrap(res).map(mapTweetDoc);
};

export const fetchUserTweets = async (userId: string): Promise<Tweet[]> => {
  const res = await api.get<ApiEnvelope<TweetDoc[]>>(`/tweets/user/${userId}`);
  return unwrap(res).map(mapTweetDoc);
};

export const createTweet = async (content: string): Promise<Tweet> => {
  try {
    if (!content?.trim()) {
      throw new Error("Content is required");
    }
    
    const res = await api.post<ApiEnvelope<TweetDoc>>("/tweets", { content: content.trim() });
    const doc = unwrap(res);
    
    if (!doc) {
      throw new Error("Invalid response from server");
    }
    
    const u = getStoredUser();
    if (u && doc.owner && String(doc.owner) === String(u._id)) {
      return {
        id: String(doc._id || ''),
        username: u.fullname || 'User',
        handle: u.username || 'user',
        content: doc.content || '',
        likes: 0,
        retweets: 0,
        date: formatDate(doc.createdAt) || "Just now",
        avatar: u.avatar,
      };
    }
    return mapTweetDoc(doc);
  } catch (error) {
    console.error('Create tweet error:', error);
    throw error;
  }
};

export const deleteTweetApi = async (tweetId: string): Promise<void> => {
  await api.delete<ApiEnvelope<unknown>>(`/tweets/${tweetId}`);
};

// ——— Videos ———

export const fetchVideos = async (params?: { query?: string; page?: number; limit?: number }): Promise<Video[]> => {
  const res = await api.get<ApiEnvelope<VideoDoc[]>>("/videos", { params });
  return unwrap(res).map((v) => mapVideoDoc(v));
};

export const fetchVideoById = async (videoId: string): Promise<Video> => {
  const res = await api.get<ApiEnvelope<VideoDoc>>(`/videos/${videoId}`);
  return mapVideoDoc(unwrap(res));
};

export const fetchDashboardVideos = async (channelFallback: string): Promise<Video[]> => {
  const res = await api.get<ApiEnvelope<VideoDoc[]>>("/dashboard/videos");
  return unwrap(res).map((v) => mapVideoDoc(v, channelFallback));
};

export const publishVideo = async (form: {
  title: string;
  description: string;
  videoFile: File;
  thumbnail: File;
}): Promise<Video> => {
  try {
    // Validate input
    if (!form.title?.trim()) {
      throw new Error("Title is required");
    }
    if (!form.videoFile) {
      throw new Error("Video file is required");
    }
    if (!form.thumbnail) {
      throw new Error("Thumbnail is required");
    }
    
    const body = new FormData();
    body.append("title", form.title.trim());
    body.append("description", form.description || "");
    body.append("videoFile", form.videoFile);
    body.append("thumbnail", form.thumbnail);
    
    const res = await api.post<ApiEnvelope<VideoDoc>>("/videos", body, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300000, // 5 minutes for large files
    });
    
    const videoDoc = unwrap(res);
    if (!videoDoc) {
      throw new Error("Invalid response from server");
    }
    
    return mapVideoDoc(videoDoc);
  } catch (error) {
    console.error('Publish video error:', error);
    // Re-throw the error for the component to handle
    throw error;
  }
};

export const deleteVideoApi = async (videoId: string): Promise<void> => {
  await api.delete<ApiEnvelope<unknown>>(`/videos/${videoId}`);
};

// ——— Playlists ———

export interface PlaylistSummary {
  id: string;
  name: string;
  description: string;
  videoIds: string[];
  createdAt: string;
}

interface PlaylistDoc {
  _id: string;
  name: string;
  description: string;
  videos: string[];
  createdAt?: string;
}

function mapPlaylistDoc(p: PlaylistDoc): PlaylistSummary {
  return {
    id: String(p._id),
    name: p.name,
    description: p.description || "",
    videoIds: (p.videos || []).map(String),
    createdAt: formatDate(p.createdAt),
  };
}

export const fetchUserPlaylists = async (userId: string): Promise<PlaylistSummary[]> => {
  const res = await api.get<ApiEnvelope<PlaylistDoc[]>>(`/playlist/user/${userId}`);
  return unwrap(res).map(mapPlaylistDoc);
};

interface PlaylistDetailDoc {
  _id: string;
  name: string;
  description: string;
  videos: VideoDoc[];
  createdAt?: string;
}

export const fetchPlaylistDetail = async (playlistId: string): Promise<{ summary: PlaylistSummary; videos: Video[] }> => {
  const res = await api.get<ApiEnvelope<PlaylistDetailDoc>>(`/playlist/${playlistId}`);
  const raw = unwrap(res);
  const vids = raw.videos || [];
  return {
    summary: {
      id: String(raw._id),
      name: raw.name,
      description: raw.description || "",
      videoIds: vids.map((v) => String(v._id)),
      createdAt: formatDate(raw.createdAt),
    },
    videos: vids.map((v) => mapVideoDoc(v)),
  };
};

export const createPlaylistApi = async (name: string, description = ""): Promise<PlaylistSummary> => {
  const res = await api.post<ApiEnvelope<PlaylistDoc>>("/playlist", { name, description });
  return mapPlaylistDoc(unwrap(res));
};

export const deletePlaylistApi = async (playlistId: string): Promise<void> => {
  await api.delete<ApiEnvelope<unknown>>(`/playlist/${playlistId}`);
};

export const addVideoToPlaylistApi = async (playlistId: string, videoId: string): Promise<Video[]> => {
  const res = await api.patch<ApiEnvelope<PlaylistDetailDoc>>(`/playlist/add/${videoId}/${playlistId}`);
  const raw = unwrap(res);
  return (raw.videos || []).map((v) => mapVideoDoc(v));
};

export const removeVideoFromPlaylistApi = async (playlistId: string, videoId: string): Promise<Video[]> => {
  const res = await api.patch<ApiEnvelope<PlaylistDetailDoc>>(`/playlist/remove/${videoId}/${playlistId}`);
  const raw = unwrap(res);
  return (raw.videos || []).map((v) => mapVideoDoc(v));
};

export function getStoredUser(): ApiUser | null {
  try {
    const raw = localStorage.getItem("auth_user");
    if (!raw) return null;
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

export interface ChannelStats {
  totalSubscribers: number;
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
}

export const fetchChannelStats = async (): Promise<ChannelStats> => {
  const res = await api.get<ApiEnvelope<ChannelStats>>("/dashboard/stats");
  return unwrap(res);
};

// ——— Notifications ———

export interface Notification {
  id: string;
  type: 'comment' | 'like' | 'follow' | 'share';
  message: string;
  user: {
    name: string;
    avatar?: string;
  };
  videoTitle?: string;
  videoId?: string;
  timestamp: string;
  read: boolean;
}

export const fetchNotifications = async (): Promise<Notification[]> => {
  const res = await api.get<ApiEnvelope<Notification[]>>("/notifications");
  return unwrap(res);
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await api.patch<ApiEnvelope<unknown>>(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.patch<ApiEnvelope<unknown>>("/notifications/read-all");
};

export const createCommentNotification = async (videoId: string, comment: string): Promise<void> => {
  const res = await api.post<ApiEnvelope<unknown>>(`/videos/${videoId}/comments`, { comment });
  unwrap(res);
};

export default api;
