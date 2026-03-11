// ========================================
// データベース型定義
// ========================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      farms: { Row: Farm; Insert: Omit<Farm, 'id' | 'created_at'>; Update: Partial<Farm> }
      workers: { Row: Worker; Insert: Omit<Worker, 'id' | 'created_at'>; Update: Partial<Worker> }
      crop_categories: { Row: CropCategory; Insert: Omit<CropCategory, 'id' | 'created_at'>; Update: Partial<CropCategory> }
      crops: { Row: Crop; Insert: Omit<Crop, 'id' | 'created_at'>; Update: Partial<Crop> }
      work_categories: { Row: WorkCategory; Insert: Omit<WorkCategory, 'id' | 'created_at'>; Update: Partial<WorkCategory> }
      work_types: { Row: WorkType; Insert: Omit<WorkType, 'id' | 'created_at'>; Update: Partial<WorkType> }
      pesticides: { Row: Pesticide; Insert: Omit<Pesticide, 'id' | 'created_at'>; Update: Partial<Pesticide> }
      fertilizers: { Row: Fertilizer; Insert: Omit<Fertilizer, 'id' | 'created_at'>; Update: Partial<Fertilizer> }
      fields: { Row: Field; Insert: Omit<Field, 'id' | 'created_at'>; Update: Partial<Field> }
      work_logs: { Row: WorkLog; Insert: Omit<WorkLog, 'id' | 'created_at'>; Update: Partial<WorkLog> }
      work_log_items: { Row: WorkLogItem; Insert: Omit<WorkLogItem, 'id'>; Update: Partial<WorkLogItem> }
      pesticide_uses: { Row: PesticideUse; Insert: Omit<PesticideUse, 'id' | 'created_at'>; Update: Partial<PesticideUse> }
      fertilizer_uses: { Row: FertilizerUse; Insert: Omit<FertilizerUse, 'id' | 'created_at'>; Update: Partial<FertilizerUse> }
    }
  }
}

export interface Farm {
  id: string
  name: string
  slug: string
  address: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

export interface Worker {
  id: string
  farm_id: string
  name: string
  active: boolean
  created_at: string
}

export interface CropCategory {
  id: string
  farm_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Crop {
  id: string
  farm_id: string
  category_id: string | null
  name: string
  created_at: string
}

export interface WorkCategory {
  id: string
  farm_id: string
  name: string
  sort_order: number
  created_at: string
}

export interface WorkType {
  id: string
  farm_id: string
  category_id: string | null
  name: string
  needs_pesticide: boolean
  needs_fertilizer: boolean
  sort_order: number
  created_at: string
}

export interface Pesticide {
  id: string
  farm_id: string
  name: string
  registration_number: string | null
  default_dilution: string | null
  default_unit: string
  created_at: string
}

export interface Fertilizer {
  id: string
  farm_id: string
  name: string
  type: '有機' | '化学' | '液体' | 'その他' | null
  created_at: string
}

export interface Field {
  id: string
  farm_id: string
  name: string
  area: number | null
  current_crop_id: string | null
  location_note: string | null
  qr_slug: string
  active: boolean
  created_at: string
}

export interface WorkLog {
  id: string
  farm_id: string
  field_id: string
  worker_id: string
  work_date: string
  start_time: string | null
  end_time: string | null
  weather: '晴' | '曇' | '雨' | '雪' | '晴れ時々曇' | '曇り時々雨' | null
  weather_source: 'manual' | 'auto'
  notes: string | null
  created_at: string
}

export interface WorkLogItem {
  id: string
  work_log_id: string
  work_type_id: string
}

export interface PesticideUse {
  id: string
  work_log_id: string
  pesticide_id: string
  dilution_ratio: string | null
  amount_used: number | null
  amount_unit: string
  spray_area: number | null
  spray_area_unit: string
  target_pest: string | null
  created_at: string
}

export interface FertilizerUse {
  id: string
  work_log_id: string
  fertilizer_id: string
  amount_used: number | null
  amount_unit: string
  method: '元肥' | '追肥' | '葉面散布' | 'その他' | null
  created_at: string
}

// ========================================
// クライアント向けの拡張型
// ========================================

export interface FieldWithCrop extends Field {
  crop?: Crop & { crop_category?: CropCategory }
}

export interface WorkTypeWithCategory extends WorkType {
  work_category?: WorkCategory
}

export interface WorkLogWithDetails extends WorkLog {
  field?: Field
  worker?: Worker
  work_log_items?: (WorkLogItem & { work_type?: WorkType })[]
  pesticide_uses?: (PesticideUse & { pesticide?: Pesticide })[]
  fertilizer_uses?: (FertilizerUse & { fertilizer?: Fertilizer })[]
}
