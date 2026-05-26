import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
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
  const [jobTime, setJobTime] = useState("");

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

  async function createJob(e) {
    e.preventDefault();

    const { error } = await supabase.from("jobs").insert({
      job_name: jobName,
      job_location: jobLocation,
      estimated_hours: 1,
      scheduled_date: jobDate,
      start_time: jobTime
    });

    if (!error) {
      setJobName("");
      setJobLocation("");
      setJobDate("");
      setJobTime("");

      loadJobs();
    }
  }

  async function handleEventDrop(info) {
    const newDate = info.event.startStr.split("T")[0];

    const { error } = await supabase
      .from("jobs")
      .update({
        scheduled_date: newDate,
        status: "rescheduled"
      })
      .eq("id", number(info.event.id));

    if (error) {
      alert(error.message);
      info.revert();
    } else {
      loadJobs();
    }
  }

const events = jobs.map((job) => ({
  id: job.id,
  title: job.job_name,
  date: job.scheduled_date

  }));

  if (!session) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h1>Employee Login</h1>

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

          <button style={styles.button} onClick={login}>
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
    <div style={styles.page}>
      <div style={styles.topbar}>
        <h1>Shared Work Calendar</h1>

        <button style={styles.secondaryButton} onClick={logout}>
          Logout
        </button>
      </div>

      <div style={styles.layout}>
        <div style={styles.card}>
          <h2>Create Job</h2>

          <form onSubmit={createJob}>
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

            <input
              style={styles.input}
              type="time"
              value={jobTime}
              onChange={(e) => setJobTime(e.target.value)}
            />

            <button style={styles.button}>
              Create Job
            </button>
          </form>
        </div>

        <div style={styles.calendar}>
          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              interactionPlugin
            ]}
            initialView="dayGridMonth"
            editable={true}
            eventDrop={handleEventDrop}
            events={events}
            height="auto"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay"
            }}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    fontFamily: "Arial",
    background: "#f3f4f6",
    minHeight: "100vh"
  },
  topbar: {
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
    borderRadius: 12
  },
  calendar: {
    background: "white",
    padding: 20,
    borderRadius: 12
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 10
  },
  button: {
    width: "100%",
    padding: 12,
    background: "black",
    color: "white",
    border: "none"
  },
  secondaryButton: {
    padding: 12,
    background: "#444",
    color: "white",
    border: "none"
  }
};
