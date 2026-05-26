import React from "react";
import { createClient } from "@supabase/supabase-js";

export default function App() {
  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Supabase Package Test</h1>
      <p>If you see this, the Supabase package imports correctly.</p>
    </div>
  );
}
