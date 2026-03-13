import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("cat_cafe.db");

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  try {
    let finalUrl = supabaseUrl;
    if (!finalUrl.startsWith('http')) {
      finalUrl = `https://${supabaseUrl}.supabase.co`;
    }
    supabase = createClient(finalUrl, supabaseKey);
    console.log("Supabase client initialized.");
  } catch (err) {
    console.error("Supabase initialization error:", err);
  }
} else {
  console.warn("Supabase credentials missing. Cloud features disabled.");
}

// Backup Logic
const backupDir = path.join(__dirname, "backups");
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const performBackup = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDir, `cat_cafe_backup_${timestamp}.db`);
  try {
    await db.backup(backupPath);
    console.log(`Backup successful: ${backupPath}`);
    
    // Cloud Backup to Supabase Storage if available
    if (supabase) {
      try {
        const fileBuffer = fs.readFileSync(backupPath);
        const { error } = await supabase.storage
          .from('backups')
          .upload(`cat_cafe_backup_${timestamp}.db`, fileBuffer, {
            contentType: 'application/x-sqlite3',
            upsert: true
          });
        
        if (error) {
          // If bucket doesn't exist, try to create it (though Supabase JS doesn't have createBucket in standard storage client easily without admin)
          // We'll just log it. The user should create a public bucket named 'backups'
          console.error("Cloud backup failed (ensure 'backups' bucket exists):", error.message);
        } else {
          console.log("Cloud backup successful to Supabase.");
        }
      } catch (cloudErr: any) {
        console.error("Cloud backup error:", cloudErr.message);
      }
    }
    
    // Keep only last 30 days of backups
    const files = fs.readdirSync(backupDir);
    if (files.length > 30) {
      files.sort();
      const toDelete = files.slice(0, files.length - 30);
      toDelete.forEach(file => {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`Deleted old backup: ${file}`);
      });
    }
  } catch (err) {
    console.error("Backup failed:", err);
  }
};

