import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const emptyForm = {
  job_name: "",
  job_location: "",
  street_address: "",
  scheduled_date: "",
  end_date: "",
  start_time: "",
  estimated_hours: "",
  customer_name: "",
  customer_phone: "",
  notes: "",
  status: "scheduled",
  priority: "normal",
  assignedEmployees: []
};

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [files, setFiles] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [displayName, setDisplayName] = useState("");
  const [employeeColor, setEmployeeColor] = useState("#38bdf8");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    setupEmployee();
    loadEverything();

    const channel = supabase
      .channel("live-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, loadEverything)
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, loadEverything)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_files" }, loadEverything)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_assignments" }, loadEverything)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [session]);

  async function setupEmployee() {
    const user = session.user;

    const { data: existingEmployee } = await supabase
      .from("employees")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!existingEmployee) {
      await supabase.from("employees").insert({
        id: user.id,
        full_name: user.email,
        display_name: user.email,
        color: "#38bdf8",
        role: "employee"
      });
    }
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function signUp() {
    if (!email || !password) {
      alert("Enter your work email and create a password first.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) alert(error.message);
    else alert("Account created. You can now log in with your email and password.");
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function loadEverything() {
    const [jobRes, employeeRes, fileRes, assignmentRes] = await Promise.all([
      supabase.from("jobs").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("employees").select("*").order("display_name"),
      supabase.from("job_files").select("*").order("created_at", { ascending: false }),
      supabase.from("job_assignments").select("*")
    ]);

    if (!jobRes.error) setJobs(jobRes.data || []);
    if (!assignmentRes.error) setAssignments(assignmentRes.data || []);
    if (!fileRes.error) setFiles(fileRes.data || []);

    if (!employeeRes.error) {
      setEmployees(employeeRes.data || []);
      const currentEmployee = employeeRes.data?.find((e) => e.id === session.user.id);
      setDisplayName(currentEmployee?.display_name || "");
      setEmployeeColor(currentEmployee?.color || "#38bdf8");
    }
  }

  async function updateProfile() {
    if (!displayName.trim()) {
      alert("Please enter a display name.");
      return;
    }

    const { error } = await supabase
      .from("employees")
      .update({ display_name: displayName.trim(), color: employeeColor })
      .eq("id", session.user.id);

    if (error) alert(error.message);
    else {
      await loadEverything();
      alert("Profile updated.");
    }
  }

  function getJobAssignments(jobId) {
    return assignments.filter((a) => Number(a.job_id) === Number(jobId));
  }

  function getAssignedEmployeesForJob(jobId) {
    return getJobAssignments(jobId)
      .map((a) => employees.find((e) => e.id === a.employee_id))
      .filter(Boolean);
  }

  function getAssignedNames(jobId) {
    const assigned = getAssignedEmployeesForJob(jobId);
    if (assigned.length === 0) return "Unassigned";
    return assigned.map((e) => e.display_name || e.full_name).join(", ");
  }

  function getJobGradient(jobId) {
    const assigned = getAssignedEmployeesForJob(jobId);

    if (assigned.length === 0) return "#334155";
    if (assigned.length === 1) return assigned[0].color || "#38bdf8";

    const colors = assigned.map((e) => e.color || "#38bdf8");
    return `linear-gradient(90deg, ${colors.join(", ")})`;
  }

  function toggleAssignedEmployee(employeeId) {
    setForm((current) => {
      const exists = current.assignedEmployees.includes(employeeId);

      return {
        ...current,
        assignedEmployees: exists
          ? current.assignedEmployees.filter((id) => id !== employeeId)
          : [...current.assignedEmployees, employeeId]
      };
    });
  }

  function openCreateForm() {
    setEditingJob(null);
    setForm(emptyForm);
    setShowForm(true);
  }
function duplicateJob(job) {
  setSelectedJob(null);
  setEditingJob(null);

  const currentAssignments = getJobAssignments(job.id).map(
    (a) => a.employee_id
  );

  setForm({
    job_name: job.job_name || "",
    job_location: job.job_location || "",
    street_address: job.street_address || "",
    scheduled_date: "",
    end_date: "",
    start_time: job.start_time || "",
    estimated_hours: job.estimated_hours || "",
    customer_name: job.customer_name || "",
    customer_phone: job.customer_phone || "",
    notes: job.notes || "",
    status: "scheduled",
    priority: job.priority || "normal",
    assignedEmployees: currentAssignments
  });

  setShowForm(true);
}
  function openEditForm(job) {
    const currentAssignments = getJobAssignments(job.id).map((a) => a.employee_id);

    setEditingJob(job);
    setSelectedJob(null);

    setForm({
      job_name: job.job_name || "",
      job_location: job.job_location || "",
      street_address: job.street_address || "",
      scheduled_date: job.scheduled_date || "",
      end_date: job.end_date || job.scheduled_date || "",
      start_time: job.start_time || "",
      estimated_hours: job.estimated_hours || "",
      customer_name: job.customer_name || "",
      customer_phone: job.customer_phone || "",
      notes: job.notes || "",
      status: job.status || "scheduled",
      priority: job.priority || "normal",
      assignedEmployees: currentAssignments
    });

    setShowForm(true);
  }

  async function saveAssignments(jobId, employeeIds) {
    await supabase.from("job_assignments").delete().eq("job_id", jobId);

    if (employeeIds.length === 0) return;

    const rows = employeeIds.map((employeeId) => ({
      job_id: jobId,
      employee_id: employeeId
    }));

    const { error } = await supabase.from("job_assignments").insert(rows);
    if (error) alert(error.message);
  }

  async function saveJob(e) {
    e.preventDefault();

    if (!form.street_address.trim()) {
      alert("Street address is required.");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    const jobData = {
      job_name: form.job_name,
      job_location: form.job_location,
      street_address: form.street_address,
      scheduled_date: form.scheduled_date,
      end_date: form.end_date || form.scheduled_date,
      start_time: form.start_time || null,
      estimated_hours: Number(form.estimated_hours || 1),
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      notes: form.notes,
      status: form.status,
      priority: form.priority,
      created_by: userData.user.id,
      updated_at: new Date().toISOString()
    };

    const response = editingJob
      ? await supabase.from("jobs").update(jobData).eq("id", editingJob.id).select().single()
      : await supabase.from("jobs").insert(jobData).select().single();

    if (response.error) {
      alert(response.error.message);
      return;
    }

    await saveAssignments(response.data.id, form.assignedEmployees);

    setForm(emptyForm);
    setEditingJob(null);
    setShowForm(false);
    loadEverything();
  }

  async function deleteJob(jobId) {
    if (!window.confirm("Delete this job?")) return;

    const { error } = await supabase.from("jobs").delete().eq("id", jobId);

    if (error) alert(error.message);
    else {
      setSelectedJob(null);
      loadEverything();
    }
  }

  async function updateStatus(jobId, status) {
    const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);

    if (error) alert(error.message);
    else {
      setSelectedJob(null);
      loadEverything();
    }
  }

  async function rescheduleJob(info) {
    const newDate = info.event.startStr.split("T")[0];

    const { error } = await supabase
      .from("jobs")
      .update({
        scheduled_date: newDate,
        end_date: newDate,
        status: "rescheduled",
        updated_at: new Date().toISOString()
      })
      .eq("id", Number(info.event.id));

    if (error) {
      alert(error.message);
      info.revert();
    } else {
      loadEverything();
    }
  }

  async function uploadFile(jobId, file) {
    if (!file) return;

    const path = `${jobId}/${Date.now()}-${file.name}`;

    const upload = await supabase.storage.from("job-files").upload(path, file);

    if (upload.error) {
      alert(upload.error.message);
      return;
    }

    const urlData = supabase.storage.from("job-files").getPublicUrl(path);

    const { error } = await supabase.from("job_files").insert({
      job_id: jobId,
      file_url: urlData.data.publicUrl,
      file_name: file.name,
      file_type: file.type,
      uploaded_by: session.user.id
    });

    if (error) alert(error.message);
    else loadEverything();
  }

  function appleMaps(address) {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
  }

  function wazeMaps(address) {
    return `https://www.waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const assignedNames = getAssignedNames(job.id).toLowerCase();

      const matchesSearch =
        job.job_name?.toLowerCase().includes(search.toLowerCase()) ||
        job.job_location?.toLowerCase().includes(search.toLowerCase()) ||
        job.street_address?.toLowerCase().includes(search.toLowerCase()) ||
        job.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        assignedNames.includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter, employees, assignments]);

  const todayJobs = filteredJobs.filter((job) => {
    const today = new Date().toISOString().split("T")[0];
    const end = job.end_date || job.scheduled_date;
    return job.scheduled_date <= today && end >= today;
  });

  const events = filteredJobs
    .filter((job) => job.scheduled_date)
    .map((job) => {
      const event = {
        id: String(job.id),
        title: job.job_name,
        start: job.start_time
          ? `${job.scheduled_date}T${job.start_time}`
          : job.scheduled_date,
        backgroundColor: "transparent",
        borderColor: "transparent",
        extendedProps: job
      };

      if (job.end_date) {
        const exclusiveEnd = new Date(job.end_date);
        exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
        event.end = exclusiveEnd.toISOString().split("T")[0];
      }

      return event;
    });

  function renderEventContent(eventInfo) {
    const job = eventInfo.event.extendedProps;
    const assignedCount = getAssignedEmployeesForJob(job.id).length;

    return (
      <div className="gradient-event" style={{ background: getJobGradient(job.id) }}>
        <span className="gradient-event-title">{job.job_name}</span>
        {assignedCount > 1 && <span className="multi-count">+{assignedCount}</span>}
      </div>
    );
  }

  const selectedFiles = selectedJob
    ? files.filter((file) => Number(file.job_id) === Number(selectedJob.id))
    : [];

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="logo-box">
            <img src="/logo.jpeg" className="logo" />
          </div>

          <h1>Employee Login</h1>

          <p className="signup-help">
            New employee? Enter your work email and create a password with at least 6 characters,
            then tap Create Account. After signing up, use the same email and password to log in.
          </p>

          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <button onClick={login}>Login</button>
          <button className="secondary" onClick={signUp}>Create Account</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <img src="/logo.jpeg" className="header-logo" />
          <div>
            <h1>Scheduler</h1>
            <p>Custom Blinds, Shades, & Shutters</p>
          </div>
        </div>

        <button className="logout" onClick={logout}>Logout</button>
      </header>

      <div className="filters">
        <input placeholder="Search jobs, customers, addresses, employees..." value={search} onChange={(e) => setSearch(e.target.value)} />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Jobs</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="rescheduled">Rescheduled</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {activeTab === "calendar" && (
        <section className="calendar-card">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            editable={true}
            eventDrop={rescheduleJob}
            eventClick={(info) => setSelectedJob(info.event.extendedProps)}
            eventContent={renderEventContent}
            events={events}
            height="auto"
            dayMaxEvents={4}
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "today"
            }}
          />
        </section>
      )}

      {activeTab === "list" && (
        <section className="panel">
          <h2>Job List</h2>

          {filteredJobs.map((job) => (
            <div className="job-card" key={job.id} onClick={() => setSelectedJob(job)}>
              <strong>{job.job_name}</strong>
              <p>{job.street_address}</p>
              <p>Assigned: {getAssignedNames(job.id)}</p>
              <span>{job.scheduled_date} to {job.end_date || job.scheduled_date} • {job.status}</span>
            </div>
          ))}
        </section>
      )}

      {activeTab === "today" && (
        <section className="panel">
          <h2>Today’s Agenda</h2>

          {todayJobs.length === 0 && <p>No jobs scheduled today.</p>}

          {todayJobs.map((job) => (
            <div className="job-card" key={job.id} onClick={() => setSelectedJob(job)}>
              <strong>{job.job_name}</strong>
              <p>{job.street_address}</p>
              <p>Assigned: {getAssignedNames(job.id)}</p>
              <span>{job.start_time || "No time set"}</span>
            </div>
          ))}
        </section>
      )}

      {activeTab === "profile" && (
        <section className="panel">
          <h2>Profile</h2>
          <p>Change your name and calendar color.</p>

          <input placeholder="Display Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

          <label className="color-label">Your Calendar Color</label>
          <input type="color" value={employeeColor} onChange={(e) => setEmployeeColor(e.target.value)} />

          <button onClick={updateProfile}>Save Profile</button>
        </section>
      )}

      <button className="floating-add" onClick={openCreateForm}>+</button>

      {showForm && (
        <div className="modal-bg">
          <form className="modal" onSubmit={saveJob}>
            <h2>{editingJob ? "Edit Job" : "Add Job"}</h2>

            <input required placeholder="Job Name" value={form.job_name} onChange={(e) => setForm({ ...form, job_name: e.target.value })} />
            <input required placeholder="Job Location / Area" value={form.job_location} onChange={(e) => setForm({ ...form, job_location: e.target.value })} />
            <input required placeholder="Street Address Required" value={form.street_address} onChange={(e) => setForm({ ...form, street_address: e.target.value })} />

            <div className="date-time-row">
              <label className="field-label">
                Start Date
                <input required type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
              </label>

              <label className="field-label">
                End Date
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </label>
            </div>

            <label className="field-label">
              Start Time
              <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </label>

            <input type="number" placeholder="Estimated Hours" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} />
            <input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <input placeholder="Customer Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />

            <div className="assignment-box">
              <p className="assignment-title">Assign Employees</p>

              {employees.map((employee) => (
                <label className="employee-check" key={employee.id}>
                  <input type="checkbox" checked={form.assignedEmployees.includes(employee.id)} onChange={() => toggleAssignedEmployee(employee.id)} />
                  <span className="employee-color-dot" style={{ backgroundColor: employee.color || "#38bdf8" }} />
                  <span>{employee.display_name || employee.full_name || "Unnamed Employee"}</span>
                </label>
              ))}
            </div>

            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="completed">Completed</option>
            </select>

            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="normal">Normal Priority</option>
              <option value="urgent">Urgent</option>
            </select>

            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <button type="submit">{editingJob ? "Update Job" : "Save Job"}</button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        </div>
      )}

      {selectedJob && (
        <div className="modal-bg">
          <div className="modal">
            <h2>{selectedJob.job_name}</h2>

            <p><strong>Address:</strong> {selectedJob.street_address}</p>
            <p><strong>Location:</strong> {selectedJob.job_location}</p>
            <p><strong>Date Range:</strong> {selectedJob.scheduled_date} to {selectedJob.end_date || selectedJob.scheduled_date}</p>
            <p><strong>Time:</strong> {selectedJob.start_time || "Not set"}</p>
            <p><strong>Customer:</strong> {selectedJob.customer_name || "Not set"}</p>
            <p><strong>Phone:</strong> {selectedJob.customer_phone || "Not set"}</p>
            <p><strong>Assigned To:</strong> {getAssignedNames(selectedJob.id)}</p>
            <p><strong>Status:</strong> {selectedJob.status}</p>
            <p><strong>Priority:</strong> {selectedJob.priority}</p>
            <p>{selectedJob.notes}</p>

            <div className="map-grid">
              <a href={appleMaps(selectedJob.street_address)} target="_blank">Apple Maps</a>
              <a href={wazeMaps(selectedJob.street_address)} target="_blank">Waze</a>
            </div>

            <label className="upload-box">
              Upload Picture / Document
              <input type="file" onChange={(e) => uploadFile(selectedJob.id, e.target.files[0])} />
            </label>

            <h3>Files</h3>

            {selectedFiles.map((file) => (
              <a className="file-link" key={file.id} href={file.file_url} target="_blank">
                {file.file_name}
              </a>
            ))}

          <button onClick={() => openEditForm(selectedJob)}>
  Edit Job
</button>

<button
  className="secondary"
  onClick={() => duplicateJob(selectedJob)}
>
  Duplicate Job
</button>

<button
  className="secondary"
  onClick={() => updateStatus(selectedJob.id, "in_progress")}
>
  Mark In Progress
</button>

<button
  className="secondary"
  onClick={() => updateStatus(selectedJob.id, "completed")}
>
  Mark Completed
</button>
            <button className="danger" onClick={() => deleteJob(selectedJob.id)}>Delete Job</button>
            <button className="secondary" onClick={() => setSelectedJob(null)}>Close</button>
          </div>
        </div>
      )}

      <nav>
        <button className={activeTab === "calendar" ? "nav-active" : ""} onClick={() => setActiveTab("calendar")}><span>Calendar</span></button>
        <button className={activeTab === "list" ? "nav-active" : ""} onClick={() => setActiveTab("list")}><span>Jobs</span></button>
        <button className={activeTab === "today" ? "nav-active" : ""} onClick={() => setActiveTab("today")}><span>Today</span></button>
        <button className={activeTab === "profile" ? "nav-active" : ""} onClick={() => setActiveTab("profile")}><span>Profile</span></button>
      </nav>
    </div>
  );
}
