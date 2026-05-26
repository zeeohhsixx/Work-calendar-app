import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    async function run() {
      try {
        const response = await supabase.from("jobs").select("*");
        console.log(response);

        if (response.error) {
          setMessage("Supabase Error: " + response.error.message);
        } else {
          setMessage("Supabase connected successfully.");
        }
      } catch (err) {
        setMessage("Crash: " + err.message);
      }
    }

    run();
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Work Calendar</h1>
      <p>{message}</p>
    </div>
  );
}
