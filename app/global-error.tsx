"use client";
import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [details, setDetails] = useState("");

  useEffect(() => {
    setDetails(error?.stack || error?.message || "Erreur inconnue");
    console.error("GlobalError:", error);
  }, [error]);

  return (
    <html>
      <body style={{ background: "#0c0a09", color: "#f5f5f4", fontFamily: "monospace", padding: "2rem" }}>
        <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Erreur application</h2>
        <pre style={{
          background: "#1c1917",
          padding: "1rem",
          overflowX: "auto",
          fontSize: "0.75rem",
          lineHeight: "1.6",
          border: "1px solid #44403c",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}>
          {details}
        </pre>
        <button
          onClick={reset}
          style={{ marginTop: "1rem", padding: "0.5rem 1rem", background: "#7f1d1d", color: "white", border: "none", cursor: "pointer" }}
        >
          Réessayer
        </button>
      </body>
    </html>
  );
}