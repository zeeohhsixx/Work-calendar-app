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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [jobs, setJobs] = useState([]);

  const [jobName, setJobName] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobDate, setJobDate] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadJobs();
    }
  }, [session]);

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) alert(error.message);
    else alert("Account created.");
  }

  async function login() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
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

    if (!error) {
      setJobs(data || []);
    }
  }

  async function createJob() {
    if (!jobName || !jobDate) return;

    const { error } = await supabase.from("jobs").insert({
      job_name: jobName,
      job_location: jobLocation,
      scheduled_date: jobDate,
      status: "scheduled"
    });

    if (!error) {
      setJobName("");
      setJobLocation("");
      setJobDate("");

      loadJobs();
    }
  }

  async function handleEventDrop(info) {
    const newDate = info.event.startStr.split("T")[0];

    await supabase
      .from("jobs")
      .update({
        scheduled_date: newDate
      })
      .eq("id", Number(info.event.id));

    loadJobs();
  }

  const events = jobs.map((job) => ({
    id: String(job.id),
    title: job.job_name,
    start: job.scheduled_date,
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
    textColor: "#fff"
  }));

  if (!session) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <h1 style={{ marginBottom: 20 }}>Employee Login</h1>

          <input
            style={styles.input}
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button style={styles.primaryButton} onClick={login}>
            Login
          </button>

          <button style={styles.secondaryButton} onClick={signUp}>
            Create Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Work Calendar</h1>

        <button style={styles.logoutButton} onClick={logout}>
          Logout
        </button>
      </div>

      <div style={styles.formCard}>
        <input
          style={styles.input}
          placeholder="Job Name"
          value={jobName}
          onChange={(e) => setJobName(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Job Location"
          value={jobLocation}
          onChange={(e) => setJobLocation(e.target.value)}
        />

        <input
          style={styles.input}
          type="date"
          value={jobDate}
          onChange={(e) => setJobDate(e.target.value)}
        />

        <button style={styles.primaryButton} onClick={createJob}>
          Add Job
        </button>
      </div>

      <div style={styles.calendarWrapper}>
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          editable={true}
          eventDrop={handleEventDrop}
          events={events}
          height="auto"
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: ""
          }}
        />
      </div>

      <div style={styles.bottomNav}>
        <div>📅</div>
        <div>📋</div>
        <div>🔔</div>
        <div>⚙️</div>
      </div>
    </div>
  );
}

const styles = {
  app: {
    background: "#0b0b0b",
    minHeight: "100vh",
    color: "white",
    padding: 16,
    fontFamily: "Arial"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },

  formCard: {
    background: "#1a1a1a",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20
  },

  calendarWrapper: {
    background: "#1a1a1a",
    borderRadius: 16,
    padding: 12
  },

  input: {
    width: "100%",
    padding: 14,
    marginBottom: 12,
    borderRadius: 10,
    border: "1px solid #333",
    background: "#111",
    color: "white",
    fontSize: 16
  },

  primaryButton: {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    border: "none",
    background: "#22c55e",
    color: "white",
    fontWeight: "bold",
    fontSize: 16
  },

  secondaryButton: {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    border: "none",
    background: "#333",
    color: "white",
    marginTop: 10
  },

  logoutButton: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "none",
    background: "#222",
    color: "white"
  },

  bottomNav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#111",
    borderTop: "1px solid #222",
    display: "flex",
    justifyContent: "space-around",
    padding: 16,
    fontSize: 24
  },

  loginPage: {
    background: "#0b0b0b",
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },

  loginCard: {
    background: "#1a1a1a",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    color: "white"
  }
};
