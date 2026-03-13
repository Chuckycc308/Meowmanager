export type Role = 'admin' | 'supervisor' | 'staff';
export type CatStatus = 'normal' | 'observation' | 'sick' | 'green' | 'yellow' | 'red';

export interface Branch {
  id: number;
  name: string;
  background_image?: string;
  header_image?: string;
}

export interface Breed {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  name: string;
  role: Role;
  branch_id: number | null;
  branch_name?: string;
  avatar?: string;
  username: string;
  password?: string;
}

export interface RolePermissions {
  delete_cat: boolean;
  delete_employee: boolean;
  manage_settings: boolean;
  manage_breeds: boolean;
  manage_vaccines: boolean;
  manage_medication: boolean;
  edit_cat_status: boolean;
}

export interface Cat {
  id: number;
  name: string;
  breed_id: number;
  breed_name?: string;
  branch_id: number;
  branch_name?: string;
  birth_date: string;
  weight: number;
  vaccine_expiry: string;
  status: CatStatus;
  photo?: string;
  medical_history?: string;
  needs_medication: boolean;
  can_bathe: boolean;
  needs_bathe: boolean;
  is_neutered: boolean;
  gender: 'male' | 'female';
  last_bath_date?: string;
}

export interface MedicationLog {
  id: number;
  cat_id: number;
  cat_name?: string;
  employee_id: number;
  employee_name?: string;
  created_at: string;
  note: string;
}

export interface MedicationPlan {
  id: number;
  cat_id: number;
  cat_name?: string;
  name: string;
  dosage: string;
  days: number;
  frequency: string;
  timing: string;
  end_date: string;
  needs_nebulization: boolean;
  needs_oxygen: boolean;
}

export interface BathLog {
  id: number;
  cat_id: number;
  cat_name?: string;
  employee_id: number;
  employee_name?: string;
  created_at: string;
  is_completed: boolean;
  completed_at?: string;
}

export interface CareLog {
  id: number;
  cat_id: number;
  cat_name?: string;
  care_type: string;
  employee_id: number;
  employee_name?: string;
  created_at: string;
  note?: string;
}

export interface CatVaccine {
  id: number;
  cat_id: number;
  cat_name?: string;
  category_id: number;
  category_name?: string;
  type?: string;
  start_date: string;
  end_date: string;
}

export interface WeightRecord {
  id: number;
  cat_id: number;
  weight: number;
  date: string;
}

export interface AppSettings {
  system_logo?: string;
}

export type Language = 'zh' | 'en';
