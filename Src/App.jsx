import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function App() {
  const [session, setSession] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({
    email: "",
    password: "",
    job_name: "",
    job_location: "",
    estimated_hours: "",
    scheduled_date: "",
    start_time: "",
    customer_name: "",
    customer_phone: "",
    notes: ""
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadJobs();
  }, [session]);

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password
    });

    if (error) alert(error.message);
    else alert("Account created. Check your email if confirmation is enabled.");
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password
    });

    if (error) alert(error.message);
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

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("jobs").insert({
      job_name: form.job_name,
      job_location: form.job_location,
      estimated_hours: Number(form.estimated_hours),
      scheduled_date: form.scheduled_date,
      start_time: form.start_time,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      notes: form.notes,
      created_by: userData.user.id
    });

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      ...form,
      job_name: "",
      job_location: "",
      estimated_hours: "",
      scheduled_date: "",
      start_time: "",
      customer_name: "",
      customer_phone: "",
      notes: ""
    });

    loadJobs();
  }

  async function rescheduleJob(info) {
    const jobId = info.event.id;
    const newDate = info.event.startStr.split("T")[0];

    const oldJob = jobs.find((j) => j.id === jobId);

    const { error } = await supabase
      .from("jobs")
      .update({
        scheduled_date: newDate,
        status: "rescheduled",
        updated_at: new Date().toISOString()
      })
      .eq("id", jobId);

    if (error) {
      alert(error.message);
      info.revert();
      return;
    }

    const { data: userData } = await supabase.auth.getUser();

    await supabase.from("job_history").insert({
      job_id: jobId,
      action_type: "rescheduled",
      old_date: oldJob?.scheduled_date,
      new_date: newDate,
      changed_by: userData.user.id
    });

    loadJobs();
  }

  const calendarEvents = jobs.map((job) => ({
    id: job.id,
    title: `${job.job_name} - ${job.job_location}`,
    date: job.scheduled_date
  }));

  if (!session) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1>Work Calendar Login</h1>

          <input
            style={styles.input}
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            style={styles.input}
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button style={styles.button} onClick={login}>Login</button>
          <button style={styles.secondaryButton} onClick={signUp}>Create Account</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1>Shared Work Calendar</h1>
        <button style={styles.secondaryButton} onClick={logout}>Logout</button>
      </div>

      <div style={styles.layout}>
        <div style={styles.card}>
          <h2>Add Job</h2>

          <form onSubmit={createJob}>
            <input style={styles.input} required placeholder="Job Name" value={form.job_name}
              onChange={(e) => setForm({ ...form, job_name: e.target.value })} />

            <input style={styles.input} required placeholder="Job Location" value={form.job_location}
              onChange={(e) => setForm({ ...form, job_location: e.target.value })} />

            <input style={styles.input} required type="number" placeholder="Estimated Hours" value={form.estimated_hours}
              onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })} />

            <input style={styles.input} required type="date" value={form.scheduled_date}
              onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />

            <input style={styles.input} required type="time" value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })} />

            <input style={styles.input} placeholder="Customer Name" value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />

            <input style={styles.input} placeholder="Customer Phone" value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />

            <textarea style={styles.textarea} placeholder="Notes" value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />

            <button style={styles.button}>Create Job</button>
          </form>
        </div>

        <div style={styles.calendarCard}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay"
            }}
            events={calendarEvents}
            editable={true}
            eventDrop={rescheduleJob}
            height="auto"
          />
        </div>
      </div>

      <div style={styles.card}>
        <h2>Job List</h2>
        {jobs.map((job) => (
          <div key={job.id} style={styles.jobItem}>
            <strong>{job.job_name}</strong>
            <p>{job.job_location}</p>
            <p>{job.scheduled_date} at {job.start_time}</p>
            <p>Status: {job.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    fontFamily: "Arial, sans-serif",
    background: "#f4f6f8",
    minHeight: "100vh"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "350px 1fr",
    gap: 20
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    marginBottom: 20
  },
  calendarCard: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)"
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ccc"
  },
  textarea: {
    width: "100%",
    padding: 12,
    minHeight: 90,
    marginBottom: 10,
    borderRadius: 8,
    border: "1px solid #ccc"
  },
  button: {
    width: "100%",
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#2563eb",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  },
  secondaryButton: {
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#111827",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 10
  },
  jobItem: {
    borderTop: "1px solid #ddd",
    paddingTop: 10,
    marginTop: 10
  }
};
