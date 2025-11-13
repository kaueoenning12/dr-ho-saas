// Notification message templates
export const notificationTemplates = {
  new_document: (documentTitle: string) => ({
    title: "New Document Published",
    message: `${documentTitle} has been published`,
  }),
  
  comment: (documentTitle: string, commenterName: string) => ({
    title: "New Comment",
    message: `${commenterName} commented on ${documentTitle}`,
  }),
  
  like: (documentTitle: string) => ({
    title: "New Like",
    message: `Someone liked your document: ${documentTitle}`,
  }),
  
  announcement: (announcementTitle: string) => ({
    title: "New Announcement",
    message: announcementTitle,
  }),
  
  suggestion_status: (suggestionTitle: string, status: string) => ({
    title: "Suggestion Status Updated",
    message: `Your suggestion "${suggestionTitle}" is now ${status}`,
  }),
  
  system: (message: string) => ({
    title: "System Notification",
    message,
  }),
} as const;

export type NotificationTemplate = keyof typeof notificationTemplates;
