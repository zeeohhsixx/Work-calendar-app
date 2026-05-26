import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [jobName, setJobName] = useState("");
  const [jobLocation, setJobLocation] = useState("");

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });

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
      scheduled_date: new Date().toISOString().split("T")[0],
      start_time: "08:00"
    });

    if (!error) {
      setJobName("");
      setJobLocation("");
      loadJobs();
    }
  }

  return (
    <div style={styles.page}>
      <h1>Shared Work Calendar</h1>

      <div style={styles.card}>
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

          <button style={styles.button}>
            Create Job
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <h2>Jobs</h2>

        {jobs.map((job) => (
          <div key={job.id} style={styles.job}>
            <strong>{job.job_name}</strong>
            <p>{job.job_location}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 40,
    fontFamily: "Arial",
    background: "#f3f4f6",
    minHeight: "100vh"
  },
  card: {
    background: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 10
  },
  button: {
    padding: 12,
    width: "100%",
    background: "black",
    color: "white",
    border: "none"
  },
  job: {
    borderTop: "1px solid #ddd",
    paddingTop: 10,
    marginTop: 10
  }
};
