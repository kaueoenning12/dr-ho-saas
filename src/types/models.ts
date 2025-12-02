// Application model types
export interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: "monthly" | "yearly";
  features: string[];
  limits: {
    maxDocuments?: number;
    maxStorage?: number; // in GB
    supportLevel: "basic" | "priority" | "dedicated";
  };
  popular?: boolean;
}

export interface UserSubscription {
  planId: string;
  startDate: string;
  expiryDate: string;
  status: "active" | "expired" | "cancelled";
  autoRenew: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  avatar_url?: string;
  subscription?: UserSubscription;
}

export interface DocumentWithAuthor {
  id: string;
  title: string;
  description: string;
  category: string;
  keywords: string[];
  pdfUrl: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  author?: {
    name: string;
    avatar_url?: string;
  };
  isNew?: boolean;
  thumbnail_url?: string;
  file_size?: number;
}

export interface SearchFilters {
  query: string;
  category: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy: "relevance" | "date" | "views" | "likes";
}

export interface UploadDocumentData {
  title: string;
  description: string;
  category: string;
  keywords: string[];
  file: File;
  isPublished: boolean;
}

export interface UserActivity {
  documentId: string;
  documentTitle: string;
  viewedAt: string;
  timeSpent: number; // in minutes
}

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar_url?: string;
  subscription?: UserSubscription;
  registeredAt: string;
  lastAccessAt: string;
  status: "active" | "inactive";
  totalDocumentsViewed: number;
  recentActivity: UserActivity[];
  forumPoints?: number;
  forumBadge?: "member" | "active" | "expert";
}

export interface ForumCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface ForumPost {
  id: string;
  topicId: string;
  authorId: string;
  authorName: string;
  authorRole: "admin" | "user";
  content: string;
  createdAt: string;
  likes: number;
  isAnswer?: boolean;
  isBestAnswer?: boolean;
}

export interface ForumTopic {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  authorId: string;
  authorName: string;
  authorRole: "admin" | "user";
  createdAt: string;
  updatedAt: string;
  views: number;
  replies: number;
  likes: number;
  tags: string[];
  isResolved: boolean;
  isPinned: boolean;
  isHot: boolean;
}

export interface NotificationExtended {
  id: string;
  type: "forum" | "document" | "system" | "whatsapp" | "announcement";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  createdAt: string;
  icon?: string;
}

export interface WhatsAppConfig {
  phoneNumber: string;
  countryCode: string;
  welcomeMessage: string;
  businessHours: string;
  isOnline: boolean;
  groups: {
    id: string;
    name: string;
    description: string;
    link: string;
  }[];
}
