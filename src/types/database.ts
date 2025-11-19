// Database type definitions
export type AppRole = "admin" | "moderator" | "user";

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  pdf_url: string;
  thumbnail_url?: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  author_id: string;
  is_published: boolean;
  views: number;
  likes: number;
  file_size?: number;
}

export interface DocumentComment {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "new_document" | "comment" | "like" | "system";
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface DocumentView {
  id: string;
  document_id: string;
  user_id: string;
  viewed_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  is_published: boolean;
  priority: "low" | "medium" | "high";
  category: "news" | "update" | "alert" | "info";
}

export interface ContentSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  suggested_by_id: string;
  suggested_by_name: string;
  status: "pending" | "approved" | "rejected" | "in_progress";
  created_at: string;
  updated_at: string;
  admin_response?: string;
  priority: "low" | "medium" | "high";
}
