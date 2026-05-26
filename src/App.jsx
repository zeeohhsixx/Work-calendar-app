import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Shared Work Calendar</h1>

      {session ? (
        <p>You are logged in.</p>
      ) : (
        <p>Supabase connected. Login screen coming next.</p>
      )}
    </div>
  );
}
