import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import Head from "next/head";

export default function Home() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState("write");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [recallQuery, setRecallQuery] = useState("");
  const [recallResult, setRecallResult] = useState("");
  const [recalling, setRecalling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const textareaRef = useRef(null);
  const recallRef = useRef(null);

  useEffect(() => {
    if (mode === "write" && textareaRef.current) textareaRef.current.focus();
    if (mode === "recall" && recallRef.current) recallRef.current.focus();
  }, [mode]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    setFadeOut(true);
    try {
      await fetch("/api/entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      setText("");
      setFadeOut(false);
      setSaving(false);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }, 400);
  }, [text, saving]);

  const handleKeyDown = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleRecall = useCallback(async () => {
    if (!recallQuery.trim() || recalling) return;
    setRecalling(true);
    setRecallResult("");
    try {
      const res = await fetch("/api/recall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: recallQuery }),
      });
      const data = await res.json();
      setRecallResult(data.result || "Nothing surfaced.");
    } catch {
      setRecallResult("Something went wrong.");
    }
    setRecalling(false);
  }, [recallQuery, recalling]);

  const handleRecallKey = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleRecall();
    }
  }, [handleRecall]);

  if (status === "loading") return <div style={s.page}><Head><title>Void</title></Head></div>;

  if (!session) {
    return (
      <div style={s.page}>
        <Head><title>Void</title></Head>
        <div style={{ textAlign: "center" }}>
          <h1 style={s.h1}>void</h1>
          <button onClick={() => signIn("google")} style={s.btn(true)}>
            sign in with google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <Head><title>Void</title></Head>
      <style>{`
        textarea::placeholder, input::placeholder { color: #2a2a2a; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pulse { 0%,100%{opacity:.15} 50%{opacity:.4} }
      `}</style>

      <div style={{ width: "100%", maxWidth: "540px" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #1c1c1c", marginBottom: "32px" }}>
          {["write", "recall"].map((m) => (
            <button key={m} onClick={() => { setMode(m); setRecallResult(""); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 20px 10px",
                fontSize: "12px", letterSpacing: "0.15em", textTransform: "lowercase",
                color: mode === m ? "#c8c8be" : "#333",
                borderBottom: mode === m ? "1px solid #c8c8be" : "1px solid transparent",
                marginBottom: "-1px", transition: "color 0.2s", fontFamily: "inherit",
              }}>{m}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => signOut()} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "11px", color: "#252525", letterSpacing: "0.1em",
            fontFamily: "inherit", padding: "8px 0 10px",
          }}>out</button>
        </div>

        {mode === "write" && (
          sent ? (
            <div style={{ textAlign: "center", padding: "80px 0", animation: "fadeIn 0.3s ease" }}>
              <div style={{ fontSize: "13px", color: "#444", letterSpacing: "0.1em" }}>gone</div>
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="..."
                style={{
                  width: "100%", minHeight: "260px", background: "transparent",
                  border: "none", color: fadeOut ? "transparent" : "#d0d0c8",
                  fontSize: "17px", lineHeight: "1.75",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  resize: "none", outline: "none", padding: "0",
                  caretColor: "#888", transition: "color 0.35s ease", boxSizing: "border-box",
                }}
                spellCheck={false}
              />
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSend} disabled={!text.trim() || saving} style={s.btn(!!text.trim() && !saving)}>
                  {saving ? "..." : "release"}
                </button>
              </div>
            </>
          )
        )}

        {mode === "recall" && (
          <div>
            <input
              ref={recallRef}
              value={recallQuery}
              onChange={(e) => { setRecallQuery(e.target.value); setRecallResult(""); }}
              onKeyDown={handleRecallKey}
              placeholder="ask anything"
              style={{
                width: "100%", background: "transparent", border: "none",
                borderBottom: "1px solid #1c1c1c", color: "#d0d0c8",
                fontSize: "17px", padding: "0 0 12px", outline: "none",
                fontFamily: "Georgia, 'Times New Roman', serif",
                caretColor: "#888", boxSizing: "border-box",
              }}
            />
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleRecall} disabled={!recallQuery.trim() || recalling} style={s.btn(!!recallQuery.trim() && !recalling)}>
                {recalling ? "..." : "recall"}
              </button>
            </div>

            {recalling && (
              <div style={{ marginTop: "48px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", opacity: 0.2, animation: "pulse 2s ease-in-out infinite" }}>◌</div>
              </div>
            )}

            {recallResult && !recalling && (
              <div style={{ marginTop: "40px", animation: "fadeIn 0.5s ease" }}>
                <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.85", color: "#7a7a72", fontStyle: "italic" }}>
                  {recallResult}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#0a0a0a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Georgia, 'Times New Roman', serif",
    padding: "24px",
  },
  h1: {
    margin: "0 0 32px", fontSize: "18px", fontWeight: "400",
    color: "#444", letterSpacing: "0.3em",
  },
  btn: (active) => ({
    background: "none", border: "none",
    color: active ? "#666" : "#252525",
    padding: "4px 0",
    fontSize: "12px", letterSpacing: "0.2em", textTransform: "lowercase",
    cursor: active ? "pointer" : "default",
    transition: "color 0.2s", fontFamily: "Georgia, 'Times New Roman', serif",
  }),
};
