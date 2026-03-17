import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { 
  Cat, 
  Employee, 
  Branch, 
  Breed, 
  Role, 
  CatStatus, 
  MedicationLog, 
  Language,
  AppSettings,
  RolePermissions
} from './types';
import { translations } from './translations';
import { 
  LayoutDashboard, 
  Cat as CatIcon, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Camera, 
  Download, 
  Bell,
  Languages,
  ChevronRight,
  Trash2,
  Edit,
  Save,
  X,
  Stethoscope,
  Activity,
  Weight,
  Syringe,
  Calendar,
  User,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Database as DatabaseIcon,
  HardDrive,
  Upload,
  Cloud,
  Scissors
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { analyzeCatPhoto } from './services/geminiService';

// --- Custom Toast & Confirm ---
let toastTimeout: any;
export const toast = (msg: string) => {
  const el = document.getElementById('global-toast');
  if (el) {
    el.innerText = msg;
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, 0)';
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%, -20px)';
    }, 3000);
  }
};

let confirmCallback: (() => void) | null = null;
export const confirmAction = (msg: string, onConfirm: () => void) => {
  const el = document.getElementById('global-confirm');
  if (el) {
    const msgEl = document.getElementById('global-confirm-msg');
    if (msgEl) msgEl.innerText = msg;
    el.style.display = 'flex';
    confirmCallback = onConfirm;
  }
};

export const closeConfirm = () => {
  const el = document.getElementById('global-confirm');
  if (el) el.style.display = 'none';
  confirmCallback = null;
};

export const acceptConfirm = () => {
  if (confirmCallback) confirmCallback();
  closeConfirm();
};
// ------------------------------

// --- Helpers ---
const getMalaysiaTime = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
};

const getTodayStr = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

const parseDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  let d = dateStr;
  if (!d.includes('Z') && !d.includes('+') && d.includes(' ')) {
    d = d.replace(' ', 'T') + 'Z';
  } else if (!d.includes('Z') && !d.includes('+') && d.includes('T')) {
    d = d + 'Z';
  }
  return new Date(d);
};

const formatMsiaTime = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = parseDate(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'Asia/Kuala_Lumpur' });
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// --- Image Cropper Component ---
const ImageCropper = ({ image, onCropComplete, onCancel, t }: any) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop: any) => setCrop(crop);
  const onZoomChange = (zoom: any) => setZoom(zoom);
  const onCropCompleteInternal = useCallback((_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return canvas.toDataURL('image/jpeg');
  };

  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="relative flex-1">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteInternal}
          onZoomChange={onZoomChange}
        />
      </div>
      <div className="p-6 bg-white flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e: any) => setZoom(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>{t.cancel}</Button>
          <Button onClick={handleSave}>{t.save}</Button>
        </div>
      </div>
    </div>
  );
};

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const baseStyles = "px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type = 'text', placeholder = '', className = '', required = false }: any) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-700">{label}{required && '*'}</label>}
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
    />
  </div>
);

