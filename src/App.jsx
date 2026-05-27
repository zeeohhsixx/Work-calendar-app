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
  scheduled_date: "",
  start_time: "",
  estimated_hours: "",
  customer_name: "",
  customer_phone: "",
  notes: "",
  status: "scheduled",
  priority: "normal",
  assigned_to: ""
};

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("calendar");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
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

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;

    setupEmployee();
    loadEverything();

    const channel = supabase
      .channel("live-jobs")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, loadEverything)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_files" }, loadEverything)
      .on("postgres_changes", { event: "*", schema: "public", table: "employees" }, loadEverything)
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) alert(error.message);
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) alert(error.message);
    else alert("Account created.");
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function loadEverything() {
    const [jobRes, employeeRes, fileRes] = await Promise.all([
      supabase.from("jobs").select("*").order("scheduled_date", { ascending: true }),
      supabase.from("employees").select("*").order("display_name"),
      supabase.from("job_files").select("*").order("created_at", { ascending: false })
    ]);

    if (!jobRes.error) setJobs(jobRes.data || []);

    if (!employeeRes.error) {
      setEmployees(employeeRes.data || []);

      const currentEmployee = employeeRes.data?.find(
        (e) => e.id === session.user.id
      );

      setDisplayName(currentEmployee?.display_name || "");
      setEmployeeColor(currentEmployee?.color || "#38bdf8");
    }

    if (!fileRes.error) setFiles(fileRes.data || []);
  }

  async function updateProfile() {
    if (!displayName.trim()) {
      alert("Please enter a display name.");
      return;
    }

    const { error } = await supabase
      .from("employees")
      .update({
        display_name: displayName.trim(),
        color: employeeColor
      })
      .eq("id", session.user.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadEverything();
    alert("Profile updated.");
  }

  function getEmployeeName(userId) {
    const employee = employees.find((e) => e.id === userId);
    return employee?.display_name || employee?.full_name || "Unassigned";
  }

  function getEmployeeColor(userId) {
    const employee = employees.find((e) => e.id === userId);
    return employee?.color || "#38bdf8";
  }

  function openCreateForm() {
    setEditingJob(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEditForm(job) {
    setEditingJob(job);
    setSelectedJob(null);

    setForm({
      job_name: job.job_name || "",
      job_location: job.job_location || "",
      scheduled_date: job.scheduled_date || "",
      start_time: job.start_time || "",
      estimated_hours: job.estimated_hours || "",
      customer_name: job.customer_name || "",
      customer_phone: job.customer_phone || "",
      notes: job.notes || "",
      status: job.status || "scheduled",
      priority: job.priority || "normal",
      assigned_to: job.assigned_to || ""
    });

    setShowForm(true);
  }

  async function saveJob(e) {
    e.preventDefault();

    const { data: userData } = await supabase.auth.getUser();

    const jobData = {
      job_name: form.job_name,
      job_location: form.job_location,
      scheduled_date: form.scheduled_date,
      start_time: form.start_time || null,
      estimated_hours: Number(form.estimated_hours || 1),
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      notes: form.notes,
      status: form.status,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      created_by: userData.user.id,
      updated_at: new Date().toISOString()
    };

    const response = editingJob
      ? await supabase.from("jobs").update(jobData).eq("id", editingJob.id)
      : await supabase.from("jobs").insert(jobData).select().single();

    if (response.error) {
      alert(response.error.message);
      return;
    }

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
    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", jobId);

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
        status: "rescheduled",
        updated_at: new Date().toISOString()
      })
      .eq("id", Number(info.event.id));

    if (error) {
      alert(error.message);
      info.revert();
      return;
    }

    loadEverything();
  }

  async function uploadFile(jobId, file) {
    if (!file) return;

    const path = `${jobId}/${Date.now()}-${file.name}`;

    const upload = await supabase.storage
      .from("job-files")
      .upload(path, file);

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
      const assignedName = getEmployeeName(job.assigned_to).toLowerCase();

      const matchesSearch =
        job.job_name?.toLowerCase().includes(search.toLowerCase()) ||
        job.job_location?.toLowerCase().includes(search.toLowerCase()) ||
        job.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        assignedName.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter, employees]);

  const todayJobs = filteredJobs.filter(
    (job) => job.scheduled_date === new Date().toISOString().split("T")[0]
  );

  const events = filteredJobs
    .filter((job) => job.scheduled_date)
    .map((job) => ({
      id: String(job.id),
      title: job.job_name,
      start: job.start_time
        ? `${job.scheduled_date}T${job.start_time}`
        : job.scheduled_date,
      backgroundColor: "transparent",
      borderColor: "transparent",
      textColor: job.assigned_to
        ? getEmployeeColor(job.assigned_to)
        : "#ffffff",
      extendedProps: job
    }));

  function renderEventContent(eventInfo) {
    const job = eventInfo.event.extendedProps;
    const color = job.assigned_to
      ? getEmployeeColor(job.assigned_to)
      : "#ffffff";

    return (
      <div className="calendar-event-row" style={{ color }}>
        <span className="event-name">{eventInfo.event.title}</span>
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

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={login}>Login</button>

          <button className="secondary" onClick={signUp}>
            Create Account
          </button>
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

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </header>

      <div className="filters">
        <input
          placeholder="Search jobs, customers, locations, employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
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
            <div
              className="job-card"
              key={job.id}
              onClick={() => setSelectedJob(job)}
            >
              <strong
                style={{
                  color: job.assigned_to
                    ? getEmployeeColor(job.assigned_to)
                    : "#ffffff"
                }}
              >
                {job.job_name}
              </strong>
              <p>{job.job_location}</p>
              <p>
                Assigned:{" "}
                {job.assigned_to
                  ? getEmployeeName(job.assigned_to)
                  : "Unassigned"}
              </p>
              <span>
                {job.scheduled_date} • {job.status}
              </span>
            </div>
          ))}
        </section>
      )}

      {activeTab === "today" && (
        <section className="panel">
          <h2>Today’s Agenda</h2>

          {todayJobs.length === 0 && <p>No jobs scheduled today.</p>}

          {todayJobs.map((job) => (
            <div
              className="job-card"
              key={job.id}
              onClick={() => setSelectedJob(job)}
            >
              <strong
                style={{
                  color: job.assigned_to
                    ? getEmployeeColor(job.assigned_to)
                    : "#ffffff"
                }}
              >
                {job.job_name}
              </strong>
              <p>{job.job_location}</p>
              <p>
                Assigned:{" "}
                {job.assigned_to
                  ? getEmployeeName(job.assigned_to)
                  : "Unassigned"}
              </p>
              <span>{job.start_time || "No time set"}</span>
            </div>
          ))}
        </section>
      )}

      {activeTab === "profile" && (
        <section className="panel">
          <h2>Profile</h2>

          <p>Change your name and calendar color.</p>

          <input
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <label className="color-label">Your Calendar Color</label>

          <input
            type="color"
            value={employeeColor}
            onChange={(e) => setEmployeeColor(e.target.value)}
          />

          <button onClick={updateProfile}>Save Profile</button>
        </section>
      )}

      <button className="floating-add" onClick={openCreateForm}>
        +
      </button>

      {showForm && (
        <div className="modal-bg">
          <form className="modal" onSubmit={saveJob}>
            <h2>{editingJob ? "Edit Job" : "Add Job"}</h2>

            <input
              required
              placeholder="Job Name"
              value={form.job_name}
              onChange={(e) =>
                setForm({ ...form, job_name: e.target.value })
              }
            />

            <input
              required
              placeholder="Job Location"
              value={form.job_location}
              onChange={(e) =>
                setForm({ ...form, job_location: e.target.value })
              }
            />

            <div className="date-time-row">
              <label className="field-label">
                Job Date
                <input
                  required
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) =>
                    setForm({ ...form, scheduled_date: e.target.value })
                  }
                />
              </label>

              <label className="field-label">
                Start Time
                <input
                  type="time"
                  value={form.start_time}
                  onChange={(e) =>
                    setForm({ ...form, start_time: e.target.value })
                  }
                />
              </label>
            </div>

            <input
              type="number"
              placeholder="Estimated Hours"
              value={form.estimated_hours}
              onChange={(e) =>
                setForm({ ...form, estimated_hours: e.target.value })
              }
            />

            <input
              placeholder="Customer Name"
              value={form.customer_name}
              onChange={(e) =>
                setForm({ ...form, customer_name: e.target.value })
              }
            />

            <input
              placeholder="Customer Phone"
              value={form.customer_phone}
              onChange={(e) =>
                setForm({ ...form, customer_phone: e.target.value })
              }
            />

            <select
              value={form.assigned_to}
              onChange={(e) =>
                setForm({ ...form, assigned_to: e.target.value })
              }
            >
              <option value="">Unassigned</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.display_name ||
                    employee.full_name ||
                    "Unnamed Employee"}
                </option>
              ))}
            </select>

            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={form.priority}
              onChange={(e) =>
                setForm({ ...form, priority: e.target.value })
              }
            >
              <option value="normal">Normal Priority</option>
              <option value="urgent">Urgent</option>
            </select>

            <textarea
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <button type="submit">
              {editingJob ? "Update Job" : "Save Job"}
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {selectedJob && (
        <div className="modal-bg">
          <div className="modal">
            <h2
              style={{
                color: selectedJob.assigned_to
                  ? getEmployeeColor(selectedJob.assigned_to)
                  : "#ffffff"
              }}
            >
              {selectedJob.job_name}
            </h2>

            <p><strong>Location:</strong> {selectedJob.job_location}</p>
            <p><strong>Date:</strong> {selectedJob.scheduled_date}</p>
            <p><strong>Time:</strong> {selectedJob.start_time || "Not set"}</p>
            <p><strong>Customer:</strong> {selectedJob.customer_name || "Not set"}</p>
            <p><strong>Phone:</strong> {selectedJob.customer_phone || "Not set"}</p>
            <p><strong>Assigned To:</strong> {selectedJob.assigned_to ? getEmployeeName(selectedJob.assigned_to) : "Unassigned"}</p>
            <p><strong>Status:</strong> {selectedJob.status}</p>
            <p><strong>Priority:</strong> {selectedJob.priority}</p>
            <p>{selectedJob.notes}</p>

            <div className="map-grid">
              <a href={appleMaps(selectedJob.job_location)} target="_blank">
                Apple Maps
              </a>

              <a href={wazeMaps(selectedJob.job_location)} target="_blank">
                Waze
              </a>
            </div>

            <label className="upload-box">
              Upload Picture / Document
              <input
                type="file"
                onChange={(e) =>
                  uploadFile(selectedJob.id, e.target.files[0])
                }
              />
            </label>

            <h3>Files</h3>

            {selectedFiles.map((file) => (
              <a
                className="file-link"
                key={file.id}
                href={file.file_url}
                target="_blank"
              >
                {file.file_name}
              </a>
            ))}

            <button onClick={() => openEditForm(selectedJob)}>Edit Job</button>

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

            <button
              className="danger"
              onClick={() => deleteJob(selectedJob.id)}
            >
              Delete Job
            </button>

            <button className="secondary" onClick={() => setSelectedJob(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <nav>
        <button
          className={activeTab === "calendar" ? "nav-active" : ""}
          onClick={() => setActiveTab("calendar")}
        >
          <span>Calendar</span>
        </button>

        <button
          className={activeTab === "list" ? "nav-active" : ""}
          onClick={() => setActiveTab("list")}
        >
          <span>Jobs</span>
        </button>

        <button
          className={activeTab === "today" ? "nav-active" : ""}
          onClick={() => setActiveTab("today")}
        >
          <span>Today</span>
        </button>

        <button
          className={activeTab === "profile" ? "nav-active" : ""}
          onClick={() => setActiveTab("profile")}
        >
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
