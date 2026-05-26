import React from "react";
import { createClient } from "@supabase/supabase-js";

export default function App() {
  let message = "Not tested yet.";

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    createClient(supabaseUrl, supabaseKey);

    message = "Supabase client created successfully.";
  } catch (err) {
    message = "Supabase crash: " + err.message;
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Supabase Debug</h1>
      <p>{message}</p>
    </div>
  );
}
