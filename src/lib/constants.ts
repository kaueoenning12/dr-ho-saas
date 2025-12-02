// Application constants
export const STORAGE_KEYS = {
  AUTH_USER: "auth_user",
  DOCUMENTS: "mock_documents",
  LIKED_DOCUMENTS: "liked_documents",
  SEARCH_HISTORY: "search_history",
  ANNOUNCEMENTS: "announcements",
  SUGGESTIONS: "content_suggestions",
} as const;

export const NOTIFICATION_TYPES = {
  NEW_DOCUMENT: "new_document",
  COMMENT: "comment",
  LIKE: "like",
  SYSTEM: "system",
} as const;

export const DOCUMENT_CATEGORIES = [
  "Todas",
  "SST",
  "EPI",
  "Treinamento",
  "Procedimentos",
  "Relatórios",
  "Normas Regulamentadoras",
] as const;

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Most Recent" },
  { value: "views", label: "Most Viewed" },
  { value: "likes", label: "Most Liked" },
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
export const ALLOWED_FILE_EXTENSIONS = [".pdf", ".png", ".doc", ".docx", ".txt"];
export const ITEMS_PER_PAGE = 12;

// Notification settings
export const NOTIFICATIONS_PER_PAGE = 20;
export const NOTIFICATION_SOUND_URL = "/notification-sound.mp3";
export const NOTIFICATION_CLEANUP_DAYS = 30;
