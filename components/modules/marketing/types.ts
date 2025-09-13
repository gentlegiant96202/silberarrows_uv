// Content Pillar Modal Types
export interface ContentPillarFormData {
  title: string;
  description: string;
  car_model?: string;
  titleFontSize: number;
  imageFit: 'cover' | 'contain' | 'fill';
  imageAlignment: string;
  imageZoom: number;
  imageVerticalPosition: number;
  badgeText?: string;
  subtitle?: string;
  myth?: string;
  fact?: string;
  problem?: string;
  solution?: string;
  difficulty?: string;
  tools_needed?: string;
  warning?: string;
  monthly_20_down_aed?: number;
  media_files?: any[];
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  price?: number;
  horsepower?: number;
  engine?: string;
  transmission?: string;
  fuel_type?: string;
  exterior_color?: string;
  interior_color?: string;
  features?: string[];
}

export interface ContentPillarItem {
  id: string;
  title: string;
  description?: string;
  content_type: 'image' | 'video' | 'text' | 'carousel';
  day_of_week: string;
  created_at: string;
  updated_at: string;
  media_files?: any[];
  badge_text?: string;
  subtitle?: string;
  myth?: string;
  fact?: string;
  problem?: string;
  solution?: string;
  difficulty?: string;
  tools_needed?: string;
  warning?: string;
}

export interface FileWithThumbnail {
  file: File;
  thumbnail: string;
  uploadProgress: number;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

export interface InventoryCar {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  colour: string;
  interior_colour: string | null;
  chassis_number: string;
  advertised_price_aed: number;
  monthly_20_down_aed: number | null;
  monthly_0_down_aed: number | null;
  current_mileage_km: number | null;
  engine: string | null;
  transmission: string | null;
  horsepower_hp: number | null;
  key_equipment: string | null;
  description: string | null;
  car_media: {
    url: string;
    kind: string;
    sort_order: number;
  }[];
}

export interface AIGeneratedContent {
  title: string;
  description: string;
  content_type: 'image' | 'video' | 'text' | 'carousel';
  badge_text?: string;
  subtitle?: string;
  myth?: string;
  fact?: string;
  problem?: string;
  solution?: string;
  difficulty?: string;
  tools_needed?: string;
  warning?: string;
}

export interface ContentPillarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pillarData: Partial<ContentPillarItem>) => Promise<void>;
  onDelete?: () => Promise<void>;
  dayKey: string;
  dayTitle: string;
  isEditing?: boolean;
  editingItem?: ContentPillarItem | null;
  onRegenerate?: (contentType: 'image' | 'video' | 'text' | 'carousel') => Promise<void>;
  aiGeneratedContent?: AIGeneratedContent;
  generatedImageBase64?: string | null;
  onGeneratedImageChange?: (imageBase64: string | null) => void;
}