// Schedule daily backup at 00:00
cron.schedule("0 0 * * *", () => {
  console.log("Running daily backup...");
  performBackup();
});

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    background_image TEXT,
    header_image TEXT,
    address TEXT,
    phone TEXT,
    opening_hours TEXT,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS breeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin', 'supervisor', 'staff'
    branch_id INTEGER,
    avatar TEXT,
    username TEXT UNIQUE,
    password TEXT,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS cats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    breed_id INTEGER,
    branch_id INTEGER,
    birth_date TEXT,
    weight REAL,
    vaccine_expiry TEXT,
    status TEXT DEFAULT 'normal', -- 'normal', 'observation', 'sick'
    photo TEXT,
    medical_history TEXT,
    needs_medication BOOLEAN DEFAULT 0,
    can_bathe BOOLEAN DEFAULT 1,
    needs_bathe BOOLEAN DEFAULT 0,
    FOREIGN KEY (breed_id) REFERENCES breeds(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS vaccine_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL -- 'vaccine', 'deworming'
  );

  CREATE TABLE IF NOT EXISTS cat_vaccines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_id INTEGER,
    category_id INTEGER,
    start_date TEXT,
    end_date TEXT,
    is_completed BOOLEAN DEFAULT 0,
    completed_at TEXT,
    completed_by INTEGER,
    FOREIGN KEY (cat_id) REFERENCES cats(id),
    FOREIGN KEY (category_id) REFERENCES vaccine_categories(id),
    FOREIGN KEY (completed_by) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS weight_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_id INTEGER,
    weight REAL,
    date TEXT,
    FOREIGN KEY (cat_id) REFERENCES cats(id)
  );

  CREATE TABLE IF NOT EXISTS medication_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_id INTEGER,
    name TEXT,
    dosage TEXT DEFAULT '',
    days INTEGER,
    frequency TEXT,
    timing TEXT, -- 'before', 'after'
    end_date TEXT,
    needs_nebulization BOOLEAN DEFAULT 0,
    needs_oxygen BOOLEAN DEFAULT 0,
    FOREIGN KEY (cat_id) REFERENCES cats(id)
  );

  CREATE TABLE IF NOT EXISTS role_permissions (
    role TEXT PRIMARY KEY, -- 'admin', 'supervisor', 'staff'
    permissions TEXT -- JSON string
  );

  CREATE TABLE IF NOT EXISTS medication_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_id INTEGER,
    employee_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (cat_id) REFERENCES cats(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER,
    type TEXT, -- 'clock_in', 'clock_out'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS bath_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_id INTEGER,
    employee_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_completed BOOLEAN DEFAULT 0,
    completed_at DATETIME,
    completed_by INTEGER,
    note TEXT,
    FOREIGN KEY (cat_id) REFERENCES cats(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS care_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_id INTEGER,
    care_type TEXT,
    employee_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (cat_id) REFERENCES cats(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS cat_edit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_id INTEGER,
    employee_id INTEGER,
    changes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cat_id) REFERENCES cats(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    assigned_to INTEGER,
    created_by INTEGER,
    due_date TEXT,
    branch_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES employees(id),
    FOREIGN KEY (created_by) REFERENCES employees(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );

  CREATE TABLE IF NOT EXISTS vet_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cat_id INTEGER,
    condition TEXT NOT NULL,
    requested_by INTEGER,
    request_date TEXT,
    authorized_to INTEGER,
    authorized_by INTEGER,
    clinic_name TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    completed_date TEXT,
    diagnosis TEXT,
    branch_id INTEGER,
    type TEXT DEFAULT 'vet', -- 'vet', 'vaccine', 'treatment'
    vet_name TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cat_id) REFERENCES cats(id),
    FOREIGN KEY (requested_by) REFERENCES employees(id),
    FOREIGN KEY (authorized_to) REFERENCES employees(id),
    FOREIGN KEY (authorized_by) REFERENCES employees(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  );
`);

try {
  db.prepare("ALTER TABLE medication_plans ADD COLUMN note TEXT").run();
} catch (e) {}

try {
  db.prepare("UPDATE cats SET status = 'normal' WHERE status = 'green' OR status IS NULL").run();
  db.prepare("UPDATE cats SET status = 'observation' WHERE status = 'yellow'").run();
  db.prepare("UPDATE cats SET status = 'sick' WHERE status = 'red'").run();
} catch (e) {}

// Migration: Rename timestamp to created_at if necessary
try {
  const medLogsTable = db.prepare("PRAGMA table_info(medication_logs)").all() as any[];
  if (medLogsTable.some(c => c.name === 'timestamp') && !medLogsTable.some(c => c.name === 'created_at')) {
    db.exec("ALTER TABLE medication_logs RENAME COLUMN timestamp TO created_at");
  }
  
  const attendanceTable = db.prepare("PRAGMA table_info(attendance)").all() as any[];
  if (attendanceTable.some(c => c.name === 'timestamp') && !attendanceTable.some(c => c.name === 'created_at')) {
    db.exec("ALTER TABLE attendance RENAME COLUMN timestamp TO created_at");
  }

  const catVaccinesTable = db.prepare("PRAGMA table_info(cat_vaccines)").all() as any[];
  if (!catVaccinesTable.some(c => c.name === 'is_completed')) {
    db.exec("ALTER TABLE cat_vaccines ADD COLUMN is_completed BOOLEAN DEFAULT 0");
  }
  if (!catVaccinesTable.some(c => c.name === 'completed_at')) {
    db.exec("ALTER TABLE cat_vaccines ADD COLUMN completed_at TEXT");
  }
  if (!catVaccinesTable.some(c => c.name === 'completed_by')) {
    db.exec("ALTER TABLE cat_vaccines ADD COLUMN completed_by INTEGER");
  }

  const catsTable = db.prepare("PRAGMA table_info(cats)").all() as any[];
  if (!catsTable.some(c => c.name === 'can_bathe')) {
    db.exec("ALTER TABLE cats ADD COLUMN can_bathe BOOLEAN DEFAULT 1");
  }
  if (!catsTable.some(c => c.name === 'needs_bathe')) {
    db.exec("ALTER TABLE cats ADD COLUMN needs_bathe BOOLEAN DEFAULT 0");
  }
  if (!catsTable.some(c => c.name === 'is_neutered')) {
    db.exec("ALTER TABLE cats ADD COLUMN is_neutered BOOLEAN DEFAULT 0");
  }
  if (!catsTable.some(c => c.name === 'gender')) {
    db.exec("ALTER TABLE cats ADD COLUMN gender TEXT DEFAULT 'male'");
  }

  const medPlansTable = db.prepare("PRAGMA table_info(medication_plans)").all() as any[];
  if (!medPlansTable.some(c => c.name === 'dosage')) {
    db.exec("ALTER TABLE medication_plans ADD COLUMN dosage TEXT DEFAULT ''");
  }
  if (!medPlansTable.some(c => c.name === 'start_date')) {
    db.exec("ALTER TABLE medication_plans ADD COLUMN start_date DATETIME");
  }

  const bathLogsTable = db.prepare("PRAGMA table_info(bath_logs)").all() as any[];
  if (!bathLogsTable.some(c => c.name === 'is_completed')) {
    db.exec("ALTER TABLE bath_logs ADD COLUMN is_completed BOOLEAN DEFAULT 0");
  }
  if (!bathLogsTable.some(c => c.name === 'completed_at')) {
    db.exec("ALTER TABLE bath_logs ADD COLUMN completed_at DATETIME");
  }
  if (!bathLogsTable.some(c => c.name === 'completed_by')) {
    db.exec("ALTER TABLE bath_logs ADD COLUMN completed_by INTEGER");
  }
  if (!bathLogsTable.some(c => c.name === 'note')) {
    db.exec("ALTER TABLE bath_logs ADD COLUMN note TEXT");
  }

  const tasksTable = db.prepare("PRAGMA table_info(tasks)").all() as any[];
  if (!tasksTable.some(c => c.name === 'branch_id')) {
    db.exec("ALTER TABLE tasks ADD COLUMN branch_id INTEGER");
  }
  db.exec("UPDATE tasks SET status = 'pending' WHERE status = 'todo'");
} catch (e) {
  console.warn("Migration check failed (likely columns already correct):", e.message);
}

try {
  db.prepare("ALTER TABLE vet_visits ADD COLUMN type TEXT DEFAULT 'vet'").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE vet_visits ADD COLUMN vet_name TEXT").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE vet_visits ADD COLUMN notes TEXT").run();
} catch (e) {}

// Seed initial data if empty
const branchCount = db.prepare("SELECT COUNT(*) as count FROM branches").get() as { count: number };
if (branchCount.count === 0) {
  db.prepare("INSERT INTO branches (name) VALUES (?), (?), (?)").run("Branch A", "Branch B", "Branch C");
}

const breedCount = db.prepare("SELECT COUNT(*) as count FROM breeds").get() as { count: number };
if (breedCount.count === 0) {
  db.prepare("INSERT INTO breeds (name) VALUES (?), (?), (?)").run("Persian", "Siamese", "Maine Coon");
}

const employeeCount = db.prepare("SELECT COUNT(*) as count FROM employees").get() as { count: number };
if (employeeCount.count === 0) {
  db.prepare("INSERT INTO employees (name, role, branch_id, username, password) VALUES (?, ?, ?, ?, ?)").run(
    "Admin User", "admin", null, "admin", "admin123"
  );
}

const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run("system_logo", "");
}

const permsCount = db.prepare("SELECT COUNT(*) as count FROM role_permissions").get() as { count: number };
if (permsCount.count === 0) {
  // Default permissions
  const defaultPerms = {
    view_dashboard: true,
    manage_cats: true,
    manage_vaccines: false,
    manage_medication: false,
    manage_bath: true,
    manage_weight: true,
    view_employees: false,
    manage_employees: false,
    manage_settings: false,
    manage_breeds: false,
    manage_vet: true,
    edit_cat_status: false,
    export_excel: false
  };
  
  db.prepare("INSERT INTO role_permissions (role, permissions) VALUES (?, ?)").run('admin', JSON.stringify({ 
    ...defaultPerms, 
    manage_vaccines: true, 
    manage_medication: true, 
    view_employees: true,
    manage_employees: true, 
    manage_settings: true, 
    manage_breeds: true, 
    manage_vet: true,
    edit_cat_status: true,
    export_excel: true,
    delete_cat: true,
    delete_employee: true
  }));
  db.prepare("INSERT INTO role_permissions (role, permissions) VALUES (?, ?)").run('supervisor', JSON.stringify({ 
    ...defaultPerms, 
    manage_vaccines: true, 
    manage_medication: true, 
    manage_vet: true,
    edit_cat_status: true 
  }));
  db.prepare("INSERT INTO role_permissions (role, permissions) VALUES (?, ?)").run('staff', JSON.stringify({
    ...defaultPerms,
    manage_vet: true
  }));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/status", (req, res) => {
    res.json({ 
      supabase: !!supabase,
      cloudBackup: !!supabase,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/branches", (req, res) => {
    const branches = db.prepare("SELECT * FROM branches").all();
    res.json(branches);
  });

  app.post("/api/branches", (req, res) => {
    const { name, address, phone, opening_hours, description, background_image, header_image } = req.body;
    try {
      db.prepare("INSERT INTO branches (name, address, phone, opening_hours, description, background_image, header_image) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(name, address || null, phone || null, opening_hours || null, description || null, background_image || null, header_image || null);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Branch already exists" });
    }
  });

  app.post("/api/branches/:id", (req, res) => {
    const { name, background_image, header_image, address, phone, opening_hours, description } = req.body;
    db.prepare("UPDATE branches SET name = ?, background_image = ?, header_image = ?, address = ?, phone = ?, opening_hours = ?, description = ? WHERE id = ?")
      .run(name, background_image, header_image, address || null, phone || null, opening_hours || null, description || null, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/branches/:id", (req, res) => {
    db.prepare("DELETE FROM branches WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/breeds", (req, res) => {
    const breeds = db.prepare("SELECT * FROM breeds").all();
    res.json(breeds);
  });

  app.post("/api/breeds", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare("INSERT INTO breeds (name) VALUES (?)").run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Breed already exists" });
    }
  });

  app.delete("/api/breeds/:id", (req, res) => {
    db.prepare("DELETE FROM breeds WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/employees", (req, res) => {
    const employees = db.prepare(`
      SELECT e.*, b.name as branch_name 
      FROM employees e 
      LEFT JOIN branches b ON e.branch_id = b.id
    `).all();
    res.json(employees);
  });

  app.post("/api/employees", (req, res) => {
    const { name, role, branch_id, avatar, username, password } = req.body;
    db.prepare("INSERT INTO employees (name, role, branch_id, avatar, username, password) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, role, branch_id, avatar, username, password);
    res.json({ success: true });
  });

  app.put("/api/employees/:id", (req, res) => {
    const { name, role, branch_id, avatar, username, password } = req.body;
    if (password) {
      db.prepare("UPDATE employees SET name = ?, role = ?, branch_id = ?, avatar = ?, username = ?, password = ? WHERE id = ?")
        .run(name, role, branch_id, avatar, username, password, req.params.id);
    } else {
      db.prepare("UPDATE employees SET name = ?, role = ?, branch_id = ?, avatar = ?, username = ? WHERE id = ?")
        .run(name, role, branch_id, avatar, username, req.params.id);
    }
    res.json({ success: true });
  });

  app.delete("/api/employees/:id", (req, res) => {
    db.prepare("DELETE FROM employees WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/cats", (req, res) => {
    const cats = db.prepare(`
      SELECT c.*, b.name as branch_name, br.name as breed_name 
      FROM cats c 
      LEFT JOIN branches b ON c.branch_id = b.id
      LEFT JOIN breeds br ON c.breed_id = br.id
    `).all();
    res.json(cats);
  });

  app.post("/api/cats", (req, res) => {
    const { name, breed_id, branch_id, birth_date, weight, vaccine_expiry, status, photo, medical_history, needs_medication, can_bathe, is_neutered, gender } = req.body;
    db.prepare(`
      INSERT INTO cats (name, breed_id, branch_id, birth_date, weight, vaccine_expiry, status, photo, medical_history, needs_medication, can_bathe, is_neutered, gender) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, breed_id, branch_id, birth_date, weight, vaccine_expiry, status, photo, medical_history, needs_medication ? 1 : 0, can_bathe ? 1 : 0, is_neutered ? 1 : 0, gender || 'male');
    res.json({ success: true });
  });

  app.put("/api/cats/:id", (req, res) => {
    const { name, breed_id, branch_id, birth_date, weight, vaccine_expiry, status, photo, medical_history, needs_medication, can_bathe, is_neutered, gender, employee_id } = req.body;
    
    // Get old cat data to compare
    const oldCat = db.prepare("SELECT * FROM cats WHERE id = ?").get(req.params.id) as any;
    
    db.prepare(`
      UPDATE cats SET name = ?, breed_id = ?, branch_id = ?, birth_date = ?, weight = ?, vaccine_expiry = ?, status = ?, photo = ?, medical_history = ?, needs_medication = ?, can_bathe = ?, is_neutered = ?, gender = ?
      WHERE id = ?
    `).run(name, breed_id, branch_id, birth_date, weight, vaccine_expiry, status, photo, medical_history, needs_medication ? 1 : 0, can_bathe ? 1 : 0, is_neutered ? 1 : 0, gender || 'male', req.params.id);
    
    if (employee_id && oldCat) {
      const changes: any = {};
      const newCat = { name, breed_id, branch_id, birth_date, weight, vaccine_expiry, status, photo, medical_history, needs_medication: needs_medication ? 1 : 0, can_bathe: can_bathe ? 1 : 0, is_neutered: is_neutered ? 1 : 0, gender: gender || 'male' };
      
      for (const key in newCat) {
        if (oldCat[key] !== (newCat as any)[key]) {
          changes[key] = { old: oldCat[key], new: (newCat as any)[key] };
        }
      }
      
      if (Object.keys(changes).length > 0) {
        db.prepare("INSERT INTO cat_edit_logs (cat_id, employee_id, changes) VALUES (?, ?, ?)")
          .run(req.params.id, employee_id, JSON.stringify(changes));
      }
    }
    
    res.json({ success: true });
  });

  app.get("/api/cats/:id/edit-logs", (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, e.name as employee_name 
      FROM cat_edit_logs l 
      LEFT JOIN employees e ON l.employee_id = e.id 
      WHERE l.cat_id = ? 
      ORDER BY l.created_at DESC
    `).all(req.params.id);
    res.json(logs);
  });

  app.delete("/api/cats/:id", (req, res) => {
    db.prepare("DELETE FROM cats WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/cats/bulk", (req, res) => {
    const cats = req.body;
    if (!Array.isArray(cats)) {
      return res.status(400).json({ error: "Invalid data format" });
    }

    const insert = db.prepare(`
      INSERT INTO cats (name, breed_id, branch_id, birth_date, weight, vaccine_expiry, status, photo, medical_history, needs_medication, can_bathe, is_neutered, gender) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((cats) => {
      for (const cat of cats) {
        insert.run(
          cat.name,
          cat.breed_id,
          cat.branch_id,
          cat.birth_date || null,
          cat.weight || 0,
          cat.vaccine_expiry || null,
          cat.status || 'normal',
          cat.photo || null,
          cat.medical_history || '',
          cat.needs_medication ? 1 : 0,
          cat.can_bathe ?? 1,
          cat.is_neutered ? 1 : 0,
          cat.gender || 'male'
        );
      }
    });

    try {
      insertMany(cats);
      res.json({ success: true, count: cats.length });
    } catch (e) {
      console.error("Bulk insert failed:", e);
      res.status(500).json({ error: "Failed to import cats" });
    }
  });

  app.put("/api/cats/bulk/status", (req, res) => {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid IDs" });
    }
    const placeholders = ids.map(() => "?").join(",");
    db.prepare(`UPDATE cats SET status = ? WHERE id IN (${placeholders})`).run(status, ...ids);
    res.json({ success: true });
  });

  app.post("/api/medication-logs", (req, res) => {
    const { cat_id, employee_id, note } = req.body;
    db.prepare("INSERT INTO medication_logs (cat_id, employee_id, note) VALUES (?, ?, ?)")
      .run(cat_id, employee_id, note);
    res.json({ success: true });
  });

  app.post("/api/cats/:id/transfer", (req, res) => {
    const { target_branch_id, employee_id } = req.body;
    const catId = req.params.id;
    
    const oldCat = db.prepare("SELECT * FROM cats WHERE id = ?").get(catId) as any;
    if (!oldCat) return res.status(404).json({ error: "Cat not found" });
    
    db.prepare("UPDATE cats SET branch_id = ? WHERE id = ?").run(target_branch_id, catId);
    
    const changes = {
      branch_id: { old: oldCat.branch_id, new: target_branch_id }
    };
    
    db.prepare("INSERT INTO cat_edit_logs (cat_id, employee_id, changes) VALUES (?, ?, ?)")
      .run(catId, employee_id, JSON.stringify(changes));
      
    res.json({ success: true });
  });

  app.get("/api/medication-logs", (req, res) => {
    const logs = db.prepare(`
      SELECT l.*, c.name as cat_name, e.name as employee_name 
      FROM medication_logs l
      JOIN cats c ON l.cat_id = c.id
      JOIN employees e ON l.employee_id = e.id
      ORDER BY l.created_at DESC
    `).all();
    res.json(logs);
  });

  app.delete("/api/medication-logs/:id", (req, res) => {
    db.prepare("DELETE FROM medication_logs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/attendance/:employeeId", (req, res) => {
    const logs = db.prepare("SELECT * FROM attendance WHERE employee_id = ? ORDER BY created_at DESC LIMIT 50")
      .all(req.params.employeeId);
    res.json(logs);
  });

  app.post("/api/attendance", (req, res) => {
    const { employee_id, type } = req.body;
    db.prepare("INSERT INTO attendance (employee_id, type) VALUES (?, ?)")
      .run(employee_id, type);
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsMap = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsMap);
  });

  app.post("/api/settings", (req, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    res.json({ success: true });
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM employees WHERE username = ? AND password = ?").get(username, password) as any;
    if (user) {
      const branch = user.branch_id ? db.prepare("SELECT * FROM branches WHERE id = ?").get(user.branch_id) : null;
      const permissions = db.prepare("SELECT permissions FROM role_permissions WHERE role = ?").get(user.role) as any;
      res.json({ user, branch, permissions: JSON.parse(permissions.permissions) });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Role Permissions
  app.get("/api/permissions", (req, res) => {
    const perms = db.prepare("SELECT * FROM role_permissions").all();
    const map = perms.reduce((acc: any, curr: any) => {
      acc[curr.role] = JSON.parse(curr.permissions);
      return acc;
    }, {});
    res.json(map);
  });

  app.post("/api/permissions", (req, res) => {
    const { role, permissions } = req.body;
    db.prepare("INSERT OR REPLACE INTO role_permissions (role, permissions) VALUES (?, ?)")
      .run(role, JSON.stringify(permissions));
    res.json({ success: true });
  });

  // Vaccine Categories
  app.get("/api/vaccine-categories", (req, res) => {
    res.json(db.prepare("SELECT * FROM vaccine_categories").all());
  });

  app.post("/api/vaccine-categories", (req, res) => {
    const { name, type } = req.body;
    db.prepare("INSERT INTO vaccine_categories (name, type) VALUES (?, ?)").run(name, type);
    res.json({ success: true });
  });

  app.delete("/api/vaccine-categories/:id", (req, res) => {
    db.prepare("DELETE FROM vaccine_categories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Cat Vaccines
  app.get("/api/cat-vaccines", (req, res) => {
    const vaccines = db.prepare(`
      SELECT cv.*, c.name as cat_name, c.branch_id, vc.name as category_name, vc.type, e.name as completed_by_name
      FROM cat_vaccines cv
      JOIN cats c ON cv.cat_id = c.id
      JOIN vaccine_categories vc ON cv.category_id = vc.id
      LEFT JOIN employees e ON cv.completed_by = e.id
    `).all();
    res.json(vaccines);
  });

  app.post("/api/cat-vaccines", (req, res) => {
    const { cat_id, category_id, start_date, end_date, is_completed, completed_at, completed_by } = req.body;
    db.prepare("INSERT INTO cat_vaccines (cat_id, category_id, start_date, end_date, is_completed, completed_at, completed_by) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(cat_id, category_id, start_date, end_date, is_completed ? 1 : 0, completed_at || null, completed_by || null);
    res.json({ success: true });
  });

  app.put("/api/cat-vaccines/:id", (req, res) => {
    const { cat_id, category_id, start_date, end_date, is_completed, completed_at, completed_by } = req.body;
    db.prepare("UPDATE cat_vaccines SET cat_id = ?, category_id = ?, start_date = ?, end_date = ?, is_completed = ?, completed_at = ?, completed_by = ? WHERE id = ?")
      .run(cat_id, category_id, start_date, end_date, is_completed ? 1 : 0, completed_at || null, completed_by || null, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/cat-vaccines/:id", (req, res) => {
    db.prepare("DELETE FROM cat_vaccines WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Weight Records
  app.get("/api/weight-records", (req, res) => {
    res.json(db.prepare("SELECT * FROM weight_records ORDER BY date DESC").all());
  });

  app.post("/api/weight-records", (req, res) => {
    const { cat_id, weight, date } = req.body;
    db.prepare("INSERT INTO weight_records (cat_id, weight, date) VALUES (?, ?, ?)").run(cat_id, weight, date);
    res.json({ success: true });
  });

  app.put("/api/weight-records/:id", (req, res) => {
    const { cat_id, weight, date } = req.body;
    db.prepare("UPDATE weight_records SET cat_id = ?, weight = ?, date = ? WHERE id = ?").run(cat_id, weight, date, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/weight-records/:id", (req, res) => {
    db.prepare("DELETE FROM weight_records WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Medication Plans
  app.get("/api/medication-plans", (req, res) => {
    const plans = db.prepare(`
      SELECT mp.*, c.name as cat_name 
      FROM medication_plans mp
      JOIN cats c ON mp.cat_id = c.id
    `).all();
    res.json(plans);
  });

  app.post("/api/medication-plans", (req, res) => {
    const { cat_id, name, dosage, days, frequency, timing, start_date, end_date, needs_nebulization, needs_oxygen } = req.body;
    db.prepare(`
      INSERT INTO medication_plans (cat_id, name, dosage, days, frequency, timing, start_date, end_date, needs_nebulization, needs_oxygen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cat_id, name, dosage || '', days, frequency, timing, start_date, end_date, needs_nebulization ? 1 : 0, needs_oxygen ? 1 : 0);
    res.json({ success: true });
  });

  app.put("/api/medication-plans/:id", (req, res) => {
    const { cat_id, name, dosage, days, frequency, timing, start_date, end_date, needs_nebulization, needs_oxygen } = req.body;
    db.prepare(`
      UPDATE medication_plans 
      SET cat_id = ?, name = ?, dosage = ?, days = ?, frequency = ?, timing = ?, start_date = ?, end_date = ?, needs_nebulization = ?, needs_oxygen = ?
      WHERE id = ?
    `).run(cat_id, name, dosage || '', days, frequency, timing, start_date, end_date, needs_nebulization ? 1 : 0, needs_oxygen ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/medication-plans/:id", (req, res) => {
    db.prepare("DELETE FROM medication_plans WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Bath Logs
  app.get("/api/bath-logs", (req, res) => {
    const logs = db.prepare(`
      SELECT bl.*, c.name as cat_name, c.branch_id, e.name as employee_name, ce.name as completed_by_name
      FROM bath_logs bl
      JOIN cats c ON bl.cat_id = c.id
      JOIN employees e ON bl.employee_id = e.id
      LEFT JOIN employees ce ON bl.completed_by = ce.id
      ORDER BY bl.created_at DESC
    `).all();
    res.json(logs);
  });

  app.post("/api/bath-logs", (req, res) => {
    const { cat_id, employee_id, note } = req.body;
    db.prepare("INSERT INTO bath_logs (cat_id, employee_id, is_completed, note) VALUES (?, ?, 0, ?)")
      .run(cat_id, employee_id, note || null);
    res.json({ success: true });
  });

  app.put("/api/bath-logs/:id", (req, res) => {
    const { is_completed, completed_by } = req.body;
    const completed_at = is_completed ? new Date().toISOString() : null;
    db.prepare("UPDATE bath_logs SET is_completed = ?, completed_at = ?, completed_by = ? WHERE id = ?")
      .run(is_completed ? 1 : 0, completed_at, is_completed ? completed_by : null, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/bath-logs/:id", (req, res) => {
    db.prepare("DELETE FROM bath_logs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Care Logs
  app.get("/api/care-logs", (req, res) => {
    const logs = db.prepare(`
      SELECT cl.*, c.name as cat_name, c.branch_id, e.name as employee_name
      FROM care_logs cl
      JOIN cats c ON cl.cat_id = c.id
      JOIN employees e ON cl.employee_id = e.id
      ORDER BY cl.created_at DESC
    `).all();
    res.json(logs);
  });

  app.post("/api/care-logs", (req, res) => {
    const { cat_id, care_type, employee_id, note } = req.body;
    db.prepare("INSERT INTO care_logs (cat_id, care_type, employee_id, note) VALUES (?, ?, ?, ?)")
      .run(cat_id, care_type, employee_id, note || null);
    res.json({ success: true });
  });

  app.delete("/api/care-logs/:id", (req, res) => {
    db.prepare("DELETE FROM care_logs WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Tasks
  app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare(`
      SELECT t.*, e.name as assigned_to_name, c.name as created_by_name 
      FROM tasks t
      LEFT JOIN employees e ON t.assigned_to = e.id
      LEFT JOIN employees c ON t.created_by = c.id
      ORDER BY t.created_at DESC
    `).all();
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const { title, description, priority, assigned_to, created_by, due_date, branch_id } = req.body;
    db.prepare(`
      INSERT INTO tasks (title, description, priority, assigned_to, created_by, due_date, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, description, priority || 'medium', assigned_to || null, created_by || null, due_date || null, branch_id || null);
    res.json({ success: true });
  });

  app.put("/api/tasks/:id", (req, res) => {
    const { title, description, priority, status, assigned_to, due_date, branch_id } = req.body;
    db.prepare(`
      UPDATE tasks 
      SET title = ?, description = ?, priority = ?, status = ?, assigned_to = ?, due_date = ?, branch_id = ?
      WHERE id = ?
    `).run(title, description, priority, status, assigned_to, due_date, branch_id, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/tasks/:id", (req, res) => {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vet Visits
  app.get("/api/vet-visits", (req, res) => {
    const visits = db.prepare(`
      SELECT v.*, c.name as cat_name, rb.name as requested_by_name, at.name as authorized_to_name, ab.name as authorized_by_name
      FROM vet_visits v
      JOIN cats c ON v.cat_id = c.id
      JOIN employees rb ON v.requested_by = rb.id
      LEFT JOIN employees at ON v.authorized_to = at.id
      LEFT JOIN employees ab ON v.authorized_by = ab.id
      ORDER BY v.created_at DESC
    `).all();
    res.json(visits);
  });

  app.post("/api/vet-visits", (req, res) => {
    const { cat_id, condition, requested_by, request_date, authorized_to, authorized_by, clinic_name, status, completed_date, diagnosis, branch_id, type, vet_name, notes } = req.body;
    db.prepare(`
      INSERT INTO vet_visits (cat_id, condition, requested_by, request_date, authorized_to, authorized_by, clinic_name, status, completed_date, diagnosis, branch_id, type, vet_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cat_id, condition || 'Health Record', requested_by, request_date, authorized_to || null, authorized_by || null, clinic_name || vet_name, status || 'completed', completed_date || request_date, diagnosis || notes, branch_id, type || 'treatment', vet_name || clinic_name, notes || diagnosis);
    res.json({ success: true });
  });

  app.put("/api/vet-visits/:id", (req, res) => {
    const { authorized_to, authorized_by, clinic_name, status, completed_date, diagnosis } = req.body;
    db.prepare(`
      UPDATE vet_visits 
      SET authorized_to = ?, authorized_by = ?, clinic_name = ?, status = ?, completed_date = ?, diagnosis = ?
      WHERE id = ?
    `).run(authorized_to || null, authorized_by || null, clinic_name || null, status, completed_date || null, diagnosis || null, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/vet-visits/:id", (req, res) => {
    db.prepare("DELETE FROM vet_visits WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/backup", async (req, res) => {
    try {
      await performBackup();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Export all data
  app.get("/api/export", (req, res) => {
    try {
      const tables = [
        "branches", "breeds", "employees", "cats", "vaccine_categories", 
        "cat_vaccines", "weight_records", "medication_plans", "role_permissions", 
        "medication_logs", "settings", "attendance", "bath_logs", "care_logs", "cat_edit_logs", 
        "tasks", "vet_visits"
      ];
      const data: any = {};
      for (const table of tables) {
        data[table] = db.prepare(`SELECT * FROM ${table}`).all();
      }
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Import all data
  app.post("/api/import", (req, res) => {
    const data = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: "Invalid data format" });
    }

    try {
      const tables = [
        "branches", "breeds", "employees", "cats", "vaccine_categories", 
        "cat_vaccines", "weight_records", "medication_plans", "role_permissions", 
        "medication_logs", "settings", "attendance", "bath_logs", "care_logs", "cat_edit_logs", 
        "tasks", "vet_visits"
      ];

      const importTransaction = db.transaction((data) => {
        // Disable foreign keys temporarily for clean wipe
        db.exec("PRAGMA foreign_keys = OFF");
        
        for (const table of tables) {
          if (data[table] && Array.isArray(data[table])) {
            db.prepare(`DELETE FROM ${table}`).run();
            if (data[table].length > 0) {
              const columns = Object.keys(data[table][0]);
              const placeholders = columns.map(() => "?").join(",");
              const insert = db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`);
              for (const row of data[table]) {
                const values = columns.map(col => row[col]);
                insert.run(...values);
              }
            }
          }
        }
        
        db.exec("PRAGMA foreign_keys = ON");
      });

      importTransaction(data);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Import failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/backup", async (req, res) => {
    try {
      await performBackup();
      res.json({ success: true, message: "Backup triggered successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
