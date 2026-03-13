import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl?.startsWith('http') ? supabaseUrl : `https://${supabaseUrl}.supabase.co`,
  supabaseKey || ""
);

const app = express();
app.use(express.json({ limit: '50mb' }));

// API Routes
app.get("/api/status", (req, res) => {
  res.json({ 
    supabase: !!supabase,
    timestamp: new Date().toISOString()
  });
});

// Branches
app.get("/api/branches", async (req, res) => {
  const { data, error } = await supabase.from('branches').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/branches", async (req, res) => {
  const { data, error } = await supabase.from('branches').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/branches/:id", async (req, res) => {
  const { error } = await supabase.from('branches').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/branches/:id", async (req, res) => {
  const { error } = await supabase.from('branches').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Breeds
app.get("/api/breeds", async (req, res) => {
  const { data, error } = await supabase.from('breeds').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/breeds", async (req, res) => {
  const { data, error } = await supabase.from('breeds').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/breeds/:id", async (req, res) => {
  const { error } = await supabase.from('breeds').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Employees
app.get("/api/employees", async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*, branches(name)');
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(e => ({
    ...e,
    branch_name: e.branches?.name || null
  }));
  res.json(formatted);
});

app.post("/api/employees", async (req, res) => {
  const { error } = await supabase.from('employees').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/employees/:id", async (req, res) => {
  const { error } = await supabase.from('employees').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/employees/:id", async (req, res) => {
  const { error } = await supabase.from('employees').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Cats
app.get("/api/cats", async (req, res) => {
  const { data, error } = await supabase
    .from('cats')
    .select('*, branches(name), breeds(name)');
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(c => ({
    ...c,
    branch_name: c.branches?.name || null,
    breed_name: c.breeds?.name || null
  }));
  res.json(formatted);
});

app.post("/api/cats", async (req, res) => {
  const { error } = await supabase.from('cats').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/cats/:id", async (req, res) => {
  const { employee_id, ...catData } = req.body;
  const { data: oldCat } = await supabase.from('cats').select('*').eq('id', req.params.id).single();
  const { error } = await supabase.from('cats').update(catData).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  
  if (employee_id && oldCat) {
    const changes: any = {};
    for (const key in catData) {
      if (oldCat[key] !== (catData as any)[key]) {
        changes[key] = { old: oldCat[key], new: (catData as any)[key] };
      }
    }
    if (Object.keys(changes).length > 0) {
      await supabase.from('cat_edit_logs').insert([{
        cat_id: req.params.id,
        employee_id,
        changes
      }]);
    }
  }
  res.json({ success: true });
});

app.get("/api/cats/:id/edit-logs", async (req, res) => {
  const { data, error } = await supabase
    .from('cat_edit_logs')
    .select('*, employees(name)')
    .eq('cat_id', req.params.id)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(l => ({
    ...l,
    employee_name: l.employees?.name || null
  }));
  res.json(formatted);
});

app.delete("/api/cats/:id", async (req, res) => {
  const { error } = await supabase.from('cats').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/cats/bulk", async (req, res) => {
  const { error } = await supabase.from('cats').insert(req.body);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true, count: req.body.length });
});

app.put("/api/cats/bulk/status", async (req, res) => {
  const { ids, status } = req.body;
  const { error } = await supabase.from('cats').update({ status }).in('id', ids);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Medication Logs
app.get("/api/medication-logs", async (req, res) => {
  const { data, error } = await supabase
    .from('medication_logs')
    .select('*, cats(name), employees(name)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(l => ({
    ...l,
    cat_name: l.cats?.name || null,
    employee_name: l.employees?.name || null
  }));
  res.json(formatted);
});

app.post("/api/medication-logs", async (req, res) => {
  const { error } = await supabase.from('medication_logs').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/medication-logs/:id", async (req, res) => {
  const { error } = await supabase.from('medication_logs').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Attendance
app.get("/api/attendance/:employeeId", async (req, res) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', req.params.employeeId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/attendance", async (req, res) => {
  const { error } = await supabase.from('attendance').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Settings
app.get("/api/settings", async (req, res) => {
  const { data, error } = await supabase.from('settings').select('*');
  if (error) return res.status(500).json({ error: error.message });
  
  const map = data.reduce((acc: any, curr: any) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(map);
});

app.post("/api/settings", async (req, res) => {
  const { key, value } = req.body;
  const { error } = await supabase.from('settings').upsert({ key, value });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const { data: user, error } = await supabase
    .from('employees')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();
  
  if (error || !user) return res.status(401).json({ error: "Invalid credentials" });
  
  const { data: branch } = user.branch_id 
    ? await supabase.from('branches').select('*').eq('id', user.branch_id).single()
    : { data: null };
    
  const { data: perms } = await supabase.from('role_permissions').select('permissions').eq('role', user.role).single();
  
  res.json({ 
    user, 
    branch, 
    permissions: perms?.permissions || {} 
  });
});

// Permissions
app.get("/api/permissions", async (req, res) => {
  const { data, error } = await supabase.from('role_permissions').select('*');
  if (error) return res.status(500).json({ error: error.message });
  
  const map = data.reduce((acc: any, curr: any) => {
    acc[curr.role] = curr.permissions;
    return acc;
  }, {});
  res.json(map);
});

app.post("/api/permissions", async (req, res) => {
  const { role, permissions } = req.body;
  const { error } = await supabase.from('role_permissions').upsert({ role, permissions });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Vaccine Categories
app.get("/api/vaccine-categories", async (req, res) => {
  const { data, error } = await supabase.from('vaccine_categories').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/vaccine-categories", async (req, res) => {
  const { error } = await supabase.from('vaccine_categories').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/vaccine-categories/:id", async (req, res) => {
  const { error } = await supabase.from('vaccine_categories').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Cat Vaccines
app.get("/api/cat-vaccines", async (req, res) => {
  const { data, error } = await supabase
    .from('cat_vaccines')
    .select('*, cats(name, branch_id), vaccine_categories(name, type), employees(name)');
  
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(v => ({
    ...v,
    cat_name: v.cats?.name || null,
    branch_id: v.cats?.branch_id || null,
    category_name: v.vaccine_categories?.name || null,
    type: v.vaccine_categories?.type || null,
    completed_by_name: v.employees?.name || null
  }));
  res.json(formatted);
});

app.post("/api/cat-vaccines", async (req, res) => {
  const { error } = await supabase.from('cat_vaccines').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/cat-vaccines/:id", async (req, res) => {
  const { error } = await supabase.from('cat_vaccines').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/cat-vaccines/:id", async (req, res) => {
  const { error } = await supabase.from('cat_vaccines').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Weight Records
app.get("/api/weight-records", async (req, res) => {
  const { data, error } = await supabase.from('weight_records').select('*').order('date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/weight-records", async (req, res) => {
  const { error } = await supabase.from('weight_records').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/weight-records/:id", async (req, res) => {
  const { error } = await supabase.from('weight_records').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/weight-records/:id", async (req, res) => {
  const { error } = await supabase.from('weight_records').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Medication Plans
app.get("/api/medication-plans", async (req, res) => {
  const { data, error } = await supabase.from('medication_plans').select('*, cats(name)');
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(p => ({
    ...p,
    cat_name: p.cats?.name || null
  }));
  res.json(formatted);
});

app.post("/api/medication-plans", async (req, res) => {
  const { error } = await supabase.from('medication_plans').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/medication-plans/:id", async (req, res) => {
  const { error } = await supabase.from('medication_plans').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/medication-plans/:id", async (req, res) => {
  const { error } = await supabase.from('medication_plans').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Bath Logs
app.get("/api/bath-logs", async (req, res) => {
  const { data, error } = await supabase
    .from('bath_logs')
    .select('*, cats(name, branch_id), employees!bath_logs_employee_id_fkey(name), completed_by_emp:employees!bath_logs_completed_by_fkey(name)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(l => ({
    ...l,
    cat_name: l.cats?.name || null,
    branch_id: l.cats?.branch_id || null,
    employee_name: l.employees?.name || null,
    completed_by_name: l.completed_by_emp?.name || null
  }));
  res.json(formatted);
});

app.post("/api/bath-logs", async (req, res) => {
  const { error } = await supabase.from('bath_logs').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/bath-logs/:id", async (req, res) => {
  const { is_completed, completed_by } = req.body;
  const completed_at = is_completed ? new Date().toISOString() : null;
  const { error } = await supabase.from('bath_logs').update({
    is_completed,
    completed_at,
    completed_by: is_completed ? completed_by : null
  }).eq('id', req.params.id);
  
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/bath-logs/:id", async (req, res) => {
  const { error } = await supabase.from('bath_logs').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Care Logs
app.get("/api/care-logs", async (req, res) => {
  const { data, error } = await supabase
    .from('care_logs')
    .select('*, cats(name, branch_id), employees(name)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(l => ({
    ...l,
    cat_name: l.cats?.name || null,
    branch_id: l.cats?.branch_id || null,
    employee_name: l.employees?.name || null
  }));
  res.json(formatted);
});

app.post("/api/care-logs", async (req, res) => {
  const { error } = await supabase.from('care_logs').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/care-logs/:id", async (req, res) => {
  const { error } = await supabase.from('care_logs').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Tasks
app.get("/api/tasks", async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, assigned_to_emp:employees!tasks_assigned_to_fkey(name), created_by_emp:employees!tasks_created_by_fkey(name)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(t => ({
    ...t,
    assigned_to_name: t.assigned_to_emp?.name || null,
    created_by_name: t.created_by_emp?.name || null
  }));
  res.json(formatted);
});

app.post("/api/tasks", async (req, res) => {
  const { error } = await supabase.from('tasks').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/tasks/:id", async (req, res) => {
  const { error } = await supabase.from('tasks').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Vet Visits
app.get("/api/vet-visits", async (req, res) => {
  const { data, error } = await supabase
    .from('vet_visits')
    .select('*, cats(name), rb:employees!vet_visits_requested_by_fkey(name), at:employees!vet_visits_authorized_to_fkey(name), ab:employees!vet_visits_authorized_by_fkey(name)')
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  const formatted = data.map(v => ({
    ...v,
    cat_name: v.cats?.name || null,
    requested_by_name: v.rb?.name || null,
    authorized_to_name: v.at?.name || null,
    authorized_by_name: v.ab?.name || null
  }));
  res.json(formatted);
});

app.post("/api/vet-visits", async (req, res) => {
  const { error } = await supabase.from('vet_visits').insert([req.body]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/vet-visits/:id", async (req, res) => {
  const { error } = await supabase.from('vet_visits').update(req.body).eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/vet-visits/:id", async (req, res) => {
  const { error } = await supabase.from('vet_visits').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Export/Import (Simplified for Supabase)
app.get("/api/export", async (req, res) => {
  const tables = [
    "branches", "breeds", "employees", "cats", "vaccine_categories", 
    "cat_vaccines", "weight_records", "medication_plans", "role_permissions", 
    "medication_logs", "settings", "attendance", "bath_logs", "care_logs", "cat_edit_logs", 
    "tasks", "vet_visits"
  ];
  const exportData: any = {};
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    exportData[table] = data || [];
  }
  res.json(exportData);
});

app.post("/api/import", async (req, res) => {
  const data = req.body;
  const tables = [
    "branches", "breeds", "employees", "cats", "vaccine_categories", 
    "cat_vaccines", "weight_records", "medication_plans", "role_permissions", 
    "medication_logs", "settings", "attendance", "bath_logs", "care_logs", "cat_edit_logs", 
    "tasks", "vet_visits"
  ];

  try {
    for (const table of tables) {
      if (data[table] && Array.isArray(data[table])) {
        await supabase.from(table).delete().neq('id', -1); // Wipe table
        if (data[table].length > 0) {
          await supabase.from(table).insert(data[table]);
        }
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;

async function setupVite() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
    });
  }
}

setupVite();
