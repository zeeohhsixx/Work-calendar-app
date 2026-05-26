import React from "react";
import { supabase } from "./supabase";

export default function App() {
  console.log(supabase);

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Supabase Connected</h1>
      <p>Your app is now talking to Supabase.</p>
    </div>
  );
}
