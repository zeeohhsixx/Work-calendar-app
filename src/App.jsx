import React from "react";

export default function App() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hasKey = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Debug Check</h1>
      <p>React is working.</p>
      <p>Supabase URL exists: {supabaseUrl ? "YES" : "NO"}</p>
      <p>Supabase Key exists: {hasKey ? "YES" : "NO"}</p>
    </div>
  );
}
