export interface DocumentUnlock {
  id: string;
  user_id: string;
  document_id: string;
  rating: number;
  unlocked_at: string;
  created_at: string;
}

export interface DocumentWithUnlock {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  category?: string;
  is_premium: boolean;
  preview_image_url?: string;
  is_unlocked: boolean;
  created_at: string;
  updated_at: string;
}

export type StarRating = 1 | 2 | 3 | 4 | 5;

