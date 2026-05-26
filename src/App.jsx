import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setMessage("Supabase error: " + error.message);
          return;
        }

        setMessage("Supabase connected successfully.");
      } catch (err) {
        setMessage("Crash: " + err.message);
      }
    }

    testConnection();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Work Calendar</h1>
      <p>{message}</p>
    </div>
  );
}
