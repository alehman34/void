import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import Head from "next/head";

export default function Home() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState("write");
  const [contentVisible, setContentVisible] = useState(true);
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

  const switchMode = useCallback((m) => {
    if (m === mode) return;
    setContentVisible(false);
    setTimeout(() => {
      setMode(m);
      setRecallResult("");
      setContentVisible(true);
    }, 150);
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

  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && status === "loading") return <div style={s.page}><Head><title>Void</title></Head></div>;

  if (!isDev && !session) {
    return (
      <div style={s.page}>
        <Head><title>Void</title></Head>
        <div style={{ textAlign: "center" }}>
          <p style={s.wordmark}>void</p>
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
<div style={{ width: "100%", maxWidth: "520px" }}>
        {/* mode tabs */}
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: "40px" }}>
          {["write", "recall"].map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "0", marginRight: "24px",
                fontSize: "13px", letterSpacing: "0.12em",
                color: mode === m ? "#111" : "#bbb",
                fontFamily: "inherit", transition: "color 0.15s",
              }}
            >{m}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => signOut()} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "12px", color: "#ccc", letterSpacing: "0.1em",
            fontFamily: "inherit", padding: "0",
          }}>log out</button>
        </div>

        <div style={{ opacity: contentVisible ? 1 : 0, transition: "opacity 0.15s ease" }}>
        {/* write mode */}
        {mode === "write" && (
          sent ? (
            <div style={{ padding: "60px 0", animation: "fadeIn 0.3s ease" }}>
              <span style={{ fontSize: "13px", color: "#bbb", letterSpacing: "0.08em" }}>gone</span>
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
                  border: "none", color: fadeOut ? "transparent" : "#1a1a1a",
                  fontSize: "17px", lineHeight: "1.8",
                  fontFamily: "'Untitled Sans', sans-serif",
                  resize: "none", outline: "none", padding: "0",
                  caretColor: "#999", transition: "color 0.35s ease",
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

        {/* recall mode */}
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
                borderBottom: "1px solid #e8e8e4", color: "#1a1a1a",
                fontSize: "17px", padding: "0 0 12px", outline: "none",
                fontFamily: "'Untitled Sans', sans-serif",
                caretColor: "#999",
              }}
            />
            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={handleRecall} disabled={!recallQuery.trim() || recalling} style={s.btn(!!recallQuery.trim() && !recalling)}>
                {recalling ? "..." : "recall"}
              </button>
            </div>

            {recalling && (
              <div style={{ marginTop: "48px" }}>
                <div style={{ fontSize: "18px", color: "#aaa", animation: "pulse 2s ease-in-out infinite" }}>◌</div>
              </div>
            )}

            {recallResult && !recalling && (
              <div style={{ marginTop: "40px", animation: "fadeIn 0.5s ease" }}>
                <p style={{ margin: 0, fontSize: "15px", lineHeight: "1.9", color: "#555", fontStyle: "italic",
                  fontFamily: "'Untitled Sans', sans-serif" }}>
                  {recallResult}
                </p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#fafaf8",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Untitled Sans', sans-serif",
    padding: "24px",
  },
  wordmark: {
    margin: "0 0 32px", fontSize: "16px", fontWeight: "400",
    color: "#bbb", letterSpacing: "0.3em",
  },
  btn: (active) => ({
    background: "none", border: "none",
    color: active ? "#555" : "#ccc",
    padding: "0",
    fontSize: "12px", letterSpacing: "0.18em",
    cursor: active ? "pointer" : "default",
    transition: "color 0.15s", fontFamily: "'Untitled Sans', sans-serif",
  }),
};
