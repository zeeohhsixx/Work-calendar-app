import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [session, setSession] = useState(null);
  const [jobs, setJobs] = useState([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const [form, setForm] = useState({
    job_name: "",
    job_location: "",
    scheduled_date: "",
    start_time: "",
    estimated_hours: "",
    customer_name: "",
    customer_phone: "",
    notes: "",
    status: "scheduled"
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadJobs();
  }, [session]);

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
  }

  async function signUp() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert("Account created.");
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function loadJobs() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("scheduled_date", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setJobs(data || []);
  }

  async function createJob(e) {
    e.preventDefault();

    const { error } = await supabase.from("jobs").insert({
      job_name: form.job_name,
      job_location: form.job_location,
      scheduled_date: form.scheduled_date,
      start_time: form.start_time || null,
      estimated_hours: Number(form.estimated_hours || 1),
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      notes: form.notes,
      status: form.status
    });

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      job_name: "",
      job_location: "",
      scheduled_date: "",
      start_time: "",
      estimated_hours: "",
      customer_name: "",
      customer_phone: "",
      notes: "",
      status: "scheduled"
    });

    setShowForm(false);
    loadJobs();
  }

  async function rescheduleJob(info) {
    const newDate = info.event.startStr.split("T")[0];

    const { error } = await supabase
      .from("jobs")
      .update({
        scheduled_date: newDate,
        status: "rescheduled"
      })
      .eq("id", Number(info.event.id));

    if (error) {
      alert(error.message);
      info.revert();
    } else {
      loadJobs();
    }
  }

  function eventColor(status) {
    if (status === "completed") return "#6b7280";
    if (status === "in_progress") return "#2563eb";
    if (status === "urgent") return "#dc2626";
    if (status === "rescheduled") return "#7c3aed";
    return "#0ea5e9";
  }

  const events = jobs
    .filter((job) => job.scheduled_date)
    .map((job) => ({
      id: String(job.id),
      title: job.job_name,
      start: job.start_time
        ? `${job.scheduled_date}T${job.start_time}`
        : job.scheduled_date,
      backgroundColor: eventColor(job.status),
      borderColor: eventColor(job.status),
      textColor: "#ffffff",
      extendedProps: job
    }));

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="logo-box">
            <img src="/logo.jpeg" className="logo" />
          </div>

          <h1>Employee Login</h1>

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

      <section className="calendar-card">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          editable={true}
          eventDrop={rescheduleJob}
          eventClick={(info) => setSelectedJob(info.event.extendedProps)}
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

      <button className="floating-add" onClick={() => setShowForm(true)}>+</button>

      {showForm && (
        <div className="modal-bg">
          <form className="modal" onSubmit={createJob}>
            <h2>Add Job</h2>

            <input required placeholder="Job Name" value={form.job_name} onChange={(e) => setForm({ ...form, job_name: e.target.value })} />
            <input required placeholder="Job Location" value={form.job_location} onChange={(e) => setForm({ ...form, job_location: e.target.value })} />
            <input required type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <input type="number" placeholder="Estimated Hours" value={form.estimated_hours} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} />
            <input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            <input placeholder="Customer Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />

            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="urgent">Urgent</option>
              <option value="completed">Completed</option>
            </select>

            <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <button type="submit">Save Job</button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </form>
        </div>
      )}

      {selectedJob && (
        <div className="modal-bg">
          <div className="modal">
            <h2>{selectedJob.job_name}</h2>
            <p><strong>Location:</strong> {selectedJob.job_location}</p>
            <p><strong>Date:</strong> {selectedJob.scheduled_date}</p>
            <p><strong>Time:</strong> {selectedJob.start_time || "Not set"}</p>
            <p><strong>Customer:</strong> {selectedJob.customer_name || "Not set"}</p>
            <p><strong>Phone:</strong> {selectedJob.customer_phone || "Not set"}</p>
            <p><strong>Status:</strong> {selectedJob.status}</p>
            <p>{selectedJob.notes}</p>

            <button onClick={() => setSelectedJob(null)}>Close</button>
          </div>
        </div>
      )}

      <nav>
        <span>📅</span>
        <span>📋</span>
        <span>🔔</span>
        <span>⚙️</span>
      </nav>
    </div>
  );
}
