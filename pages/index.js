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
  const [writeFocused, setWriteFocused] = useState(false);
  const [recallFocused, setRecallFocused] = useState(false);
  const [arrowHovered, setArrowHovered] = useState(false);
  const textareaRef = useRef(null);
  const recallRef = useRef(null);

  useEffect(() => {
    if (mode === "write" && textareaRef.current) textareaRef.current.focus();
    if (mode === "recall" && recallRef.current) recallRef.current.focus();
  }, [mode]);

  const resize = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => {
    if (!text) resize(textareaRef.current);
  }, [text]);

  const switchMode = useCallback((m) => {
    if (m === mode) return;
    setContentVisible(false);
    setArrowHovered(false);
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

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let first = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.text) {
              if (first) { setRecalling(false); first = false; }
              setRecallResult(prev => prev + parsed.text);
            }
          } catch {}
        }
      }
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
          <button onClick={() => signIn("google")} style={s.btn(true)}>sign in with google</button>
        </div>
      </div>
    );
  }

  const writeActive = !!text.trim() && !saving;
  const recallActive = !!recallQuery.trim() && !recalling;

  return (
    <div style={s.page}>
      <Head><title>Void</title></Head>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        <div style={{ display: "flex", alignItems: "baseline", marginBottom: "20px" }}>
          {["write", "recall"].map((m) => (
            <button key={m} onClick={() => switchMode(m)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0", marginRight: "24px", fontSize: "13px",
              color: mode === m ? "#111" : "#bbb",
              fontFamily: "inherit", transition: "color 0.15s",
            }}>{m}</button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => signOut()} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: "12px", color: "#ccc", fontFamily: "inherit", padding: "0",
          }}>log out</button>
        </div>

        <div style={{ opacity: contentVisible ? 1 : 0, transition: "opacity 0.15s ease" }}>

          {mode === "write" && (
            sent ? (
              <div style={{ padding: "48px 0" }}>
                <span style={{ fontSize: "13px", color: "#bbb", animation: "goneFade 2s ease forwards" }}>gone</span>
              </div>
            ) : (
              <div style={s.inputContainer(writeFocused)}>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => { setText(e.target.value); resize(e.target); }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setWriteFocused(true)}
                  onBlur={() => setWriteFocused(false)}
                  placeholder="write anything"
                  style={{ ...s.textarea, color: fadeOut ? "transparent" : "#1a1a1a", transition: "color 0.35s ease" }}
                  spellCheck={false}
                />
                <button
                  onClick={handleSend}
                  disabled={!writeActive}
                  onMouseEnter={() => setArrowHovered(true)}
                  onMouseLeave={() => setArrowHovered(false)}
                  style={s.arrowBtn(writeActive, arrowHovered)}
                >
                  <ArrowUp active={writeActive} />
                </button>
              </div>
            )
          )}

          {mode === "recall" && (
            <div>
              <div style={s.inputContainer(recallFocused)}>
                <textarea
                  ref={recallRef}
                  value={recallQuery}
                  onChange={(e) => { setRecallQuery(e.target.value); setRecallResult(""); resize(e.target); }}
                  onKeyDown={handleRecallKey}
                  onFocus={() => setRecallFocused(true)}
                  onBlur={() => setRecallFocused(false)}
                  placeholder="recall anything"
                  style={s.textarea}
                  spellCheck={false}
                />
                <button
                  onClick={handleRecall}
                  disabled={!recallActive}
                  onMouseEnter={() => setArrowHovered(true)}
                  onMouseLeave={() => setArrowHovered(false)}
                  style={s.arrowBtn(recallActive, arrowHovered)}
                >
                  <ArrowUp active={recallActive} />
                </button>
              </div>

              {recalling && (
                <div style={{ marginTop: "20px" }}>
                  <span style={{ fontSize: "13px", color: "#ccc", animation: "pulse 1.5s ease-in-out infinite" }}>...</span>
                </div>
              )}

              {recallResult && (
                <div style={{ marginTop: "20px", animation: "fadeIn 0.3s ease" }}>
                  <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.7", color: "#555", fontFamily: "'Untitled Sans', sans-serif" }}>
                    {recallResult}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      <PlayerWidget />
    </div>
  );
}

function PlayerWidget() {
  return (
    <div style={{
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      borderRadius: "16px",
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    }}>
      <iframe
        src="https://open.spotify.com/embed/playlist/37i9dQZF1E8M765XEbcg6i?utm_source=generator"
        width="520"
        height="80"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ display: "block" }}
      />
    </div>
  );
}

function ArrowUp({ active }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M3 7l4-4 4 4" stroke={active ? "#fff" : "#d0d0d0"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Untitled Sans', sans-serif",
    padding: "24px",
  },
  wordmark: {
    margin: "0 0 32px", fontSize: "16px", fontWeight: "400", color: "#bbb",
  },
  btn: (active) => ({
    background: "none", border: "none",
    color: active ? "#555" : "#ccc", padding: "0", fontSize: "12px",
    cursor: active ? "pointer" : "default",
    transition: "color 0.15s", fontFamily: "'Untitled Sans', sans-serif",
  }),
  inputContainer: (focused) => ({
    position: "relative",
    border: `1px solid ${focused ? "#d0d0d0" : "#e8e8e8"}`,
    borderRadius: "10px",
    padding: "14px 14px 48px",
    transition: "border-color 0.15s ease",
  }),
  textarea: {
    width: "100%",
    minHeight: "140px",
    background: "transparent",
    border: "none",
    outline: "none",
    resize: "none",
    overflow: "hidden",
    fontFamily: "'Untitled Sans', sans-serif",
    fontSize: "13px",
    lineHeight: "1.7",
    color: "#1a1a1a",
    caretColor: "#999",
    padding: "0",
  },
  arrowBtn: (active, hovered) => ({
    position: "absolute",
    bottom: "10px",
    right: "10px",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    background: active ? (hovered ? "#333" : "#111") : "#f4f4f4",
    border: "none",
    cursor: active ? "pointer" : "default",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s",
    transform: active && hovered ? "scale(1.06)" : "scale(1)",
  }),
};