const Select = ({ label, value, onChange, options = [], className = '', required = false }: any) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    {label && <label className="text-sm font-medium text-gray-700">{label}{required && '*'}</label>}
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
    >
      <option value="" disabled>Select...</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<Employee | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [view, setView] = useState<'dashboard' | 'cats' | 'employees' | 'settings' | 'vaccines' | 'weight' | 'medication' | 'bath' | 'tasks' | 'vet' | 'care'>('dashboard');
  
  const [cats, setCats] = useState<Cat[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  
  const [vaccineCategories, setVaccineCategories] = useState<any[]>([]);
  const [catVaccines, setCatVaccines] = useState<any[]>([]);
  const [weightRecords, setWeightRecords] = useState<any[]>([]);
  const [medicationPlans, setMedicationPlans] = useState<any[]>([]);
  const [bathLogs, setBathLogs] = useState<any[]>([]);
  const [careLogs, setCareLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [vetVisits, setVetVisits] = useState<any[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<boolean>(false);
  const [allPermissions, setAllPermissions] = useState<Record<string, RolePermissions>>({});
  const [notifications, setNotifications] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [selectedCatIds, setSelectedCatIds] = useState<number[]>([]);
  const [editingCat, setEditingCat] = useState<Partial<Cat> | null>(null);
  const [catEditLogs, setCatEditLogs] = useState<any[]>([]);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [showNewBreedInput, setShowNewBreedInput] = useState(false);
  const [newBreedName, setNewBreedName] = useState('');
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [onCropDone, setOnCropDone] = useState<((base64: string) => void) | null>(null);

  const t = translations[lang];

  useEffect(() => {
    const savedUser = localStorage.getItem('cat_cafe_user');
    const savedBranch = localStorage.getItem('cat_cafe_branch');
    const savedTheme = localStorage.getItem('cat_cafe_theme') as 'light' | 'dark';
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      if (savedBranch) setCurrentBranch(JSON.parse(savedBranch));
    }
    if (savedTheme) setTheme(savedTheme);
    fetchInitialData();
  }, []);

  useEffect(() => {
    localStorage.setItem('cat_cafe_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const fetchInitialData = async () => {
    try {
      const endpoints = [
        '/api/branches', '/api/breeds', '/api/cats', '/api/employees',
        '/api/settings', '/api/medication-logs', '/api/vaccine-categories',
        '/api/cat-vaccines', '/api/weight-records', '/api/medication-plans',
        '/api/permissions', '/api/bath-logs', '/api/tasks', '/api/vet-visits',
        '/api/status', '/api/care-logs'
      ];
      
      const responses = await Promise.all(endpoints.map(e => fetch(e)));
      
      // Check if all responses are ok
      for (const res of responses) {
        if (!res.ok) {
          console.warn(`Fetch failed for ${res.url}: ${res.status}`);
        }
      }

      const data = await Promise.all(responses.map(res => res.ok ? res.json() : Promise.resolve(null)));

      if (data[0]) setBranches(data[0]);
      if (data[1]) setBreeds(data[1]);
      if (data[2]) setCats(data[2]);
      if (data[3]) setEmployees(data[3]);
      if (data[4]) setSettings(data[4]);
      if (data[5]) setLogs(data[5]);
      if (data[6]) setVaccineCategories(data[6]);
      if (data[7]) setCatVaccines(data[7]);
      if (data[8]) setWeightRecords(data[8]);
      if (data[9]) setMedicationPlans(data[9]);
      if (data[10]) setAllPermissions(data[10]);
      if (data[11]) setBathLogs(data[11]);
      if (data[12]) setTasks(data[12]);
      if (data[13]) setVetVisits(data[13]);
      if (data[14]) setSupabaseStatus(data[14].supabase);
      if (data[15]) setCareLogs(data[15]);

      const savedUser = localStorage.getItem('cat_cafe_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        const attRes = await fetch(`/api/attendance/${u.id}`);
        if (attRes.ok) setAttendance(await attRes.json());
        
        // Refresh permissions from the already fetched data[10]
        if (data[10] && data[10][u.role]) {
          setPermissions(data[10][u.role]);
        }
      }
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      if (res.ok) {
        const { user, branch, permissions } = await res.json();
        setUser(user);
        setCurrentBranch(branch);
        setPermissions(permissions);
        localStorage.setItem('cat_cafe_user', JSON.stringify(user));
        if (branch) localStorage.setItem('cat_cafe_branch', JSON.stringify(branch));
        
        const attRes = await fetch(`/api/attendance/${user.id}`);
        setAttendance(await attRes.json());
        
        // Load all data after successful login
        await fetchInitialData();
      } else {
        const err = await res.json();
        toast(err.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error", error);
      toast("Network error or server is down");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentBranch(null);
    localStorage.removeItem('cat_cafe_user');
    localStorage.removeItem('cat_cafe_branch');
    setAttendance([]);
  };

  const handleClockInOut = async (type: 'clock_in' | 'clock_out') => {
    if (!user) return;
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: user.id, type })
      });
      const attRes = await fetch(`/api/attendance/${user.id}`);
      setAttendance(await attRes.json());
    } catch (error) {
      console.error("Clock in/out failed:", error);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "";
    const birth = new Date(birthDate);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years}${t.years} ${months}${t.months}`;
  };

  const saveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingCat?.id ? 'PUT' : 'POST';
    const url = editingCat?.id ? `/api/cats/${editingCat.id}` : '/api/cats';
    
    // Strip non-db fields
    const { 
      id, created_at, lastUpdated, branch_name, breed_name, branches, breeds, 
      ...rest 
    } = editingCat || {};

    const catData = {
      ...rest,
      branch_id: rest.branch_id || currentBranch?.id || branches?.[0]?.id,
      can_bathe: rest.can_bathe ?? true,
      is_neutered: rest.is_neutered ?? false,
      employee_id: user?.id
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(catData)
    });
    if (res.ok) {
      setIsCatModalOpen(false);
      fetchInitialData();
      toast(editingCat?.id ? "已完成修改" : "已完成添加");
    }
  };

  const deleteCat = async (id: number) => {
    if (!permissions.delete_cat) return;
    confirmAction("Are you sure?", async () => {
      const res = await fetch(`/api/cats/${id}`, { method: 'DELETE' });
      if (res.ok) fetchInitialData();
    });
  };

  const deleteEmployee = async (id: number) => {
    if (!permissions.delete_employee) return;
    confirmAction("Are you sure?", async () => {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) fetchInitialData();
    });
  };

  const handleBulkStatusUpdate = async (status: CatStatus) => {
    if (selectedCatIds.length === 0) return;
    const res = await fetch('/api/cats/bulk/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedCatIds, status })
    });
    if (res.ok) {
      setSelectedCatIds([]);
      fetchInitialData();
      toast("Bulk update successful");
    }
  };

  const logMedication = async (catId: number, note: string = "Medication given") => {
    try {
      const res = await fetch('/api/medication-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cat_id: catId,
          employee_id: user?.id,
          note
        })
      });
      if (res.ok) {
        fetchInitialData();
      } else {
        toast("Failed to log medication");
      }
    } catch (e) {
      console.error(e);
      toast("Error logging medication");
    }
  };

  const logBath = async (catId: number) => {
    if (!user) return;
    const res = await fetch('/api/bath-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cat_id: catId,
        employee_id: user.id
      })
    });
    if (res.ok) {
      fetchInitialData();
    }
  };

  const toggleBathComplete = async (log: any) => {
    if (!user) return;
    const res = await fetch(`/api/bath-logs/${log.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: !log.is_completed, completed_by: user.id })
    });
    if (res.ok) {
      fetchInitialData();
    }
  };

  const deleteLog = async (logId: number) => {
    confirmAction("确定要删除这条喂药记录吗？", async () => {
      const res = await fetch(`/api/medication-logs/${logId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchInitialData();
        toast("已完成删除");
      }
    });
  };

  const exportToExcel = () => {
    if (!permissions.export_excel) {
      toast("Only admins can export data.");
      return;
    }
    const data = cats.map(c => ({
      [t.name]: c.name,
      [t.breed]: c.breed_name,
      [t.branch]: c.branch_name,
      [t.age]: calculateAge(c.birth_date),
      [t.weight]: `${c.weight}kg`,
      [t.vaccineExpiry]: c.vaccine_expiry,
      [t.status]: c.status,
      [t.medicalHistory]: c.medical_history || 'None'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cats");
    XLSX.writeFile(wb, `MeowManager_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const data = [{
      [t.name]: "Mochi",
      [t.breed]: breeds[0]?.name || "Ragdoll",
      [t.branch]: branches[0]?.name || "Main Branch",
      [t.birthDate]: "2023-01-01",
      [t.weight]: "4.5",
      [t.gender]: t.male,
      [t.status]: t.normal,
      [t.note]: "Very friendly"
    }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `MeowManager_Cat_Template.xlsx`);
  };

  const handleImportCats = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const mappedCats = data.map(row => {
          // Map column names back to properties
          // Using translations to find the right keys
          const findKey = (label: string) => {
            if (row[label] !== undefined) return row[label];
            // Try to find by translation
            const zhKey = Object.keys(translations.zh).find(k => (translations.zh as any)[k] === label);
            if (zhKey && row[label] === undefined) {
               // This is a bit tricky, let's just assume the user uses the exported column names or standard ones
            }
            return row[label];
          };

          const name = row[t.name] || row['Name'] || row['名字'] || row['猫名'];
          const breedName = row[t.breed] || row['Breed'] || row['品种'];
          const branchName = row[t.branch] || row['Branch'] || row['分店'];
          const birthDate = row[t.birthDate] || row['Birth Date'] || row['出生日期'] || row['Birthday'] || row['生日'] || row['Date of Birth'] || row['DOB'];
          const weight = parseFloat(row[t.weight] || row['Weight'] || row['体重'] || '0');
          const status = row[t.status] || row['Status'] || row['状态'] || 'normal';
          const gender = row[t.gender] || row['Gender'] || row['性别'] || 'male';
          const medicalHistory = row[t.medicalHistory] || row[t.note] || row['Medical History'] || row['备注'] || '';

          const breed = breeds.find(b => b.name === breedName);
          const branch = branches.find(b => b.name === branchName);

          // Handle Excel date format if it's a number
          let formattedBirthDate = birthDate;
          if (typeof birthDate === 'number') {
            const date = new Date((birthDate - 25569) * 86400 * 1000);
            formattedBirthDate = date.toISOString().split('T')[0];
          }

          return {
            name,
            breed_id: breed?.id || breeds[0]?.id,
            branch_id: branch?.id || currentBranch?.id || branches[0]?.id,
            birth_date: formattedBirthDate,
            weight,
            status: status === t.monitoring ? 'observation' : (status === t.sick ? 'sick' : 'normal'),
            gender: gender === t.female ? 'female' : 'male',
            medical_history: medicalHistory
          };
        }).filter(c => c.name);

        if (mappedCats.length === 0) {
          toast("No valid cat data found in file.");
          return;
        }

        const res = await fetch('/api/cats/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappedCats)
        });

        if (res.ok) {
          toast(`Successfully imported ${mappedCats.length} cats.`);
          fetchInitialData();
        } else {
          const err = await res.json();
          toast(err.error || "Import failed");
        }
      } catch (error) {
        console.error("Import error:", error);
        toast("Error parsing file. Please ensure it's a valid Excel file.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (base64: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImage(reader.result as string);
        setOnCropDone(() => callback);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAIAnalyze = async (photo: string) => {
    if (!photo) return;
    const analysis = await analyzeCatPhoto(photo);
    if (analysis) {
      setEditingCat(prev => ({
        ...prev,
        breed_id: breeds.find(b => b.name.toLowerCase().includes(analysis.breed.toLowerCase()))?.id || prev?.breed_id,
        medical_history: (prev?.medical_history || '') + `\nAI Observation: ${analysis.observations}`
      }));
      toast(`AI Analysis: ${analysis.breed} - ${analysis.healthStatus}`);
    }
  };

  // --- Sorting & Filtering ---
  const [sortConfig, setSortConfig] = useState<{ key: keyof Cat; direction: 'asc' | 'desc' }[]>([
    { key: 'name', direction: 'asc' }
  ]);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyModalCat, setHistoryModalCat] = useState<any>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    const catId = editingCat?.id || historyModalCat?.id;
    if (catId) {
      fetch(`/api/cats/${catId}/edit-logs`)
        .then(res => res.json())
        .then(data => setCatEditLogs(data))
        .catch(console.error);
    } else {
      setCatEditLogs([]);
    }
  }, [editingCat?.id, historyModalCat?.id]);

  useEffect(() => {
    if (!user) return;
    
    const newNotifications: any[] = [];
    
    // Task notifications
    const myTasks = tasks.filter((tk: any) => tk.assigned_to === user.id && tk.status !== 'completed');
    myTasks.forEach((tk: any) => {
      newNotifications.push({
        type: 'task',
        title: 'New Task Assigned',
        message: tk.title,
        onClick: () => setView('tasks')
      });
    });
    
    // Vaccine notifications
    const tenDaysFromNow = getMalaysiaTime();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    const tenDaysStr = tenDaysFromNow.toISOString().split('T')[0];
    
    const upcomingVac = catVaccines.filter((v: any) => {
      const cat = cats.find(c => c.id === v.cat_id);
      return !v.is_completed && v.end_date <= tenDaysStr && (user.role === 'admin' || cat?.branch_id === user.branch_id);
    });
    
    upcomingVac.forEach((v: any) => {
      newNotifications.push({
        type: 'vaccine',
        title: 'Upcoming Vaccination',
        message: `${v.cat_name} - ${v.category_name} due by ${formatMsiaTime(v.end_date)}`,
        onClick: () => {
          const cat = cats.find(c => c.id === v.cat_id);
          if (cat) {
            setHistoryModalCat(cat);
            setIsHistoryModalOpen(true);
          }
        }
      });
    });
    
    setNotifications(newNotifications);
  }, [tasks, catVaccines, cats, user?.id]);

  const visibleCats = useMemo(() => {
    if (user?.role === 'admin') return cats;
    return cats.filter(c => c.branch_id === user?.branch_id);
  }, [cats, user]);

  const visibleEmployees = useMemo(() => {
    if (user?.role === 'admin') return employees;
    return employees.filter(e => e.branch_id === user?.branch_id);
  }, [employees, user]);

  const visibleVaccines = useMemo(() => {
    if (user?.role === 'admin') return catVaccines;
    return catVaccines.filter(v => visibleCats.some(c => c.id === v.cat_id));
  }, [catVaccines, visibleCats, user]);

  const visibleWeightRecords = useMemo(() => {
    if (user?.role === 'admin') return weightRecords;
    return weightRecords.filter(r => visibleCats.some(c => c.id === r.cat_id));
  }, [weightRecords, visibleCats, user]);

  const visibleMedicationPlans = useMemo(() => {
    if (user?.role === 'admin') return medicationPlans;
    return medicationPlans.filter(p => visibleCats.some(c => c.id === p.cat_id));
  }, [medicationPlans, visibleCats, user]);

  const visibleBathLogs = useMemo(() => {
    if (user?.role === 'admin') return bathLogs;
    return bathLogs.filter(l => visibleCats.some(c => c.id === l.cat_id));
  }, [bathLogs, visibleCats, user]);

  const visibleLogs = useMemo(() => {
    if (user?.role === 'admin') return logs;
    return logs.filter(l => visibleCats.some(c => c.id === l.cat_id));
  }, [logs, visibleCats, user]);

  const visibleTasks = useMemo(() => {
    if (user?.role === 'admin') return tasks;
    return tasks.filter(t => t.branch_id === user?.branch_id || t.branch_id === null);
  }, [tasks, user]);

  const visibleVetVisits = useMemo(() => {
    if (user?.role === 'admin') return vetVisits;
    return vetVisits.filter(v => v.branch_id === user?.branch_id);
  }, [vetVisits, user]);

  const sortedAndFilteredCats = useMemo(() => {
    let result = visibleCats.map(cat => {
      const catWeights = weightRecords.filter(r => r.cat_id === cat.id);
      const catVaccinesList = catVaccines.filter(v => v.cat_id === cat.id);
      const catMedLogs = logs.filter(l => l.cat_id === cat.id);
      const catBathLogs = bathLogs.filter(b => b.cat_id === cat.id);
      const catCareLogs = careLogs.filter(c => c.cat_id === cat.id);
      const catVetVisits = vetVisits.filter(v => v.cat_id === cat.id);

      const dates = [
        ...catWeights.map(r => r.date),
        ...catVaccinesList.map(v => v.completed_at || v.start_date),
        ...catMedLogs.map(l => l.created_at),
        ...catBathLogs.map(b => b.completed_at || b.created_at),
        ...catCareLogs.map(c => c.created_at),
        ...catVetVisits.map(v => v.completed_date || v.request_date || v.created_at)
      ].filter(Boolean).map(d => new Date(d).getTime());

      const lastUpdated = dates.length > 0 ? Math.max(...dates) : 0;
      return { ...cat, lastUpdated };
    });

    // Filter
    if (user?.role === 'admin' && filterBranch !== 'all') {
      result = result.filter(c => c.branch_id === parseInt(filterBranch));
    }
    if (filterStatus !== 'all') result = result.filter(c => c.status === filterStatus);
    if (searchQuery) result = result.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Sort (Multi-level)
    result.sort((a, b) => {
      for (const config of sortConfig) {
        const aVal = (a as any)[config.key];
        const bVal = (b as any)[config.key];
        if (aVal === undefined || bVal === undefined) continue;
        if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [cats, sortConfig, filterBranch, filterStatus, searchQuery, weightRecords, catVaccines, logs, bathLogs]);

  const toggleSort = (key: keyof Cat) => {
    setSortConfig(prev => {
      const existing = prev.find(c => c.key === key);
      if (existing) {
        if (existing.direction === 'asc') return [{ key, direction: 'desc' }];
        return [{ key: 'name', direction: 'asc' }]; // Reset to default
      }
      return [{ key, direction: 'asc' }];
    });
  };

  // --- Views ---

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <LoginView 
    t={t} 
    loginData={loginData} 
    setLoginData={setLoginData} 
    handleLogin={handleLogin} 
  />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Global Toast */}
      <div id="global-toast" className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-lg z-[9999] transition-all duration-300 pointer-events-none opacity-0 -translate-y-5 font-medium"></div>
      
      {/* Global Confirm */}
      <div id="global-confirm" className="fixed inset-0 bg-black/50 z-[9999] hidden items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Confirm Action</h3>
          <p id="global-confirm-msg" className="text-gray-600"></p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeConfirm}>Cancel</Button>
            <Button variant="primary" onClick={acceptConfirm}>Confirm</Button>
          </div>
        </div>
      </div>

      <Sidebar 
        user={user} 
        currentBranch={currentBranch} 
        view={view} 
        setView={setView} 
        handleLogout={handleLogout} 
        lang={lang} 
        setLang={setLang} 
        t={t} 
        attendance={attendance}
        handleClockInOut={handleClockInOut}
        permissions={permissions}
        notifications={notifications}
        supabaseStatus={supabaseStatus}
      />
      <main className="flex-1 p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && (
              <DashboardView 
                cats={visibleCats} 
                logs={visibleLogs} 
                currentBranch={currentBranch} 
                t={t} 
                exportToExcel={exportToExcel} 
                logMedication={logMedication}
                deleteLog={deleteLog}
                toggleBathComplete={toggleBathComplete}
                bathLogs={visibleBathLogs}
                calculateAge={calculateAge}
                catVaccines={visibleVaccines}
                medicationPlans={visibleMedicationPlans}
                tasks={visibleTasks}
                vetVisits={visibleVetVisits}
                settings={settings}
                fetchInitialData={fetchInitialData}
                user={user}
                setHistoryModalCat={setHistoryModalCat}
                setIsHistoryModalOpen={setIsHistoryModalOpen}
                setView={setView}
              />
            )}
            {view === 'cats' && (
              <CatListView 
                cats={sortedAndFilteredCats} 
                t={t} 
                setEditingCat={setEditingCat} 
                setIsCatModalOpen={setIsCatModalOpen} 
                filterBranch={filterBranch}
                setFilterBranch={setFilterBranch}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                branches={branches}
                toggleSort={toggleSort}
                calculateAge={calculateAge}
                permissions={permissions}
                deleteCat={deleteCat}
                user={user}
                setHistoryModalCat={setHistoryModalCat}
                setIsHistoryModalOpen={setIsHistoryModalOpen}
                fetchInitialData={fetchInitialData}
                selectedCatIds={selectedCatIds}
                setSelectedCatIds={setSelectedCatIds}
                handleBulkStatusUpdate={handleBulkStatusUpdate}
                handleImportCats={handleImportCats}
                handleDownloadTemplate={handleDownloadTemplate}
              />
            )}
            {view === 'vaccines' && (
              <VaccineManagementView 
                cats={visibleCats} 
                catVaccines={visibleVaccines} 
                vaccineCategories={vaccineCategories} 
                t={t} 
                fetchInitialData={fetchInitialData} 
                branches={branches}
                user={user}
              />
            )}
            {view === 'weight' && (
              <WeightManagementView 
                cats={visibleCats} 
                weightRecords={visibleWeightRecords} 
                t={t} 
                fetchInitialData={fetchInitialData} 
                user={user}
                branches={branches}
              />
            )}
            {view === 'medication' && (
              <MedicationManagementView 
                cats={visibleCats} 
                medicationPlans={visibleMedicationPlans} 
                t={t} 
                fetchInitialData={fetchInitialData} 
                logs={visibleLogs}
                user={user}
                setHistoryModalCat={setHistoryModalCat}
                setIsHistoryModalOpen={setIsHistoryModalOpen}
              />
            )}
            {view === 'bath' && (
              <BathManagementView 
                bathLogs={visibleBathLogs} 
                t={t} 
                cats={visibleCats}
                user={user}
                fetchInitialData={fetchInitialData}
                branches={branches}
                toggleBathComplete={toggleBathComplete}
                setHistoryModalCat={setHistoryModalCat}
                setIsHistoryModalOpen={setIsHistoryModalOpen}
              />
            )}
            {view === 'care' && (
              <PetCareView 
                careLogs={careLogs} 
                t={t} 
                cats={visibleCats}
                user={user}
                fetchInitialData={fetchInitialData}
                branches={branches}
                setHistoryModalCat={setHistoryModalCat}
                setIsHistoryModalOpen={setIsHistoryModalOpen}
              />
            )}
            {view === 'tasks' && (
              <TaskManagementView 
                tasks={visibleTasks}
                employees={visibleEmployees}
                branches={branches}
                user={user}
                t={t}
                fetchInitialData={fetchInitialData}
              />
            )}
            {view === 'vet' && (
              <VetManagementView 
                vetVisits={vetVisits}
                cats={visibleCats}
                employees={visibleEmployees}
                branches={branches}
                user={user}
                t={t}
                fetchInitialData={fetchInitialData}
              />
            )}
            {view === 'settings' && (
              <AdminDashboardView 
                branches={branches} 
                setBranches={setBranches} 
                breeds={breeds} 
                fetchInitialData={fetchInitialData} 
                t={t} 
                handlePhotoUpload={handlePhotoUpload}
                allPermissions={allPermissions}
                setAllPermissions={setAllPermissions}
                vaccineCategories={vaccineCategories}
                setVaccineCategories={setVaccineCategories}
                settings={settings}
                setSettings={setSettings}
                user={user}
                employees={employees}
                theme={theme}
                setTheme={setTheme}
                lang={lang}
                setLang={setLang}
                supabaseStatus={supabaseStatus}
              />
            )}
            {view === 'employees' && (
              <EmployeeManagementView 
                employees={visibleEmployees} 
                t={t} 
                setEditingEmployee={setEditingEmployee} 
                setIsEmployeeModalOpen={setIsEmployeeModalOpen} 
                permissions={permissions}
                deleteEmployee={deleteEmployee}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <CatHistoryModal 
        cat={historyModalCat} 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
        t={t} 
        vaccines={catVaccines} 
        weightRecords={weightRecords} 
        medicationLogs={logs} 
        bathLogs={bathLogs} 
        careLogs={careLogs}
        vetVisits={vetVisits}
        editLogs={catEditLogs}
        branches={branches}
        user={user}
        fetchInitialData={fetchInitialData}
      />

      {cropImage && (
        <ImageCropper 
          image={cropImage} 
          t={t}
          onCropComplete={(cropped: string) => {
            if (onCropDone) onCropDone(cropped);
            setCropImage(null);
            setOnCropDone(null);
          }}
          onCancel={() => {
            setCropImage(null);
            setOnCropDone(null);
          }}
        />
      )}

      {/* Cat Modal */}
      <Modal 
        isOpen={isCatModalOpen} 
        onClose={() => setIsCatModalOpen(false)} 
        title={editingCat?.id ? t.editCat : t.addCat}
      >
        <form onSubmit={saveCat} className="space-y-6">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl bg-gray-100 overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                {editingCat?.photo ? (
                  <img src={editingCat.photo} className="w-full h-full object-cover" />
                ) : (
                  <Camera size={32} className="text-gray-400" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => handlePhotoUpload(e, (b) => setEditingCat(p => ({ ...p, photo: b })))}
              />
              {editingCat?.photo && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="absolute -bottom-2 -right-2 shadow-lg"
                  onClick={() => handleAIAnalyze(editingCat.photo!)}
                >
                  <Stethoscope size={14} /> AI
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label={t.name} value={editingCat?.name || ''} onChange={(v: string) => setEditingCat(p => ({ ...p, name: v }))} required />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t.breed}{'*'}</label>
              <div className="flex gap-2">
                {showNewBreedInput ? (
                  <>
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="New Breed Name"
                      value={newBreedName}
                      onChange={(e) => setNewBreedName(e.target.value)}
                    />
                    <button 
                      type="button"
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg"
                      onClick={() => {
                        if (newBreedName) {
                          fetch('/api/breeds', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newBreedName })
                          }).then(res => res.json()).then((data) => {
                            fetchInitialData();
                            setEditingCat(p => ({ ...p, breed_id: data.id }));
                            setShowNewBreedInput(false);
                            setNewBreedName('');
                            toast("已完成添加");
                          });
                        }
                      }}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <button type="button" onClick={() => setShowNewBreedInput(false)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg">
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <select
                      value={editingCat?.breed_id || ''}
                      onChange={(e) => setEditingCat(p => ({ ...p, breed_id: parseInt(e.target.value) }))}
                      required
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                    >
                      <option value="">Select Breed</option>
                      {breeds.map((b: any) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => setShowNewBreedInput(true)}
                      className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <Input label={t.birthDate} type="date" value={editingCat?.birth_date || ''} onChange={(v: string) => setEditingCat(p => ({ ...p, birth_date: v }))} required />
            <Select 
              label={t.gender} 
              value={editingCat?.gender || 'male'} 
              onChange={(v: string) => setEditingCat(p => ({ ...p, gender: v }))}
              options={[
                { value: 'male', label: t.male },
                { value: 'female', label: t.female }
              ]}
              required
            />
            <Select 
              label={t.status} 
              value={editingCat?.status || 'normal'} 
              onChange={(v: string) => setEditingCat(p => ({ ...p, status: v as CatStatus }))}
              options={[
                { value: 'normal', label: t.normal },
                { value: 'observation', label: t.monitoring },
                { value: 'sick', label: t.sick }
              ]}
              disabled={!permissions?.edit_cat_status}
            />
            {user?.role === 'admin' && (
              <Select 
                label={t.branch} 
                value={editingCat?.branch_id || ''} 
                onChange={(v: string) => setEditingCat(p => ({ ...p, branch_id: parseInt(v) }))}
                options={branches.map(b => ({ value: b.id, label: b.name }))}
                required
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={editingCat?.can_bathe ?? true} 
                onChange={(e) => setEditingCat(p => ({ ...p, can_bathe: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label className="text-sm font-medium text-gray-700">{t.canBathe}</label>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={editingCat?.is_neutered || false} 
                onChange={(e) => setEditingCat(p => ({ ...p, is_neutered: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <label className="text-sm font-medium text-gray-700">{t.isNeutered}</label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t.medicalHistory}</label>
            <textarea
              value={editingCat?.medical_history || ''}
              onChange={(e) => setEditingCat(p => ({ ...p, medical_history: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-gray-200 min-h-[100px] focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>

          {catEditLogs.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-4">
              <label className="text-sm font-medium text-gray-700">Edit History</label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm space-y-2">
                {catEditLogs.map((log: any) => (
                  <div key={log.id} className="pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                    <div className="flex justify-between text-gray-500 text-xs mb-1">
                      <span>{log.employee_name}</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-gray-700">
                      {Object.entries(JSON.parse(log.changes)).map(([key, value]: [string, any]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {value.old} &rarr; {value.new}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            <Button variant="secondary" onClick={() => setIsCatModalOpen(false)}>{t.cancel}</Button>
            <Button type="submit">{t.save}</Button>
          </div>
        </form>
      </Modal>

      {/* Employee Modal */}
      <Modal 
        isOpen={isEmployeeModalOpen} 
        onClose={() => setIsEmployeeModalOpen(false)} 
        title={editingEmployee?.id ? "Edit Employee" : "Add Employee"}
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          const method = editingEmployee?.id ? 'PUT' : 'POST';
          const url = editingEmployee?.id ? `/api/employees/${editingEmployee.id}` : '/api/employees';
          
          // Strip non-db fields and handle password
          const { id, created_at, branch_name, branches, ...rest } = editingEmployee || {};
          const employeeData: any = {
            name: rest.name,
            role: rest.role || 'staff',
            branch_id: rest.branch_id,
            avatar: rest.avatar,
            username: rest.username,
          };
          
          if (rest.password) {
            employeeData.password = rest.password;
          }

          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employeeData)
          });
          if (res.ok) {
            setIsEmployeeModalOpen(false);
            fetchInitialData();
            toast(editingEmployee?.id ? "已完成修改" : "已完成添加");
          } else {
            const error = await res.json();
            toast(error.error || "操作失败");
          }
        }} className="space-y-6">
          <div className="flex justify-center">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-2 border-gray-200 flex items-center justify-center">
                {editingEmployee?.avatar ? (
                  <img src={editingEmployee.avatar} className="w-full h-full object-cover" />
                ) : (
                  <User size={32} className="text-gray-400" />
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={(e) => handlePhotoUpload(e, (b) => setEditingEmployee(p => ({ ...p, avatar: b })))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label={t.name} value={editingEmployee?.name || ''} onChange={(v: string) => setEditingEmployee(p => ({ ...p, name: v }))} required />
            <Select 
              label={t.role} 
              value={editingEmployee?.role || 'staff'} 
              onChange={(v: string) => setEditingEmployee(p => ({ ...p, role: v as Role }))}
              options={[
                { value: 'admin', label: t.admin },
                { value: 'manager', label: t.manager },
                { value: 'supervisor', label: t.supervisor },
                { value: 'staff', label: t.staff }
              ]}
              required
            />
            <Select 
              label={t.branch} 
              value={editingEmployee?.branch_id || ''} 
              onChange={(v: string) => setEditingEmployee(p => ({ ...p, branch_id: v === 'all' ? null : parseInt(v) }))}
              options={[
                ...(editingEmployee?.role === 'admin' ? [{ value: 'all', label: 'All Branches' }] : []),
                ...branches.map(b => ({ value: b.id, label: b.name }))
              ]}
              required={editingEmployee?.role !== 'admin'}
            />
            <Input label={t.username} value={editingEmployee?.username || ''} onChange={(v: string) => setEditingEmployee(p => ({ ...p, username: v }))} required />
            <Input label={t.password} type="password" value={editingEmployee?.password || ''} onChange={(v: string) => setEditingEmployee(p => ({ ...p, password: v }))} required={!editingEmployee?.id} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsEmployeeModalOpen(false)}>{t.cancel}</Button>
            <Button type="submit">{t.save}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// --- Sub-Components ---

const SidebarItem = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active 
        ? 'bg-indigo-50 text-indigo-600 font-bold' 
        : 'text-gray-600 hover:bg-gray-50'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const VetManagementView = ({ vetVisits, cats, employees, user, t, fetchInitialData, branches }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredVisits = vetVisits.filter((v: any) => {
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchesSearch = v.cat_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         v.condition?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const saveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingVisit.id ? 'PUT' : 'POST';
    const url = editingVisit.id ? `/api/vet-visits/${editingVisit.id}` : '/api/vet-visits';
    
    const visitData = {
      ...editingVisit,
      requested_by: editingVisit.requested_by || user.id,
      request_date: editingVisit.request_date || new Date().toISOString().split('T')[0],
      branch_id: editingVisit.branch_id || user.branch_id
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visitData)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingVisit(null);
      fetchInitialData();
      toast("Success");
    }
  };

  const updateStatus = async (visit: any, status: string) => {
    const updateData: any = { 
      ...visit, 
      status,
    };

    // If authorizing a pending visit
    if (visit.status === 'pending' && status === 'in_progress') {
      updateData.authorized_by = user.id;
    }

    // If completing a visit
    if (status === 'completed') {
      updateData.completed_date = new Date().toISOString().split('T')[0];
    }

    const res = await fetch(`/api/vet-visits/${visit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (res.ok) fetchInitialData();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.vet}</h1>
        <p className="text-gray-500">{t.manageVet}</p>
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder={t.searchCat}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">{t.allStatus}</option>
            <option value="pending">{t.pending}</option>
            <option value="in_progress">{t.inProgress}</option>
            <option value="completed">{t.completed}</option>
          </select>
        </div>
        <Button onClick={() => { setEditingVisit({ request_date: new Date().toISOString().split('T')[0] }); setIsModalOpen(true); }}>
          <Plus size={18} /> {t.addVetVisit}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVisits.map((visit: any) => (
          <motion.div 
            key={visit.id}
            layout
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
            onClick={() => { setEditingVisit(visit); setIsModalOpen(true); }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-900">{visit.cat_name}</h3>
                <p className="text-xs text-gray-500">{t.applyDate}: {visit.request_date}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                visit.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                visit.status === 'in_progress' ? 'bg-amber-100 text-amber-600' :
                'bg-gray-100 text-gray-600'
              }`}>
                {t[visit.status] || visit.status}
              </span>
            </div>
            
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600 line-clamp-2 italic">"{visit.condition}"</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <User size={12} /> {t.requestBy}: {visit.requested_by_name}
              </div>
              {visit.authorized_to_name && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 size={12} /> {t.authorizedTo}: {visit.authorized_to_name}
                </div>
              )}
              {visit.clinic_name && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={12} /> {t.clinicName}: {visit.clinic_name}
                </div>
              )}
              {visit.completed_date && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={12} /> {t.completedAt}: {visit.completed_date}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              {visit.status === 'pending' && user.role !== 'staff' && (
                <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); setEditingVisit(visit); setIsModalOpen(true); }}>
                  Authorize
                </Button>
              )}
              {visit.status === 'in_progress' && (
                <Button size="sm" variant="secondary" className="flex-1" onClick={(e) => { e.stopPropagation(); setEditingVisit(visit); setIsModalOpen(true); }}>
                  Update Clinic
                </Button>
              )}
              {visit.status !== 'completed' && (
                <Button size="sm" variant="ghost" className="text-emerald-600" onClick={(e) => { e.stopPropagation(); updateStatus(visit, 'completed'); }}>
                  <CheckCircle2 size={16} />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingVisit?.id ? t.visitDetails : t.addVetVisit}
      >
        <form onSubmit={saveVisit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label={t.catList} 
              value={editingVisit?.cat_id || ''} 
              options={cats.map((c: any) => ({ value: c.id, label: c.name }))} 
              onChange={(v: string) => setEditingVisit({ ...editingVisit, cat_id: parseInt(v) })} 
              required 
              disabled={editingVisit?.id}
            />
            <Input 
              label={t.applyDate}
              type="date"
              value={editingVisit?.request_date || ''}
              onChange={(v: string) => setEditingVisit({ ...editingVisit, request_date: v })}
              required
              disabled={editingVisit?.id && user.role === 'staff'}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t.catCondition}</label>
            <textarea 
              className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[100px]"
              value={editingVisit?.condition || ''}
              onChange={(e) => setEditingVisit({ ...editingVisit, condition: e.target.value })}
              required
              disabled={editingVisit?.id && user.role === 'staff' && editingVisit.status !== 'pending'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label={t.authorizedTo} 
              value={editingVisit?.authorized_to || ''} 
              options={employees.map((e: any) => ({ value: e.id, label: e.name }))} 
              onChange={(v: string) => setEditingVisit({ ...editingVisit, authorized_to: parseInt(v), authorized_by: user.id, status: editingVisit.status === 'pending' ? 'in_progress' : editingVisit.status })} 
              disabled={editingVisit?.status === 'completed'}
            />
            <Select 
              label={t.status} 
              value={editingVisit?.status || 'pending'} 
              options={[
                { value: 'pending', label: t.pending },
                { value: 'in_progress', label: t.inProgress },
                { value: 'completed', label: t.completed }
              ]} 
              onChange={(v: string) => {
                const updates: any = { status: v };
                if (v === 'completed' && !editingVisit?.completed_date) {
                  updates.completed_date = '2026-03-02';
                }
                setEditingVisit({ ...editingVisit, ...updates });
              }} 
              disabled={editingVisit?.status === 'completed' || (user.role === 'staff' && editingVisit?.authorized_to !== user.id)}
            />
          </div>

          <Input 
            label={t.clinicName} 
            value={editingVisit?.clinic_name || ''} 
            onChange={(v: string) => setEditingVisit({ ...editingVisit, clinic_name: v })} 
            disabled={editingVisit?.status === 'completed'}
          />

          {editingVisit?.status === 'completed' && (
            <>
              <Input 
                label={t.completedAt} 
                type="date"
                value={editingVisit?.completed_date || ''} 
                onChange={(v: string) => setEditingVisit({ ...editingVisit, completed_date: v })} 
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">{t.diagnosis}</label>
                <textarea 
                  className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[80px]"
                  placeholder={t.diagnosisPlaceholder}
                  value={editingVisit?.diagnosis || ''}
                  onChange={(e) => setEditingVisit({ ...editingVisit, diagnosis: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
            <Button type="submit">{t.save}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const TaskManagementView = ({ tasks, employees, branches, user, t, fetchInitialData }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);

  const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'priority') {
        return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
      } else {
        return new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime();
      }
    });
  }, [tasks, sortBy]);

  const today = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);

  const overdueTasks = tasks.filter((task: any) => task.status !== 'completed' && task.due_date && new Date(task.due_date) < today);
  const dueSoonTasks = tasks.filter((task: any) => task.status !== 'completed' && task.due_date && new Date(task.due_date) >= today && new Date(task.due_date) <= threeDaysFromNow);

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingTask.id ? 'PUT' : 'POST';
    const url = editingTask.id ? `/api/tasks/${editingTask.id}` : '/api/tasks';
    
    const taskData = {
      ...editingTask,
      created_by: editingTask.created_by || user.id,
      status: editingTask.status || 'pending',
      priority: editingTask.priority || 'medium',
      branch_id: editingTask.branch_id === undefined ? user.branch_id : editingTask.branch_id
    };

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setEditingTask(null);
      fetchInitialData();
      toast("Task saved successfully");
    }
  };

  const deleteTask = async () => {
    if (!taskToDelete) return;
    const res = await fetch(`/api/tasks/${taskToDelete.id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchInitialData();
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  const updateTaskStatus = async (task: any, status: string) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, status })
    });
    if (res.ok) fetchInitialData();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500 text-white';
      case 'in_progress': return 'bg-indigo-500 text-white';
      case 'pending': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.tasks || 'Tasks'}</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-500">{tasks.length} tasks in total</p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Sort by:</span>
              <button 
                onClick={() => setSortBy('priority')} 
                className={`font-medium ${sortBy === 'priority' ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                Priority
              </button>
              <button 
                onClick={() => setSortBy('date')} 
                className={`font-medium ${sortBy === 'date' ? 'text-indigo-600' : 'text-gray-400'}`}
              >
                Due Date
              </button>
            </div>
          </div>
        </div>
        <Button onClick={() => { setEditingTask({}); setIsModalOpen(true); }}>
          <Plus size={18} /> {t.addTask || 'Add Task'}
        </Button>
      </header>

      {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueTasks.length > 0 && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-bold text-red-800">Overdue Tasks ({overdueTasks.length})</h3>
                <div className="mt-2 space-y-1">
                  {overdueTasks.slice(0, 3).map((task: any) => (
                    <p key={task.id} className="text-sm text-red-700 flex items-center gap-2">
                      <span className="font-medium">{task.title}</span>
                      <span className="text-xs opacity-70">Due: {task.due_date}</span>
                    </p>
                  ))}
                  {overdueTasks.length > 3 && <p className="text-xs text-red-600 italic">+ {overdueTasks.length - 3} more</p>}
                </div>
              </div>
            </div>
          )}
          {dueSoonTasks.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
              <Clock className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-bold text-amber-800">Due Soon ({dueSoonTasks.length})</h3>
                <div className="mt-2 space-y-1">
                  {dueSoonTasks.slice(0, 3).map((task: any) => (
                    <p key={task.id} className="text-sm text-amber-700 flex items-center gap-2">
                      <span className="font-medium">{task.title}</span>
                      <span className="text-xs opacity-70">Due: {task.due_date}</span>
                    </p>
                  ))}
                  {dueSoonTasks.length > 3 && <p className="text-xs text-amber-600 italic">+ {dueSoonTasks.length - 3} more</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['pending', 'in_progress', 'completed'].map((status) => (
          <div key={status} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold capitalize flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === 'completed' ? 'bg-emerald-500' : status === 'in_progress' ? 'bg-indigo-500' : 'bg-gray-400'}`} />
              {status.replace('_', ' ')}
            </h2>
            <div className="space-y-4">
              {sortedTasks.filter((t: any) => t.status === status).map((task: any) => (
                <motion.div 
                  layout
                  key={task.id} 
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3 group"
                >
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingTask(task); setIsModalOpen(true); }} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => { setTaskToDelete(task); setIsDeleteModalOpen(true); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{task.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                        {task.assigned_to_name ? task.assigned_to_name.charAt(0) : '?'}
                      </div>
                      <span className="text-xs text-gray-500">{task.assigned_to_name || 'Unassigned'}</span>
                    </div>
                    <div className="flex gap-1">
                      {status !== 'pending' && (
                        <button onClick={() => updateTaskStatus(task, 'pending')} className="p-1 text-gray-400 hover:text-gray-600">
                          <Clock size={14} />
                        </button>
                      )}
                      {status !== 'in_progress' && (
                        <button onClick={() => updateTaskStatus(task, 'in_progress')} className="p-1 text-indigo-400 hover:text-indigo-600">
                          <LayoutDashboard size={14} />
                        </button>
                      )}
                      {status !== 'completed' && (
                        <button onClick={() => updateTaskStatus(task, 'completed')} className="p-1 text-emerald-400 hover:text-emerald-600">
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Calendar size={10} />
                      {formatMsiaTime(task.due_date)}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTask?.id ? 'Edit Task' : 'Add Task'}
      >
        <form onSubmit={saveTask} className="space-y-4">
          <Input 
            label="Title" 
            value={editingTask?.title || ''} 
            onChange={(v: string) => setEditingTask({ ...editingTask, title: v })} 
            required 
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea 
              className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[100px]"
              value={editingTask?.description || ''}
              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Priority" 
              value={editingTask?.priority || 'medium'} 
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' }
              ]} 
              onChange={(v: string) => setEditingTask({ ...editingTask, priority: v })} 
            />
            <Select 
              label="Assign To" 
              value={editingTask?.assigned_to || ''} 
              options={employees.map((e: any) => ({ value: e.id, label: e.name }))} 
              onChange={(v: string) => setEditingTask({ ...editingTask, assigned_to: parseInt(v) })} 
            />
          </div>
          {user.role === 'admin' && (
            <Select 
              label="Branch" 
              value={editingTask?.branch_id || ''} 
              options={[
                { value: '', label: 'Global (All Branches)' },
                ...branches.map((b: any) => ({ value: b.id, label: b.name }))
              ]} 
              onChange={(v: string) => setEditingTask({ ...editingTask, branch_id: v ? parseInt(v) : null })} 
            />
          )}
          <Input 
            label="Due Date" 
            type="date" 
            value={editingTask?.due_date || ''} 
            onChange={(v: string) => setEditingTask({ ...editingTask, due_date: v })} 
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>{t.cancel}</Button>
            <Button type="submit">{t.save}</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        title="Confirm Deletion"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100">
            <AlertCircle size={24} />
            <p className="text-sm font-medium">
              Are you sure you want to delete the task <strong>"{taskToDelete?.title}"</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>{t.cancel}</Button>
            <Button variant="danger" onClick={deleteTask}>Delete Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const Sidebar = ({ user, currentBranch, view, setView, handleLogout, lang, setLang, t, attendance, handleClockInOut, permissions, notifications, supabaseStatus }: any) => {
  const lastAttendance = attendance[0];
  const isClockedIn = lastAttendance?.type === 'clock_in';
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center justify-between border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <CatIcon size={24} />
          </div>
          <span className="font-bold text-gray-900 truncate">{t.appName}</span>
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative"
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>
          {showNotifications && (
            <div className="absolute left-full ml-2 top-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Notifications</h3>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                  {notifications.length} New
                </span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? notifications.map((n: any, i: number) => (
                  <div key={i} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { n.onClick(); setShowNotifications(false); }}>
                    <div className="flex gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === 'task' ? 'bg-blue-100 text-blue-600' : 
                        n.type === 'vaccine' ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {n.type === 'task' ? <CheckSquare size={16} /> : <Syringe size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center">
                    <Bell size={32} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <SidebarItem icon={<LayoutDashboard size={20} />} label={t.dashboard} active={view === 'dashboard'} onClick={() => setView('dashboard')} />
        <SidebarItem icon={<CatIcon size={20} />} label={t.catList} active={view === 'cats'} onClick={() => setView('cats')} />
        <SidebarItem icon={<Syringe size={20} />} label={t.vaccine} active={view === 'vaccines'} onClick={() => setView('vaccines')} />
        <SidebarItem icon={<Weight size={20} />} label={t.weightRecords} active={view === 'weight'} onClick={() => setView('weight')} />
        <SidebarItem icon={<Stethoscope size={20} />} label={t.medicationPlan} active={view === 'medication'} onClick={() => setView('medication')} />
        <SidebarItem icon={<MapPin size={20} />} label={t.bathList} active={view === 'bath'} onClick={() => setView('bath')} />
        <SidebarItem icon={<Scissors size={20} />} label={t.petCare} active={view === 'care'} onClick={() => setView('care')} />
        <SidebarItem icon={<CheckCircle2 size={20} />} label={t.tasks} active={view === 'tasks'} onClick={() => setView('tasks')} />
        <SidebarItem icon={<Activity size={20} />} label={t.vet} active={view === 'vet'} onClick={() => setView('vet')} />
        
        {permissions?.manage_settings && (
          <>
            <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Admin Dashboard</div>
            <SidebarItem icon={<Users size={20} />} label={t.employeeList} active={view === 'employees'} onClick={() => setView('employees')} />
            <SidebarItem icon={<Settings size={20} />} label={t.settings} active={view === 'settings'} onClick={() => setView('settings')} />
          </>
        )}
      </nav>

      <div className="p-4 border-t space-y-4">
        <div className="flex items-center gap-3 p-2">
          {user?.avatar ? (
            <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
              <User size={20} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-gray-500 capitalize">{user?.role}</p>
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              <div className="flex items-center gap-1">
                <Cloud size={10} className={supabaseStatus ? "text-emerald-500" : "text-gray-300"} />
                <span className="text-[10px] text-gray-400 font-medium">{supabaseStatus ? "Cloud Sync Active" : "Local Only"}</span>
              </div>
            </div>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-gray-600" onClick={handleLogout}>
          <LogOut size={18} /> {t.logout}
        </Button>
        <Button variant="ghost" className="w-full justify-start text-indigo-600" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          <Languages size={18} /> {t.switchLang}
        </Button>
      </div>
    </div>
  );
};

const LoginView = ({ t, loginData, setLoginData, handleLogin }: any) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100"
    >
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
          <CatIcon size={40} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t.appName}</h1>
      </div>
      <form onSubmit={handleLogin} className="space-y-6">
        <Input 
          label={t.username} 
          value={loginData.username} 
          onChange={(v: string) => setLoginData((p: any) => ({ ...p, username: v }))} 
          required 
        />
        <Input 
          label={t.password} 
          type="password" 
          value={loginData.password} 
          onChange={(v: string) => setLoginData((p: any) => ({ ...p, password: v }))} 
          required 
        />
        <Button type="submit" className="w-full py-3 text-lg">
          {t.login}
        </Button>
      </form>
    </motion.div>
  </div>
);

const StatCard = ({ icon, label, value, onClick }: any) => (
  <div 
    className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:border-indigo-200 transition-all' : ''}`}
    onClick={onClick}
  >
    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
      {React.cloneElement(icon, { size: 28 })}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status, t }: { status: string; t: any }) => {
  const configs: any = {
    normal: { color: 'bg-emerald-100 text-emerald-700', label: t.normal, dot: 'bg-emerald-500' },
    observation: { color: 'bg-amber-100 text-amber-700', label: t.monitoring, dot: 'bg-amber-500' },
    sick: { color: 'bg-red-100 text-red-700', label: t.sick, dot: 'bg-red-500' },
    green: { color: 'bg-emerald-100 text-emerald-700', label: t.normal, dot: 'bg-emerald-500' },
    yellow: { color: 'bg-amber-100 text-amber-700', label: t.monitoring, dot: 'bg-amber-500' },
    red: { color: 'bg-red-100 text-red-700', label: t.sick, dot: 'bg-red-500' }
  };
  const config = configs[status] || configs.normal;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

const CatHistoryModal = ({ cat, isOpen, onClose, t, vaccines, weightRecords, medicationLogs, bathLogs, careLogs = [], vetVisits = [], editLogs = [], initialTab = 'vaccines', onEdit, permissions, branches, user, fetchInitialData }: any) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [newHealthRecord, setNewHealthRecord] = useState<any>({ type: 'treatment', date: getTodayStr() });
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState<string>('');

  if (!cat) return null;

  const tabs = [
    { id: 'vaccines', label: t.vaccine },
    { id: 'weight', label: t.weight },
    { id: 'medication', label: t.medicationLogs },
    { id: 'bath', label: t.bathLogs },
    { id: 'care', label: t.careHistory },
    { id: 'vet', label: t.vetHistory },
    { id: 'health', label: "Health Records" },
    { id: 'editHistory', label: "Edit History" }
  ];

  const saveHealthRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/vet-visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newHealthRecord,
        cat_id: cat.id,
        requested_by: user.id,
        request_date: newHealthRecord.date,
        branch_id: cat.branch_id
      })
    });
    if (res.ok) {
      setIsHealthModalOpen(false);
      setNewHealthRecord({ type: 'treatment', date: getTodayStr() });
      fetchInitialData();
    }
  };

  const handleTransfer = async () => {
    if (!targetBranchId) return;
    confirmAction(`Are you sure you want to transfer ${cat.name} to ${branches.find((b: any) => b.id === parseInt(targetBranchId))?.name}?`, async () => {
      const res = await fetch(`/api/cats/${cat.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_branch_id: parseInt(targetBranchId), employee_id: user.id })
      });
      
      if (res.ok) {
        setIsTransferModalOpen(false);
        onClose();
        fetchInitialData();
        toast("Cat transferred successfully");
      }
    });
  };

  const catVaccines = vaccines.filter((v: any) => v.cat_id === cat.id);
  const catWeights = weightRecords.filter((w: any) => w.cat_id === cat.id);
  const catMeds = medicationLogs.filter((l: any) => l.cat_id === cat.id);
  const catBaths = bathLogs.filter((l: any) => l.cat_id === cat.id);
  const catCares = careLogs.filter((l: any) => l.cat_id === cat.id);
  const catVetVisits = vetVisits.filter((v: any) => v.cat_id === cat.id);
  const catEditLogs = editLogs.filter((l: any) => l.cat_id === cat.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${cat.name} - ${t.history}`}>
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-200">
            {cat.photo && <img src={cat.photo} className="w-full h-full object-cover" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900">{cat.name}</h3>
              <StatusBadge status={cat.status} t={t} />
            </div>
            <p className="text-xs text-gray-500">{cat.breed_name} • {cat.gender === 'female' ? t.female : t.male}</p>
          </div>
        </div>
        {onEdit && (
          <Button variant="secondary" size="sm" onClick={() => onEdit(cat)}>
            <Edit size={14} /> {t.edit}
          </Button>
        )}
      </div>

      <div className="flex border-b border-gray-200 mb-4 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm transition-colors relative ${
              activeTab === tab.id ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {activeTab === 'vaccines' && (
          <div className="space-y-3">
            {catVaccines.length > 0 ? catVaccines.map((v: any) => (
              <div key={v.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">{v.category_name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {v.is_completed ? t.completed : t.incomplete}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {v.type === 'vaccine' ? t.vaccine : t.deworming} • {t.expiryDate}: {formatMsiaTime(v.end_date)}
                </div>
                {v.completed_at && (
                  <div className="text-xs text-emerald-600 mt-1">
                    Completed: {formatMsiaTime(v.completed_at)} by {v.completed_by_name}
                  </div>
                )}
              </div>
            )) : <p className="text-gray-500 text-center py-4">No records found.</p>}
          </div>
        )}

        {activeTab === 'weight' && (
          <div className="space-y-3">
            {catWeights.map((w: any, i: number) => {
              const prev = catWeights[i + 1];
              const diff = prev ? (w.weight - prev.weight).toFixed(2) : 0;
              const isSignificant = Math.abs(Number(diff)) >= 0.3;
              return (
                <div key={w.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <span className="font-bold text-gray-900">{w.weight} kg</span>
                    <span className="text-xs text-gray-500 ml-2">{formatMsiaTime(w.date)}</span>
                  </div>
                  {prev && (
                    <span className={`text-xs font-bold ${Number(diff) > 0 ? 'text-emerald-600' : 'text-red-600'} ${isSignificant ? 'bg-yellow-100 px-1 rounded' : ''}`}>
                      {Number(diff) > 0 ? '+' : ''}{diff} kg
                    </span>
                  )}
                </div>
              );
            })}
            {catWeights.length === 0 && <p className="text-gray-500 text-center py-4">No records found.</p>}
          </div>
        )}

        {activeTab === 'medication' && (
          <div className="space-y-3">
            {catMeds.map((l: any) => (
              <div key={l.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="font-bold text-gray-900">{l.note}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">{formatMsiaTime(l.created_at)}</span>
                  <span className="text-xs font-medium text-indigo-600">by {l.employee_name}</span>
                </div>
              </div>
            ))}
            {catMeds.length === 0 && <p className="text-gray-500 text-center py-4">No records found.</p>}
          </div>
        )}

        {activeTab === 'bath' && (
          <div className="space-y-3">
            {catBaths.map((l: any) => (
              <div key={l.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">{l.note || 'Bath'}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {l.is_completed ? t.completed : t.incomplete}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Applied: {formatMsiaTime(l.created_at)} by {l.employee_name}
                </div>
                {l.completed_at && (
                  <div className="text-xs text-emerald-600 mt-1">
                    Completed: {formatMsiaTime(l.completed_at)} by {l.completed_by_name}
                  </div>
                )}
              </div>
            ))}
            {catBaths.length === 0 && <p className="text-gray-500 text-center py-4">No records found.</p>}
          </div>
        )}

        {activeTab === 'care' && (
          <div className="space-y-3">
            {catCares.map((l: any) => (
              <div key={l.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">
                    {l.care_type === 'cutNails' ? t.cutNails : l.care_type === 'cleanEars' ? t.cleanEars : t.otherCare}
                  </span>
                  <span className="text-xs text-gray-500">{formatMsiaTime(l.created_at)}</span>
                </div>
                {l.note && <div className="text-sm text-gray-600 mt-1">{l.note}</div>}
                <div className="text-xs text-indigo-600 mt-1">by {l.employee_name}</div>
              </div>
            ))}
            {catCares.length === 0 && <p className="text-gray-500 text-center py-4">No records found.</p>}
          </div>
        )}
        {activeTab === 'vet' && (
          <div className="space-y-3">
            {catVetVisits.map((v: any) => (
              <div key={v.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-gray-900">{v.condition}</span>
                    <p className="text-xs text-gray-500 mt-1">{t.applyDate}: {v.request_date}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    v.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                    v.status === 'in_progress' ? 'bg-amber-100 text-amber-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {t[v.status] || v.status}
                  </span>
                </div>
                {v.authorized_to_name && (
                  <div className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                    <User size={12} /> {t.authorizedTo}: {v.authorized_to_name}
                  </div>
                )}
                {v.authorized_by_name && (
                  <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={10} /> Authorized by: {v.authorized_by_name}
                  </div>
                )}
                {v.clinic_name && (
                  <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <MapPin size={12} /> {t.clinicName}: {v.clinic_name}
                  </div>
                )}
                {v.diagnosis && (
                  <div className="mt-2 p-2 bg-indigo-50/50 rounded border border-indigo-100/50">
                    <p className="text-[10px] font-bold text-indigo-900 uppercase mb-1">{t.diagnosis}</p>
                    <p className="text-xs text-indigo-700 whitespace-pre-wrap">{v.diagnosis}</p>
                  </div>
                )}
                {v.completed_date && (
                  <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <Calendar size={12} /> {t.completedAt}: {v.completed_date}
                  </div>
                )}
              </div>
            ))}
            {catVetVisits.length === 0 && <p className="text-gray-500 text-center py-4">No records found.</p>}
          </div>
        )}
        {activeTab === 'health' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Health Records</h3>
              <Button size="sm" onClick={() => setIsHealthModalOpen(true)}>
                <Plus size={14} /> Log Record
              </Button>
            </div>
            <div className="space-y-3">
              {catVetVisits.map((v: any) => (
                <div key={v.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-gray-900 capitalize">{v.type || 'Treatment'}</span>
                      <p className="text-xs text-gray-500 mt-1">{formatMsiaTime(v.completed_date || v.request_date)}</p>
                    </div>
                    <span className="text-xs font-medium text-indigo-600">{v.vet_name || v.clinic_name}</span>
                  </div>
                  {(v.notes || v.diagnosis || v.condition) && (
                    <p className="text-xs text-gray-600 mt-2 italic">"{v.notes || v.diagnosis || v.condition}"</p>
                  )}
                </div>
              ))}
              {catVetVisits.length === 0 && <p className="text-gray-500 text-center py-4">No health records found.</p>}
            </div>
          </div>
        )}
        {activeTab === 'editHistory' && (
          <div className="space-y-4">
            {catEditLogs.map((log: any) => {
              const changes = JSON.parse(log.changes);
              return (
                <div key={log.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <User size={16} />
                      </div>
                      <span className="font-bold text-gray-900">{log.employee_name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatMsiaTime(log.created_at)}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(changes).map(([key, val]: [string, any]) => (
                      <div key={key} className="text-xs flex flex-col gap-1 p-2 bg-white rounded-lg border border-gray-100">
                        <span className="font-bold text-indigo-600 uppercase text-[10px]">{t[key] || key}</span>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="line-through opacity-50">{String(val.old)}</span>
                          <ChevronRight size={12} />
                          <span className="font-medium text-gray-900">{String(val.new)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {catEditLogs.length === 0 && <p className="text-gray-500 text-center py-4">No edit history found.</p>}
          </div>
        )}
      </div>
      <div className="flex justify-between items-center pt-4 border-t mt-4">
        <div className="flex gap-2">
          {user?.role === 'admin' && (
            <Button variant="secondary" size="sm" onClick={() => setIsTransferModalOpen(true)}>
              <MapPin size={14} /> Transfer Branch
            </Button>
          )}
        </div>
        <Button variant="secondary" onClick={onClose}>{t.close || 'Close'}</Button>
      </div>

      <Modal isOpen={isHealthModalOpen} onClose={() => setIsHealthModalOpen(false)} title="Log Health Record">
        <form onSubmit={saveHealthRecord} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Type" 
              value={newHealthRecord.type} 
              options={[
                { value: 'treatment', label: 'Treatment' },
                { value: 'vaccine', label: 'Vaccine' },
                { value: 'vet', label: 'Vet Visit' }
              ]} 
              onChange={(v: string) => setNewHealthRecord({ ...newHealthRecord, type: v })} 
            />
            <Input 
              label="Date" 
              type="date" 
              value={newHealthRecord.date} 
              onChange={(v: string) => setNewHealthRecord({ ...newHealthRecord, date: v })} 
            />
          </div>
          <Input 
            label="Vet / Clinic Name" 
            value={newHealthRecord.vet_name || ''} 
            onChange={(v: string) => setNewHealthRecord({ ...newHealthRecord, vet_name: v })} 
            required 
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Notes / Diagnosis</label>
            <textarea 
              className="px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[100px]"
              value={newHealthRecord.notes || ''}
              onChange={(e) => setNewHealthRecord({ ...newHealthRecord, notes: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsHealthModalOpen(false)}>{t.cancel}</Button>
            <Button type="submit">{t.save}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title={`Transfer ${cat.name}`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Select the target branch for transfer. This will be logged in the cat's edit history.</p>
          <Select 
            label="Target Branch" 
            value={targetBranchId} 
            options={branches.filter((b: any) => b.id !== cat.branch_id).map((b: any) => ({ value: b.id, label: b.name }))} 
            onChange={setTargetBranchId} 
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsTransferModalOpen(false)}>{t.cancel}</Button>
            <Button onClick={handleTransfer} disabled={!targetBranchId}>Confirm Transfer</Button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
};

const DashboardView = ({ cats, logs, currentBranch, t, exportToExcel, logMedication, deleteLog, calculateAge, catVaccines, medicationPlans, toggleBathComplete, bathLogs, settings, fetchInitialData, user, tasks = [], vetVisits = [], setHistoryModalCat, setIsHistoryModalOpen, setView }: any) => {
  const today = getTodayStr();
  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);

  const handleCatClick = (catId: number) => {
    const cat = cats.find((c: any) => c.id === catId);
    if (cat) {
      setHistoryModalCat(cat);
      setIsHistoryModalOpen(true);
    }
  };

  const overdueTasks = tasks.filter((task: any) => task.status !== 'completed' && task.due_date && new Date(task.due_date) < now);
  const dueSoonTasks = tasks.filter((task: any) => task.status !== 'completed' && task.due_date && new Date(task.due_date) >= now && new Date(task.due_date) <= threeDaysFromNow);
  
  const tenDaysFromNow = getMalaysiaTime();
  tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
  const tenDaysStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(tenDaysFromNow);

  const upcomingVaccines = catVaccines.filter((v: any) => {
    return !v.is_completed && v.end_date <= tenDaysStr;
  });

  const pendingBaths = bathLogs.filter((l: any) => !l.is_completed);
  
  const pendingMedPlans = medicationPlans.filter((p: any) => {
    if (p.end_date < today) return false;
    return true;
  });

  const activeVetVisits = vetVisits.filter((v: any) => v.status !== 'completed');
  const recentLogs = logs.slice(0, 5);

  return (
    <div className="space-y-8">
      {settings?.dashboard_announcement && (
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 px-6 py-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-indigo-600 shrink-0" />
            <p className="font-medium whitespace-pre-wrap">{settings.dashboard_announcement}</p>
          </div>
          {(settings.dashboard_announcement_author || settings.dashboard_announcement_date) && (
            <div className="text-xs text-indigo-600/70 sm:text-right shrink-0">
              {settings.dashboard_announcement_author && <span>{settings.dashboard_announcement_author}</span>}
              {settings.dashboard_announcement_author && settings.dashboard_announcement_date && <span> • </span>}
              {settings.dashboard_announcement_date && <span>{formatMsiaTime(settings.dashboard_announcement_date)}</span>}
            </div>
          )}
        </div>
      )}

      {(overdueTasks.length > 0 || dueSoonTasks.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueTasks.length > 0 && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-red-800">{t.overdue || 'Overdue'} {t.tasks || 'Tasks'}</p>
                <p className="text-sm text-red-600">{overdueTasks.length} {t.tasks || 'tasks'} {t.overdue || 'overdue'}</p>
              </div>
            </div>
          )}
          {dueSoonTasks.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
              <Clock className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-amber-800">{t.upcoming || 'Upcoming'} {t.tasks || 'Tasks'}</p>
                <p className="text-sm text-amber-600">{dueSoonTasks.length} {t.tasks || 'tasks'} {t.dueSoon || 'due soon'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.dashboard}</h1>
          <p className="text-gray-500">{currentBranch?.name || t.allBranches}</p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <Button variant="secondary" onClick={exportToExcel}>
              <Download size={18} /> {t.exportData}
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<CatIcon className="text-indigo-600" />} 
          label={t.catList} 
          value={cats.length} 
          onClick={() => setView('cats')}
        />
        <StatCard 
          icon={<Stethoscope className="text-red-500" />} 
          label={t.todayMedication} 
          value={pendingMedPlans.filter((p: any) => !logs.some((l: any) => {
            const logDate = parseDate(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
            return l.cat_id === p.cat_id && l.note.includes(p.name) && logDate === today;
          })).length}
          onClick={() => document.getElementById('medication-section')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <StatCard 
          icon={<Syringe className="text-amber-500" />} 
          label={t.upcomingVaccine} 
          value={upcomingVaccines.length} 
          onClick={() => document.getElementById('vaccine-section')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <StatCard 
          icon={<MapPin className="text-emerald-600" />} 
          label={t.bathList} 
          value={pendingBaths.length} 
          onClick={() => document.getElementById('bath-section')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <StatCard 
          icon={<CheckSquare className="text-blue-600" />} 
          label={t.tasks || 'Tasks'} 
          value={tasks.filter((tk: any) => tk.status !== 'completed').length} 
          onClick={() => document.getElementById('tasks-section')?.scrollIntoView({ behavior: 'smooth' })}
        />
        <StatCard 
          icon={<Activity className="text-red-600" />} 
          label={t.vet || 'Vet'} 
          value={activeVetVisits.length} 
          onClick={() => document.getElementById('vet-section')?.scrollIntoView({ behavior: 'smooth' })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Medication Alerts */}
        <div id="medication-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 scroll-mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500" />
            {t.medicationList}
          </h2>
          <div className="space-y-4">
            {pendingMedPlans.length > 0 ? (
              <>
                {pendingMedPlans.map((plan: any) => {
                  const loggedToday = logs.find((l: any) => {
                    const logDate = parseDate(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
                    return l.cat_id === plan.cat_id && l.note.includes(plan.name) && logDate === today;
                  });
                  return (
                    <div key={`plan-${plan.id}`} className={`flex items-center justify-between p-4 rounded-xl border ${loggedToday ? 'bg-emerald-50 border-emerald-100 opacity-75' : 'bg-orange-50 border-orange-100'}`}>
                      <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleCatClick(plan.cat_id)}>
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 group-hover:ring-2 ring-indigo-500 transition-all">
                          {plan.cat_photo && <img src={plan.cat_photo} className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{plan.cat_name}</p>
                            <StatusBadge status={plan.cat_status} t={t} />
                          </div>
                          <p className="text-xs text-gray-500">{plan.name} {plan.dosage ? `(${plan.dosage})` : ''} - {plan.frequency} ({plan.timing === 'before' ? t.beforeMeal : t.afterMeal})</p>
                          {loggedToday && (
                            <p className="text-[10px] text-emerald-600 mt-1">
                              {loggedToday.employee_name} - {formatMsiaTime(loggedToday.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      {loggedToday ? (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={18} /> {t.alreadyFed}
                          </span>
                          <button onClick={() => deleteLog(loggedToday.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => logMedication(plan.cat_id, plan.name)}>
                          <CheckCircle2 size={16} /> {t.logMedication}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">No medication tasks today.</p>
            )}
          </div>
        </div>

        {/* Pending Baths */}
        <div id="bath-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 scroll-mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-emerald-600" />
            {t.bathList}
          </h2>
          <div className="space-y-4">
            {pendingBaths.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingBaths.map((log: any) => (
                  <div key={`bath-${log.id}`} className="flex items-center justify-between p-4 rounded-xl border bg-indigo-50 border-indigo-100">
                    <div className="cursor-pointer group" onClick={() => handleCatClick(log.cat_id)}>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{log.cat_name}</p>
                        <StatusBadge status={log.cat_status} t={t} />
                      </div>
                      <p className="text-xs text-gray-500">{log.note || 'No notes'}</p>
                    </div>
                    <Button size="sm" onClick={() => toggleBathComplete(log)}>
                      <CheckCircle2 size={16} /> {t.complete}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No cats need bathing right now.</p>
            )}
          </div>
        </div>

        {/* Active Vet Visits */}
        <div id="vet-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 scroll-mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Activity size={20} className="text-red-600" />
            {t.vet}
          </h2>
          <div className="space-y-4">
            {activeVetVisits.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeVetVisits.map((visit: any) => (
                  <div key={`vet-${visit.id}`} className={`p-4 rounded-xl border flex flex-col gap-2 ${visit.status === 'in_progress' ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="cursor-pointer group" onClick={() => handleCatClick(visit.cat_id)}>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{visit.cat_name}</p>
                          <StatusBadge status={visit.cat_status} t={t} />
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-1">{visit.condition}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        visit.status === 'in_progress' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {t[visit.status] || visit.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Calendar size={10} /> {visit.request_date}
                      </div>
                      {visit.authorized_to_name && (
                        <div className="flex items-center gap-1">
                          <User size={10} /> {visit.authorized_to_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No active vet visits.</p>
            )}
          </div>
        </div>

        {/* Vaccine Alerts */}
        <div id="vaccine-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 scroll-mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Syringe size={20} className="text-amber-500" />
            {t.upcomingVaccine}
          </h2>
          <div className="space-y-4">
            {upcomingVaccines.length > 0 ? upcomingVaccines.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="cursor-pointer group" onClick={() => handleCatClick(v.cat_id)}>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{v.cat_name}</p>
                    <StatusBadge status={v.cat_status} t={t} />
                  </div>
                  <p className="text-sm text-gray-600">{v.category_name} ({v.type === 'vaccine' ? t.vaccine : t.deworming})</p>
                  <p className="text-xs text-red-500 font-bold">{t.expiryDate}: {v.end_date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">{t.upcoming}</span>
                  <Button size="sm" onClick={async () => {
                    await fetch(`/api/cat-vaccines/${v.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        ...v, 
                        is_completed: true, 
                        completed_at: new Date().toISOString(),
                        completed_by: user.id
                      })
                    });
                    toast("已完成修改");
                    fetchInitialData();
                  }}>
                    <CheckCircle2 size={16} /> {t.completed}
                  </Button>
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">No upcoming vaccines/deworming.</p>
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div id="tasks-section" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 scroll-mt-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CheckSquare size={20} className="text-blue-600" />
            {t.tasks || 'Tasks'}
          </h2>
          <div className="space-y-4">
            {tasks.filter((tk: any) => tk.status !== 'completed').length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tasks.filter((tk: any) => tk.status !== 'completed').slice(0, 6).map((task: any) => (
                  <div key={`task-dash-${task.id}`} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-gray-900 truncate">{task.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' : 
                        task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {t[task.priority] || task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                    {task.due_date && (
                      <p className={`text-[10px] font-medium flex items-center gap-1 ${new Date(task.due_date) < now ? 'text-red-500' : 'text-gray-400'}`}>
                        <Clock size={10} /> {formatMsiaTime(task.due_date)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No pending tasks.</p>
            )}
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-indigo-500" />
            {t.medicationLogs}
          </h2>
          <div className="space-y-4">
            {recentLogs.map((log: any) => (
              <div 
                key={log.id} 
                className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
                onClick={() => handleCatClick(log.cat_id)}
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <User size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {log.employee_name} fed {log.cat_name} ({log.note})
                  </p>
                  <p className="text-xs text-gray-500">{formatMsiaTime(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CatListView = ({ cats, t, setEditingCat, setIsCatModalOpen, filterBranch, setFilterBranch, filterStatus, setFilterStatus, searchQuery, setSearchQuery, branches, toggleSort, calculateAge, permissions, deleteCat, user, setHistoryModalCat, setIsHistoryModalOpen, fetchInitialData, selectedCatIds, setSelectedCatIds, handleBulkStatusUpdate, handleImportCats, handleDownloadTemplate }: any) => (
  <div className="space-y-6">
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t.catList}</h1>
        <p className="text-gray-500">{cats.length} cats found</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {selectedCatIds.length > 0 && user?.role !== 'staff' && (
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
            <span className="text-sm font-bold text-indigo-700">{selectedCatIds.length} selected</span>
            <select 
              onChange={(e) => handleBulkStatusUpdate(e.target.value as any)}
              className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
              defaultValue=""
            >
              <option value="" disabled>Change Status...</option>
              <option value="normal">{t.normal}</option>
              <option value="observation">{t.monitoring}</option>
              <option value="sick">{t.sick}</option>
            </select>
            <button onClick={() => setSelectedCatIds([])} className="p-1 hover:bg-indigo-100 rounded-full text-indigo-600">
              <X size={16} />
            </button>
          </div>
        )}
        {user?.role !== 'staff' && (
          <>
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              <Download size={18} /> {t.downloadTemplate}
            </Button>
            <div className="relative">
              <Button variant="secondary">
                <Download size={18} className="rotate-180" /> {t.importExcel}
              </Button>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                onChange={handleImportCats}
              />
            </div>
            <Button onClick={() => { setEditingCat({}); setIsCatModalOpen(true); }}>
              <Plus size={18} /> {t.addCat}
            </Button>
          </>
        )}
      </div>
    </header>

    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={t.name}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
          />
        </div>
        {user?.role === 'admin' && (
          <Select
            value={filterBranch}
            onChange={setFilterBranch}
            options={[
              { value: 'all', label: t.allBranches },
              ...branches.map((b: any) => ({ value: b.id.toString(), label: b.name }))
            ]}
          />
        )}
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'all', label: t.status },
            { value: 'normal', label: t.normal },
            { value: 'observation', label: t.monitoring },
            { value: 'sick', label: t.sick }
          ]}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-4 px-4 w-10">
                <input 
                  type="checkbox" 
                  checked={selectedCatIds.length === cats.length && cats.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedCatIds(cats.map((c: any) => c.id));
                    else setSelectedCatIds([]);
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="py-4 px-4 font-bold text-gray-700 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('name')}>
                <div className="flex items-center gap-2">{t.name} <ArrowUpDown size={14} /></div>
              </th>
              <th className="py-4 px-4 font-bold text-gray-700">{t.breed}</th>
              <th className="py-4 px-4 font-bold text-gray-700">{t.status}</th>
              <th className="py-4 px-4 font-bold text-gray-700">{t.age}</th>
              <th className="py-4 px-4 font-bold text-gray-700 cursor-pointer hover:text-indigo-600" onClick={() => toggleSort('lastUpdated' as any)}>
                <div className="flex items-center gap-2">{t.lastUpdated} <ArrowUpDown size={14} /></div>
              </th>
              <th className="py-4 px-4 font-bold text-gray-700 text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((cat: any) => (
              <tr key={cat.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors group cursor-pointer ${selectedCatIds.includes(cat.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => { setHistoryModalCat(cat); setIsHistoryModalOpen(true); }}>
                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  <input 
                    type="checkbox" 
                    checked={selectedCatIds.includes(cat.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCatIds([...selectedCatIds, cat.id]);
                      else setSelectedCatIds(selectedCatIds.filter((id: number) => id !== cat.id));
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                      {cat.photo && <img src={cat.photo} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 flex items-center gap-2">
                        {cat.name}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-gray-600">{cat.breed_name}</td>
                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  {user?.role !== 'staff' ? (
                    <select
                      value={cat.status || 'normal'}
                      onChange={(e) => {
                        fetch(`/api/cats/${cat.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ...cat, status: e.target.value, employee_id: user.id })
                        }).then(fetchInitialData);
                      }}
                      className="px-2 py-1 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="normal">{t.normal}</option>
                      <option value="observation">{t.monitoring}</option>
                      <option value="sick">{t.sick}</option>
                    </select>
                  ) : (
                    <StatusBadge status={cat.status} t={t} />
                  )}
                </td>
                <td className="py-4 px-4 text-gray-600">{calculateAge(cat.birth_date)}</td>
                <td className="py-4 px-4 text-sm text-gray-500">
                  {cat.lastUpdated ? formatMsiaTime(new Date(cat.lastUpdated).toISOString()) : '-'}
                </td>
                <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setEditingCat(cat); setIsCatModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <Edit size={18} />
                    </button>
                    {permissions?.delete_cat && (
                      <button onClick={() => deleteCat(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const BathManagementView = ({ bathLogs, t, cats, user, fetchInitialData, branches, toggleBathComplete, setHistoryModalCat, setIsHistoryModalOpen }: any) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBath, setNewBath] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const addBath = () => {
    fetch('/api/bath-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cat_id: newBath.cat_id, 
        employee_id: user.id,
        note: newBath.note
      })
    }).then(() => {
      setIsAddModalOpen(false);
      setNewBath({});
      fetchInitialData();
    });
  };

  const deleteBath = (id: number) => {
    confirmAction("Are you sure?", () => {
      fetch(`/api/bath-logs/${id}`, { method: 'DELETE' }).then(() => {
        toast("Deleted successfully");
        fetchInitialData();
      });
    });
  };

  const filteredLogs = bathLogs.filter((l: any) => {
    if (filterBranch !== 'all' && l.branch_id !== parseInt(filterBranch)) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'completed' && !l.is_completed) return false;
      if (filterStatus === 'incomplete' && l.is_completed) return false;
    }
    if (searchQuery && !l.cat_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{t.bathLogs}</h1>
        <div className="flex gap-3">
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} /> {t.addBath}
          </Button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t.name}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          {user?.role === 'admin' && (
            <Select
              value={filterBranch}
              onChange={setFilterBranch}
              options={[
                { value: 'all', label: t.allBranches },
                ...branches.map((b: any) => ({ value: b.id.toString(), label: b.name }))
              ]}
            />
          )}
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'all', label: t.status },
              { value: 'completed', label: t.completed },
              { value: 'incomplete', label: t.incomplete }
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-6 font-bold text-gray-700">{t.name}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.applyDate}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.note}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.status}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.completedAt}</th>
                <th className="py-4 px-6 font-bold text-gray-700 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map((l: any) => (
                <tr key={l.id}>
                  <td className="py-4 px-6 font-bold cursor-pointer hover:text-indigo-600" onClick={() => {
                    const cat = cats.find((c: any) => c.id === l.cat_id);
                    if (cat) {
                      setHistoryModalCat({ ...cat, initialTab: 'bath' });
                      setIsHistoryModalOpen(true);
                    }
                  }}>{l.cat_name}</td>
                  <td className="py-4 px-6 text-sm text-gray-500">{formatMsiaTime(l.created_at)}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">{l.note || '-'}</td>
                  <td className="py-4 px-6">
                    <button 
                      onClick={() => toggleBathComplete(l)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${l.is_completed ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}
                    >
                      {l.is_completed ? t.completed : t.incomplete}
                    </button>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500">
                    {l.completed_at ? (
                      <div>
                        <div>{formatMsiaTime(l.completed_at)}</div>
                        <div className="text-xs text-gray-400">by {l.completed_by_name}</div>
                      </div>
                    ) : '-'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => deleteBath(l.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t.addBath}>
        <div className="space-y-4">
          <Select 
            label={t.catList} 
            value={newBath.cat_id || ''} 
            options={cats.map((c: any) => ({ value: c.id, label: c.name }))} 
            onChange={(v: string) => setNewBath({ ...newBath, cat_id: parseInt(v) })} 
          />
          <Input 
            label={t.note} 
            value={newBath.note || ''} 
            onChange={(v: string) => setNewBath({ ...newBath, note: v })} 
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>{t.cancel}</Button>
            <Button onClick={addBath} disabled={!newBath.cat_id}>{t.save}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const PetCareView = ({ careLogs, t, cats, user, fetchInitialData, branches, setHistoryModalCat, setIsHistoryModalOpen }: any) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCare, setNewCare] = useState<any>({ care_type: 'cutNails' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const addCare = () => {
    fetch('/api/care-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cat_id: newCare.cat_id, 
        care_type: newCare.care_type,
        employee_id: user.id,
        note: newCare.note
      })
    }).then(() => {
      setIsAddModalOpen(false);
      setNewCare({ care_type: 'cutNails' });
      fetchInitialData();
    });
  };

  const deleteCare = (id: number) => {
    confirmAction("Are you sure?", () => {
      fetch(`/api/care-logs/${id}`, { method: 'DELETE' }).then(() => {
        toast("Deleted successfully");
        fetchInitialData();
      });
    });
  };

  const filteredLogs = careLogs.filter((l: any) => {
    if (filterBranch !== 'all' && l.branch_id !== parseInt(filterBranch)) return false;
    if (filterType !== 'all' && l.care_type !== filterType) return false;
    if (searchQuery && !l.cat_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getCareTypeLabel = (type: string) => {
    switch (type) {
      case 'cutNails': return t.cutNails;
      case 'cleanEars': return t.cleanEars;
      case 'other': return t.otherCare;
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{t.petCare}</h1>
        <div className="flex gap-3">
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={18} /> {t.addCareRecord}
          </Button>
        </div>
      </header>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t.name}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          {user?.role === 'admin' && (
            <Select
              value={filterBranch}
              onChange={setFilterBranch}
              options={[
                { value: 'all', label: t.allBranches },
                ...branches.map((b: any) => ({ value: b.id.toString(), label: b.name }))
              ]}
            />
          )}
          <Select
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'all', label: t.careType },
              { value: 'cutNails', label: t.cutNails },
              { value: 'cleanEars', label: t.cleanEars },
              { value: 'other', label: t.otherCare }
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-6 font-bold text-gray-700">{t.name}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.careType}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.note}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.completedAt}</th>
                <th className="py-4 px-6 font-bold text-gray-700 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.map((l: any) => (
                <tr key={l.id}>
                  <td className="py-4 px-6 font-bold cursor-pointer hover:text-indigo-600" onClick={() => {
                    const cat = cats.find((c: any) => c.id === l.cat_id);
                    if (cat) {
                      setHistoryModalCat({ ...cat, initialTab: 'care' });
                      setIsHistoryModalOpen(true);
                    }
                  }}>{l.cat_name}</td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                      {getCareTypeLabel(l.care_type)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">{l.note || '-'}</td>
                  <td className="py-4 px-6 text-sm text-gray-500">
                    <div>
                      <div>{formatMsiaTime(l.created_at)}</div>
                      <div className="text-xs text-gray-400">by {l.employee_name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button onClick={() => deleteCare(l.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t.addCareRecord}>
        <div className="space-y-4">
          <Select 
            label={t.catList} 
            value={newCare.cat_id || ''} 
            options={cats.map((c: any) => ({ value: c.id, label: c.name }))} 
            onChange={(v: string) => setNewCare({ ...newCare, cat_id: parseInt(v) })} 
          />
          <Select
            label={t.careType}
            value={newCare.care_type || 'cutNails'}
            options={[
              { value: 'cutNails', label: t.cutNails },
              { value: 'cleanEars', label: t.cleanEars },
              { value: 'other', label: t.otherCare }
            ]}
            onChange={(v: string) => setNewCare({ ...newCare, care_type: v })}
          />
          <Input 
            label={t.note} 
            value={newCare.note || ''} 
            onChange={(v: string) => setNewCare({ ...newCare, note: v })} 
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>{t.cancel}</Button>
            <Button onClick={addCare} disabled={!newCare.cat_id}>{t.save}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const AdminDashboardView = ({ 
  branches, 
  setBranches, 
  breeds, 
  fetchInitialData, 
  t, 
  handlePhotoUpload, 
  allPermissions, 
  setAllPermissions, 
  vaccineCategories, 
  setVaccineCategories, 
  settings, 
  setSettings, 
  user, 
  employees,
  theme,
  setTheme,
  lang,
  setLang,
  supabaseStatus
}: any) => {
  const savePermissions = (role: string, perms: any) => {
    fetch('/api/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, permissions: perms })
    }).then(async (res) => {
      if (res.ok) {
        setAllPermissions((p: any) => ({ ...p, [role]: perms }));
        toast("Permissions Saved");
      } else {
        const error = await res.json();
        toast(error.error || "Failed to save permissions");
      }
    }).catch(() => {
      toast("Network error while saving permissions");
    });
  };

  const addVaccineCategory = (name: string, type: string) => {
    fetch('/api/vaccine-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type })
    }).then(fetchInitialData);
  };

  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [newBreedName, setNewBreedName] = useState('');
  const [newVacName, setNewVacName] = useState('');
  const [newVacType, setNewVacType] = useState('vaccine');

  const saveBranch = () => {
    if (!editingBranch) return;
    const url = editingBranch.id ? `/api/branches/${editingBranch.id}` : '/api/branches';
    
    // Clean up data
    const { id, created_at, ...branchData } = editingBranch;

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branchData)
    }).then(async (res) => {
      if (res.ok) {
        setIsBranchModalOpen(false);
        setEditingBranch(null);
        fetchInitialData();
        toast("Branch saved successfully");
      } else {
        const error = await res.json();
        toast(error.error || "Failed to save branch");
      }
    }).catch(() => {
      toast("Network error while saving branch");
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.settings}</h1>
          <p className="text-gray-500">Manage your system, branches, and users</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* System Appearance */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <LayoutDashboard size={20} className="text-indigo-600" />
            {t.appearance}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t.theme}</label>
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                  onClick={() => setTheme('light')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${theme === 'light' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                >
                  {t.light}
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${theme === 'dark' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                >
                  {t.dark}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t.language}</label>
              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button 
                  onClick={() => setLang('zh')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${lang === 'zh' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                >
                  中文
                </button>
                <button 
                  onClick={() => setLang('en')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${lang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* System Settings */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Settings size={20} className="text-indigo-600" />
            {t.systemSettings}
          </h2>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">{t.notificationBar}</label>
              <textarea 
                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-y min-h-[80px]"
                value={settings?.dashboard_announcement || ''} 
                onChange={(e) => setSettings((p: any) => ({ ...p, dashboard_announcement: e.target.value }))} 
                placeholder="Enter announcement text..."
              />
            </div>
            <Button onClick={() => {
              const dateStr = new Date().toISOString();
              Promise.all([
                fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'dashboard_announcement', value: settings?.dashboard_announcement || '' }) }),
                fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'dashboard_announcement_author', value: user?.name || '' }) }),
                fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'dashboard_announcement_date', value: dateStr }) })
              ]).then((responses) => {
                if (responses.every(r => r.ok)) {
                  setSettings((p: any) => ({ ...p, dashboard_announcement_author: user?.name, dashboard_announcement_date: dateStr }));
                  toast("Saved");
                } else {
                  toast("Some settings failed to save");
                }
              }).catch(() => {
                toast("Network error while saving settings");
              });
            }}>
              <Save size={16} /> {t.save}
            </Button>
          </div>
        </section>

        {/* Database Backup & Export/Import */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <DatabaseIcon size={20} className="text-indigo-600" />
              {t.databaseManagement || "Database Management"}
            </h2>
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600">
              <Cloud size={14} className={supabaseStatus ? "text-green-500" : "text-gray-400"} />
              {supabaseStatus ? "Supabase Connected" : "Local Storage Only"}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <HardDrive size={16} className="text-indigo-600" />
                Server Backup
              </h3>
              <p className="text-xs text-gray-500">
                Daily automatic backups are enabled. Trigger a manual server-side backup.
              </p>
              <Button size="sm" className="w-full" onClick={async () => {
                try {
                  const res = await fetch('/api/backup', { method: 'POST' });
                  if (res.ok) toast('Backup successful!');
                  else toast('Backup failed.');
                } catch (err) {
                  toast('Error triggering backup.');
                }
              }}>
                {t.backupNow}
              </Button>
            </div>

            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Download size={16} className="text-indigo-600" />
                Export Data
              </h3>
              <p className="text-xs text-gray-500">
                Download all application data as a JSON file to your computer.
              </p>
              <Button size="sm" variant="secondary" className="w-full" onClick={async () => {
                try {
                  const res = await fetch('/api/export');
                  const data = await res.json();
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `cat_cafe_data_${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                } catch (err) {
                  toast('Export failed.');
                }
              }}>
                Export to JSON
              </Button>
            </div>

            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Upload size={16} className="text-indigo-600" />
                Import Data
              </h3>
              <p className="text-xs text-gray-500">
                Restore data from a previously exported JSON file. <span className="text-red-500 font-bold">Warning: This overwrites current data!</span>
              </p>
              <div className="relative">
                <Button size="sm" variant="ghost" className="w-full border-2 border-dashed border-gray-300">
                  Select File to Import
                </Button>
                <input 
                  type="file" 
                  accept=".json" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    confirmAction("Are you sure you want to import this data? Current data will be replaced!", () => {
                      const reader = new FileReader();
                      reader.onload = async (event) => {
                        try {
                          const content = event.target?.result as string;
                          const data = JSON.parse(content);
                          const res = await fetch('/api/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data)
                          });
                          if (res.ok) {
                            toast('Import successful! Refreshing data...');
                            fetchInitialData();
                          } else {
                            const err = await res.json();
                            toast(`Import failed: ${err.error}`);
                          }
                        } catch (err) {
                          toast('Invalid JSON file.');
                        }
                      };
                      reader.readAsText(file);
                    });
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Branch Settings */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MapPin size={20} className="text-indigo-600" />
              {t.branchSettings}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => { setEditingBranch({}); setIsBranchModalOpen(true); }}>
              <Plus size={18} />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {branches.map((branch: any) => (
              <div key={branch.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-200 overflow-hidden">
                    {branch.header_image && <img src={branch.header_image} className="w-full h-full object-cover" />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{branch.name}</p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-gray-500">{employees.filter((e: any) => e.branch_id === branch.id).length} staff assigned</p>
                      {branch.address && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <MapPin size={10} /> {branch.address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingBranch(branch); setIsBranchModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => {
                    confirmAction("Are you sure?", () => {
                      fetch(`/api/branches/${branch.id}`, { method: 'DELETE' }).then(fetchInitialData);
                    });
                  }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Modal isOpen={isBranchModalOpen} onClose={() => setIsBranchModalOpen(false)} title={t.branchDetails}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t.name} value={editingBranch?.name || ''} onChange={(v: string) => setEditingBranch({ ...editingBranch, name: v })} required />
              <Input label={t.phone} value={editingBranch?.phone || ''} onChange={(v: string) => setEditingBranch({ ...editingBranch, phone: v })} />
            </div>
            
            <Input label={t.address} value={editingBranch?.address || ''} onChange={(v: string) => setEditingBranch({ ...editingBranch, address: v })} />
            <Input label={t.openingHours} value={editingBranch?.opening_hours || ''} onChange={(v: string) => setEditingBranch({ ...editingBranch, opening_hours: v })} />
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t.description}</label>
              <textarea 
                value={editingBranch?.description || ''} 
                onChange={(e) => setEditingBranch({ ...editingBranch, description: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-h-[100px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t.headerImage}</label>
                <div className="relative h-32 rounded-xl bg-gray-100 overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                  {editingBranch?.header_image ? (
                    <img src={editingBranch.header_image} className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-gray-400" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => handlePhotoUpload(e, (b) => setEditingBranch({ ...editingBranch, header_image: b }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t.backgroundImage}</label>
                <div className="relative h-32 rounded-xl bg-gray-100 overflow-hidden border-2 border-dashed border-gray-300 flex items-center justify-center">
                  {editingBranch?.background_image ? (
                    <img src={editingBranch.background_image} className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-gray-400" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={(e) => handlePhotoUpload(e, (b) => setEditingBranch({ ...editingBranch, background_image: b }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setIsBranchModalOpen(false)}>{t.cancel}</Button>
              <Button onClick={saveBranch}>{t.save}</Button>
            </div>
          </div>
        </Modal>

        {/* Breed Settings */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CatIcon size={20} className="text-indigo-600" />
            {t.breedSettings}
          </h2>
          <div className="flex gap-2">
            <Input 
              placeholder="New Breed" 
              className="flex-1" 
              value={newBreedName}
              onChange={setNewBreedName} 
            />
            <Button onClick={() => {
              if (!newBreedName.trim()) return;
              fetch('/api/breeds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBreedName })
              }).then(() => {
                setNewBreedName('');
                fetchInitialData();
              });
            }}>
              <Plus size={18} />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {breeds.map((breed: any) => (
              <div key={breed.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm font-medium">
                {breed.name}
                <button onClick={() => {
                  fetch(`/api/breeds/${breed.id}`, { method: 'DELETE' }).then(fetchInitialData);
                }} className="text-gray-400 hover:text-red-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Vaccine Categories */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Syringe size={20} className="text-indigo-600" />
            {t.manageVaccines}
          </h2>
          <div className="flex gap-2">
            <Input 
              placeholder="Name" 
              className="flex-1" 
              value={newVacName}
              onChange={setNewVacName} 
            />
            <Select 
              className="flex-1"
              value={newVacType}
              options={[{ value: 'vaccine', label: t.vaccine }, { value: 'deworming', label: t.deworming }]} 
              onChange={setNewVacType} 
            />
            <Button onClick={() => {
              if (!newVacName.trim()) return;
              addVaccineCategory(newVacName, newVacType);
              setNewVacName('');
            }}>
              <Plus size={18} />
            </Button>
          </div>
          <div className="space-y-2">
            {vaccineCategories.map((vc: any) => (
              <div key={vc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">{vc.name} ({vc.type === 'vaccine' ? t.vaccine : t.deworming})</span>
                <button onClick={() => fetch(`/api/vaccine-categories/${vc.id}`, { method: 'DELETE' }).then(fetchInitialData)} className="text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Permissions Settings */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6 lg:col-span-2">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Users size={20} className="text-indigo-600" />
            {t.permissions}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {['admin', 'manager', 'supervisor', 'staff'].map((role) => (
              <div key={role} className="p-4 border rounded-xl space-y-4">
                <h3 className="font-bold capitalize text-indigo-600">{role}</h3>
                <div className="space-y-2">
                  {Object.keys(allPermissions[role] || {}).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={(allPermissions[role] as any)[key]} 
                        onChange={(e) => {
                          const newPerms = { ...allPermissions[role], [key]: e.target.checked };
                          savePermissions(role, newPerms);
                        }}
                      />
                      <label className="text-sm text-gray-600">{(t as any)[key.replace(/_([a-z])/g, (m, c) => c.toUpperCase())] || key}</label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

function EmployeeManagementView({ employees, t, setEditingEmployee, setIsEmployeeModalOpen, permissions, deleteEmployee }: any) {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t.employeeList}</h1>
          <p className="text-gray-500">{employees.length} employees registered</p>
        </div>
        <Button onClick={() => { setEditingEmployee({ role: 'staff' }); setIsEmployeeModalOpen(true); }}>
          <Plus size={18} /> {t.addEmployee}
        </Button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-4 px-6 font-bold text-gray-700">{t.name}</th>
              <th className="py-4 px-6 font-bold text-gray-700">{t.role}</th>
              <th className="py-4 px-6 font-bold text-gray-700">{t.branch}</th>
              <th className="py-4 px-6 font-bold text-gray-700 text-right">{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: Employee) => (
              <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                      {emp.avatar ? <img src={emp.avatar} className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400 m-auto" />}
                    </div>
                    <span className="font-bold text-gray-900">{emp.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                    emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                    emp.role === 'supervisor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {emp.role}
                  </span>
                </td>
                <td className="py-4 px-6 text-gray-600">{emp.branch_name || 'All'}</td>
                <td className="py-4 px-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setEditingEmployee(emp); setIsEmployeeModalOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <Edit size={18} />
                    </button>
                    {permissions?.delete_employee && (
                      <button onClick={() => deleteEmployee(emp.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const WeightManagementView = ({ cats, weightRecords, t, fetchInitialData, user, branches }: any) => {
  const [selectedBranch, setSelectedBranch] = useState<string>(user?.role === 'admin' ? 'all' : (user?.branch_id?.toString() || 'all'));
  const [editingWeight, setEditingWeight] = useState<any>(null);
  const [batchWeights, setBatchWeights] = useState<Record<number, string>>({});
  const [batchDate, setBatchDate] = useState<string>(getTodayStr());
  const [historyCat, setHistoryCat] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const saveBatchWeights = async () => {
    const entries = Object.entries(batchWeights).filter(([_, w]) => w !== '');
    if (entries.length === 0) {
      toast("Please enter at least one weight");
      return;
    }
    
    const promises = entries.map(([catId, weight]: [string, string]) => 
      fetch('/api/weight-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cat_id: parseInt(catId), weight: parseFloat(weight), date: batchDate })
      })
    );

    await Promise.all(promises);
    toast("已完成批量添加");
    setBatchWeights({});
    fetchInitialData();
  };

  const updateWeight = async () => {
    if (!editingWeight) return;
    await fetch(`/api/weight-records/${editingWeight.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingWeight)
    });
    toast("已完成修改");
    setEditingWeight(null);
    fetchInitialData();
  };

  const deleteWeight = async (id: number) => {
    confirmAction("Are you sure?", async () => {
      await fetch(`/api/weight-records/${id}`, { method: 'DELETE' });
      fetchInitialData();
    });
  };

  const exportToExcel = () => {
    if (user?.role !== 'admin') {
      toast("Only admins can export data.");
      return;
    }
    const data = weightRecords.map((r: any) => {
      const cat = cats.find((c: any) => c.id === r.cat_id);
      return {
        Cat: cat?.name || 'Unknown',
        Date: r.date,
        Weight: r.weight
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weight Records");
    XLSX.writeFile(wb, `Weight_Records_${getTodayStr()}.xlsx`);
  };

  const filteredCats = cats.filter((c: any) => {
    const matchesBranch = selectedBranch === 'all' || c.branch_id === parseInt(selectedBranch);
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const sortedRecords = [...weightRecords]
    .filter(r => {
      const cat = cats.find((c: any) => c.id === r.cat_id);
      const matchesBranch = selectedBranch === 'all' || cat?.branch_id === parseInt(selectedBranch);
      const matchesSearch = cat?.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBranch && matchesSearch;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const canEdit = user?.role === 'admin' || user?.role === 'supervisor';

  const catHistory = useMemo(() => {
    if (!historyCat) return [];
    return weightRecords.filter((r: any) => r.cat_id === historyCat.id)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [historyCat, weightRecords]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{t.weightRecords}</h1>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder={t.searchByCatName || "Search by cat name..."}
              className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none w-full md:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {user?.role === 'admin' && (
            <Button variant="secondary" onClick={exportToExcel}>
              <Download size={18} /> {t.exportExcel}
            </Button>
          )}
        </div>
      </header>

      {canEdit && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold">Batch Add Weights</h2>
            <div className="flex items-center gap-4">
              <div className="w-48">
                <Input type="date" value={batchDate} onChange={setBatchDate} />
              </div>
              {user?.role === 'admin' && (
                <div className="w-48">
                  <Select 
                    value={selectedBranch} 
                    options={[{ value: 'all', label: t.allBranches }, ...branches.map((b: any) => ({ value: b.id.toString(), label: b.name }))]} 
                    onChange={setSelectedBranch} 
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto border rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  <th className="py-3 px-4 font-bold text-gray-700">Cat Name</th>
                  <th className="py-3 px-4 font-bold text-gray-700">Weight (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCats.map((cat: any) => (
                  <tr key={cat.id}>
                    <td className="py-3 px-4 font-medium">{cat.name}</td>
                    <td className="py-3 px-4">
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        value={batchWeights[cat.id] || ''}
                        onChange={(e) => setBatchWeights({ ...batchWeights, [cat.id]: e.target.value })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveBatchWeights}>
              <Save size={18} /> Save Batch Weights
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-6 font-bold text-gray-700">{t.catName}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.weight} (kg)</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.date}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.difference}</th>
                <th className="py-4 px-6 font-bold text-gray-700 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedRecords.map((record, index) => {
                const cat = cats.find((c: any) => c.id === record.cat_id);
                
                const prevRecord = sortedRecords.slice(index + 1).find(r => r.cat_id === record.cat_id);
                const diff = prevRecord ? record.weight - prevRecord.weight : null;
                const isSignificant = diff !== null && Math.abs(diff) >= 0.3;

                return (
                  <tr key={record.id}>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => setHistoryCat(cat)}
                        className="font-bold text-indigo-600 hover:underline"
                      >
                        {cat?.name || 'Unknown'}
                      </button>
                    </td>
                    <td className="py-4 px-6 font-mono">{record.weight}</td>
                    <td className="py-4 px-6 text-sm text-gray-500">{formatMsiaTime(record.date)}</td>
                    <td className="py-4 px-6">
                      {diff !== null && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          diff > 0 ? 'bg-emerald-100 text-emerald-700' : 
                          diff < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                        } ${isSignificant ? 'ring-2 ring-offset-1 ring-red-400' : ''}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <>
                            <button onClick={() => setEditingWeight(record)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => deleteWeight(record.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!editingWeight} onClose={() => setEditingWeight(null)} title="Edit Weight Record">
        {editingWeight && (
          <div className="space-y-4">
            <Select 
              label={t.catList} 
              value={editingWeight.cat_id || ''} 
              options={cats.map((c: any) => ({ value: c.id, label: c.name }))} 
              onChange={(v: string) => setEditingWeight({ ...editingWeight, cat_id: parseInt(v) })} 
            />
            <Input 
              label={t.weight} 
              type="number" 
              step="0.01"
              value={editingWeight.weight || ''} 
              onChange={(v: string) => setEditingWeight({ ...editingWeight, weight: parseFloat(v) })} 
            />
            <Input 
              label={t.date} 
              type="date" 
              value={editingWeight.date || ''} 
              onChange={(v: string) => setEditingWeight({ ...editingWeight, date: v })} 
            />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="secondary" onClick={() => setEditingWeight(null)}>{t.cancel}</Button>
              <Button onClick={updateWeight}>{t.save}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!historyCat} onClose={() => setHistoryCat(null)} title={`${historyCat?.name}'s Weight History`}>
        <div className="space-y-4">
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-4 font-bold text-gray-700">{t.date}</th>
                  <th className="py-3 px-4 font-bold text-gray-700">{t.weight} (kg)</th>
                  <th className="py-3 px-4 font-bold text-gray-700">{t.difference}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {catHistory.map((record: any, index: number) => {
                  const prevRecord = catHistory[index + 1];
                  const diff = prevRecord ? record.weight - prevRecord.weight : null;
                  return (
                    <tr key={record.id}>
                      <td className="py-3 px-4 text-sm text-gray-500">{record.date}</td>
                      <td className="py-3 px-4 font-mono">{record.weight}</td>
                      <td className="py-3 px-4">
                        {diff !== null && (
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            diff > 0 ? 'bg-emerald-100 text-emerald-700' : 
                            diff < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {catHistory.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">No records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button variant="secondary" onClick={() => setHistoryCat(null)}>{t.close}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const VaccineManagementView = ({ cats, catVaccines, vaccineCategories, t, fetchInitialData, branches, user }: any) => {
  const [newVac, setNewVac] = useState<any>({});
  const [editingVac, setEditingVac] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedVacIds, setSelectedVacIds] = useState<number[]>([]);

  const saveVaccine = () => {
    const method = newVac.id ? 'PUT' : 'POST';
    const url = newVac.id ? `/api/cat-vaccines/${newVac.id}` : '/api/cat-vaccines';
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVac)
    }).then(() => {
      toast(newVac.id ? "已完成修改" : "已完成添加");
      setNewVac({});
      fetchInitialData();
    });
  };

  const exportToExcel = () => {
    if (user?.role !== 'admin') {
      toast("Only admins can export data.");
      return;
    }
    const data = catVaccines.map((v: any) => ({
      Cat: v.cat_name,
      Category: v.category_name,
      Type: v.type,
      StartDate: v.start_date,
      EndDate: v.end_date
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vaccine Records");
    XLSX.writeFile(wb, `Vaccine_Records_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const today = new Date();
  const tenDaysFromNow = new Date();
  tenDaysFromNow.setDate(today.getDate() + 10);

  const filteredVaccines = catVaccines.filter((v: any) => {
    if (filterBranch !== 'all' && v.branch_id !== parseInt(filterBranch)) return false;
    if (filterType !== 'all' && v.type !== filterType) return false;
    if (searchQuery && !v.cat_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">{t.manageVaccines}</h1>
        <div className="flex gap-3">
          {selectedVacIds.length > 0 && (
            <Button 
              variant="primary" 
              onClick={() => {
                confirmAction(`Update ${selectedVacIds.length} records to completed?`, () => {
                  Promise.all(selectedVacIds.map(id => {
                    const v = catVaccines.find((vac: any) => vac.id === id);
                    if (!v) return Promise.resolve();
                    return fetch(`/api/cat-vaccines/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ...v,
                        is_completed: 1,
                        completed_at: new Date().toISOString(),
                        completed_by: user.id
                      })
                    });
                  })).then(() => {
                    setSelectedVacIds([]);
                    fetchInitialData();
                    toast("Bulk update successful");
                  });
                });
              }}
            >
              <CheckCircle2 size={18} /> {t.completed} ({selectedVacIds.length})
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button variant="secondary" onClick={exportToExcel}>
              <Download size={18} /> {t.exportExcel}
            </Button>
          )}
          <Button onClick={() => setNewVac({ cat_id: cats[0]?.id, category_id: vaccineCategories[0]?.id, start_date: '', end_date: '' })}>{t.addCat}</Button>
        </div>
      </header>

      {newVac.cat_id && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 flex gap-4 items-end">
          <Select className="flex-1" label={t.catList} value={newVac.cat_id} options={cats.map((c: any) => ({ value: c.id, label: c.name }))} onChange={(v: string) => setNewVac((p: any) => ({ ...p, cat_id: parseInt(v) }))} />
          <Select className="flex-1" label={t.vaccine} value={newVac.category_id} options={vaccineCategories.map((c: any) => ({ value: c.id, label: c.name }))} onChange={(v: string) => setNewVac((p: any) => ({ ...p, category_id: parseInt(v) }))} />
          <Input label={t.startDate} type="date" value={newVac.start_date} onChange={(v: string) => setNewVac((p: any) => ({ ...p, start_date: v }))} className="hidden" />
          <Input className="flex-1" label={t.expiryDate} type="date" value={newVac.end_date} onChange={(v: string) => setNewVac((p: any) => ({ ...p, end_date: v }))} />
          <Button onClick={saveVaccine}>{t.save}</Button>
          <Button variant="secondary" onClick={() => setNewVac({})}>{t.cancel}</Button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t.name}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
          </div>
          {user?.role === 'admin' && (
            <Select
              value={filterBranch}
              onChange={setFilterBranch}
              options={[
                { value: 'all', label: t.allBranches },
                ...branches.map((b: any) => ({ value: b.id.toString(), label: b.name }))
              ]}
            />
          )}
          <Select
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: 'all', label: t.all },
              { value: 'vaccine', label: t.vaccine },
              { value: 'deworming', label: t.deworming }
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-6 font-bold text-gray-700 w-10">
                  <input 
                    type="checkbox" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVacIds(filteredVaccines.map((v: any) => v.id));
                      } else {
                        setSelectedVacIds([]);
                      }
                    }}
                    checked={selectedVacIds.length === filteredVaccines.length && filteredVaccines.length > 0}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.name}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.vaccine}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.expiryDate}</th>
                <th className="py-4 px-6 font-bold text-gray-700">{t.status}</th>
                <th className="py-4 px-6 font-bold text-gray-700 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredVaccines.map((v: any) => {
                const endDate = new Date(v.end_date);
                const isAlert = !v.is_completed && endDate <= tenDaysFromNow;
                return (
                  <tr key={v.id} className={isAlert ? 'bg-red-50' : ''}>
                    <td className="py-4 px-6">
                      <input 
                        type="checkbox" 
                        checked={selectedVacIds.includes(v.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVacIds([...selectedVacIds, v.id]);
                          } else {
                            setSelectedVacIds(selectedVacIds.filter(id => id !== v.id));
                          }
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-4 px-6 font-bold">{v.cat_name}</td>
                    <td className="py-4 px-6">{v.category_name} ({v.type === 'vaccine' ? t.vaccine : t.deworming})</td>
                    <td className={`py-4 px-6 font-bold ${isAlert ? 'text-red-500' : ''}`}>{v.end_date}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <button
                          onClick={() => {
                            const updated = { 
                              ...v, 
                              is_completed: !v.is_completed, 
                              completed_at: !v.is_completed ? new Date().toISOString() : null,
                              completed_by: !v.is_completed ? user.id : null
                            };
                            fetch(`/api/cat-vaccines/${v.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updated)
                            }).then(fetchInitialData);
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${v.is_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                        >
                          {v.is_completed ? t.completed : t.incomplete}
                        </button>
                        {v.is_completed && v.completed_by_name && (
                          <span className="text-[10px] text-gray-500 mt-1">
                            {v.completed_by_name} - {parseDate(v.completed_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setNewVac(v)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => fetch(`/api/cat-vaccines/${v.id}`, { method: 'DELETE' }).then(fetchInitialData)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MedicationManagementView = ({ cats, medicationPlans, t, fetchInitialData, logs, user, setHistoryModalCat, setIsHistoryModalOpen }: any) => {
  const [newPlan, setNewPlan] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const today = getTodayStr();

  const savePlan = () => {
    if (!newPlan.cat_id) {
      toast("Please select a cat");
      return;
    }
    const method = newPlan.id ? 'PUT' : 'POST';
    const url = newPlan.id ? `/api/medication-plans/${newPlan.id}` : '/api/medication-plans';
    
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlan)
    }).then(() => {
      toast(newPlan.id ? "已完成修改" : "已完成添加");
      setNewPlan({});
      fetchInitialData();
    }).catch(err => {
      console.error(err);
      toast("Failed to save plan");
    });
  };

  const exportToExcel = () => {
    if (user?.role !== 'admin') {
      toast("Only admins can export data.");
      return;
    }
    const data = medicationPlans.map((p: any) => {
      const cat = cats.find((c: any) => c.id === p.cat_id);
      return {
        Cat: cat?.name || 'Unknown',
        Medication: p.name,
        StartDate: p.start_date,
        EndDate: p.end_date,
        Frequency: p.frequency
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Medication Plans");
    XLSX.writeFile(wb, `Medication_Plans_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">{t.manageMedication}</h1>
        <div className="flex gap-3">
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              List
            </button>
            <button 
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Calendar
            </button>
          </div>
          {user?.role === 'admin' && (
            <Button variant="secondary" onClick={exportToExcel}>
              <Download size={18} /> {t.exportExcel}
            </Button>
          )}
        </div>
      </header>

      {activeTab === 'list' ? (
        <>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 space-y-4">
            <h2 className="text-lg font-bold">{newPlan.id ? 'Edit Plan' : 'Add New Plan'}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select label={t.catList} value={newPlan.cat_id} options={cats.map((c: any) => ({ value: c.id, label: c.name }))} onChange={(v: string) => setNewPlan((p: any) => ({ ...p, cat_id: parseInt(v) }))} />
              <Input label={t.medicationName} value={newPlan.name} onChange={(v: string) => setNewPlan((p: any) => ({ ...p, name: v }))} />
              <Input label={t.dosage} value={newPlan.dosage || ''} onChange={(v: string) => setNewPlan((p: any) => ({ ...p, dosage: v }))} />
              <Input label={t.days} type="number" value={newPlan.days} onChange={(v: string) => setNewPlan((p: any) => ({ ...p, days: parseInt(v) }))} />
              <Input label={t.frequency} value={newPlan.frequency} onChange={(v: string) => setNewPlan((p: any) => ({ ...p, frequency: v }))} />
              <Select label={t.timing} value={newPlan.timing} options={[{ value: 'before', label: t.beforeMeal }, { value: 'after', label: t.afterMeal }]} onChange={(v: string) => setNewPlan((p: any) => ({ ...p, timing: v }))} />
              <Input label={t.startDate} type="date" value={newPlan.start_date || ''} onChange={(v: string) => setNewPlan((p: any) => ({ ...p, start_date: v }))} />
              <Input label={t.endDate} type="date" value={newPlan.end_date || ''} onChange={(v: string) => setNewPlan((p: any) => ({ ...p, end_date: v }))} />
            </div>
            <div className="flex gap-3">
              <Button onClick={savePlan}>{t.save}</Button>
              <Button variant="secondary" onClick={() => setNewPlan({})}>{t.cancel}</Button>
            </div>
            
            {newPlan.id && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-bold text-gray-900 mb-3">{t.medicationLogs}</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {logs.filter((l: any) => l.cat_id === newPlan.cat_id && l.note.includes(newPlan.name)).map((log: any) => (
                    <div key={log.id} className="text-sm bg-gray-50 p-2 rounded-lg border border-gray-100 flex justify-between">
                      <span>{log.employee_name}</span>
                      <span className="text-gray-500">{parseDate(log.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {logs.filter((l: any) => l.cat_id === newPlan.cat_id && l.note.includes(newPlan.name)).length === 0 && (
                    <p className="text-sm text-gray-400 italic">No logs found</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-4 px-6 font-bold text-gray-700">{t.name}</th>
                  <th className="py-4 px-6 font-bold text-gray-700">{t.medicationPlan}</th>
                  <th className="py-4 px-6 font-bold text-gray-700">{t.startDate}</th>
                  <th className="py-4 px-6 font-bold text-gray-700">{t.endDate}</th>
                  <th className="py-4 px-6 font-bold text-gray-700">{t.status}</th>
                  <th className="py-4 px-6 font-bold text-gray-700 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {medicationPlans.map((p: any) => {
                  const isCompleted = p.end_date < today;
                  return (
                    <tr key={p.id}>
                      <td className="py-4 px-6 font-bold cursor-pointer hover:text-indigo-600" onClick={() => {
                        const cat = cats.find((c: any) => c.id === p.cat_id);
                        if (cat) {
                          setHistoryModalCat({ ...cat, initialTab: 'medication' });
                          setIsHistoryModalOpen(true);
                        }
                      }}>{p.cat_name}</td>
                      <td className="py-4 px-6">
                        {p.name} {p.dosage ? `(${p.dosage})` : ''} - {p.frequency} ({p.timing === 'before' ? t.beforeMeal : t.afterMeal})
                      </td>
                      <td className="py-4 px-6">{p.start_date || '-'}</td>
                      <td className="py-4 px-6">{p.end_date}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isCompleted ? t.completed : t.incomplete}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button onClick={() => setNewPlan(p)} className="text-indigo-600">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => fetch(`/api/medication-plans/${p.id}`, { method: 'DELETE' }).then(fetchInitialData)} className="text-red-500">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}>
                  <ChevronDown className="rotate-90" size={18} />
                </Button>
                <Button variant="secondary" onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}>
                  <ChevronDown className="-rotate-90" size={18} />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-500 uppercase">
                  {day}
                </div>
              ))}
              {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white h-24 p-2" />
              ))}
              {Array.from({ length: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayPlans = medicationPlans.filter((p: any) => {
                  const start = p.start_date || '0000-00-00';
                  const end = p.end_date || '9999-99-99';
                  return dateStr >= start && dateStr <= end;
                });
                const isSelected = selectedDate.getDate() === day;
                return (
                  <div 
                    key={day} 
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                    className={`bg-white h-24 p-2 cursor-pointer transition-all hover:bg-indigo-50/50 ${isSelected ? 'ring-2 ring-inset ring-indigo-500' : ''}`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-indigo-600' : 'text-gray-700'}`}>{day}</span>
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {dayPlans.slice(0, 2).map((p: any) => (
                        <div key={p.id} className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded truncate">
                          {p.cat_name}: {p.name}
                        </div>
                      ))}
                      {dayPlans.length > 2 && (
                        <div className="text-[10px] text-gray-400 pl-1">
                          + {dayPlans.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" />
              {formatMsiaTime(selectedDate.toISOString())}
            </h3>
            <div className="space-y-4">
              {medicationPlans.filter((p: any) => {
                const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                const start = p.start_date || '0000-00-00';
                const end = p.end_date || '9999-99-99';
                return dateStr >= start && dateStr <= end;
              }).map((p: any) => (
                <div key={p.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-900">{p.cat_name}</span>
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase">
                      {p.timing === 'before' ? t.beforeMeal : t.afterMeal}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{p.name} {p.dosage ? `(${p.dosage})` : ''}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={12} /> {p.frequency}
                  </p>
                </div>
              ))}
              {medicationPlans.filter((p: any) => {
                const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                const start = p.start_date || '0000-00-00';
                const end = p.end_date || '9999-99-99';
                return dateStr >= start && dateStr <= end;
              }).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                  <p>No medications scheduled for this day</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
