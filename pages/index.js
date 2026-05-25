import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import Head from "next/head";

export default function Home() {
  const { data: session, status } = useSession();

  const [mode, setMode] = useState("write");
  const [text, setText] = useState("");
  const [recallQuery, setRecallQuery] = useState("");

  const [saving, setSaving] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [sent, setSent] = useState(false);

  const [recalling, setRecalling] = useState(false);
  const [recallResult, setRecallResult] = useState("");

  const [focused, setFocused] = useState(false);
  const [arrowHovered, setArrowHovered] = useState(false);

  const writeRef = useRef(null);
  const recallRef = useRef(null);

  const isWrite = mode === "write";
  const activeRef = isWrite ? writeRef : recallRef;

  useEffect(() => {
    if (activeRef.current) activeRef.current.focus();
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
      setTimeout(() => setSent(false), 2200);
    }, 420);
  }, [text, saving]);

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
      if (!res.ok) {
        setRecallResult("something went wrong.");
        setRecalling(false);
        return;
      }
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
              setRecallResult((prev) => prev + parsed.text);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error("Recall error:", e);
      setRecallResult("something went wrong.");
    }
    setRecalling(false);
  }, [recallQuery, recalling]);

  const handleKey = useCallback(
    (e) => {
      if (isWrite) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          handleSend();
        }
      } else {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleRecall();
        }
      }
    },
    [isWrite, handleSend, handleRecall]
  );

  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && status === "loading") {
    return <div style={s.page}><Head><title>void</title></Head></div>;
  }

  if (!isDev && !session) {
    return (
      <div style={s.page}>
        <Head><title>void</title></Head>
        <div style={s.signin}>
          <p style={s.wordmark}>void</p>
          <button onClick={() => signIn("google")} style={s.signinBtn}>
            <span style={s.gDot} />
            <span>continue with google</span>
          </button>
        </div>
      </div>
    );
  }

  const writeActive = !!text.trim() && !saving;
  const recallActive = !!recallQuery.trim() && !recalling;
  const active = isWrite ? writeActive : recallActive;
  const placeholder = isWrite ? "write anything" : "recall anything";
  const onSubmit = isWrite ? handleSend : handleRecall;
  const showingGone = isWrite && sent;

  return (
    <div style={s.page}>
      <Head><title>void</title></Head>

      <div style={s.col}>
        <div style={s.modes}>
          {["write", "recall"].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={s.mode(mode === m)} className="void-mode">
              <span>{m}</span>
              <span
                className="void-mode-underline"
                style={{ ...s.modeUnderline, transform: mode === m ? "scaleX(1)" : "scaleX(0)" }}
              />
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => signOut()} style={s.logout}>log out</button>
        </div>

        {showingGone ? (
          <div style={s.gone}>gone</div>
        ) : (
          <>
            <div style={{ ...s.input, borderColor: focused ? "#d0d0d0" : "#e8e8e8" }}>
              {isWrite ? (
                <textarea
                  ref={writeRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKey}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={placeholder}
                  spellCheck={false}
                  className="void-textarea void-textarea--write"
                  style={{ ...s.textarea, color: fadeOut ? "transparent" : "#1a1a1a" }}
                />
              ) : (
                <textarea
                  ref={recallRef}
                  value={recallQuery}
                  onChange={(e) => { setRecallQuery(e.target.value); setRecallResult(""); }}
                  onKeyDown={handleKey}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder={placeholder}
                  spellCheck={false}
                  className="void-textarea void-textarea--recall"
                  style={s.textarea}
                />
              )}
              <button
                onClick={onSubmit}
                disabled={!active}
                onMouseEnter={() => setArrowHovered(true)}
                onMouseLeave={() => setArrowHovered(false)}
                style={s.send(active, arrowHovered)}
                aria-label={isWrite ? "save" : "recall"}
              >
                <ArrowUp active={active} />
              </button>
            </div>

            <div className="void-below" key={mode}>
              {isWrite ? (
                <div style={s.meta}>
                  <span>{text.length > 0 ? `${text.length} char${text.length === 1 ? "" : "s"}` : " "}</span>
                  <span style={{ flex: 1 }} />
                  <span style={s.kbd}>⌘ ↵</span>
                </div>
              ) : (
                <>
                  {recalling && (
                    <div className="void-pulse" aria-label="thinking">
                      <span /><span /><span /><span />
                    </div>
                  )}
                  {recallResult && !recalling && (
                    <p style={s.result}>{recallResult}</p>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <NativePlayer />
    </div>
  );
}

function NativePlayer() {
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const tracks = [
    { title: "lieu commun", artist: "Sébastien Tellier" },
    { title: "Avril 14th", artist: "Aphex Twin" },
    { title: "Saudade Vem Correndo", artist: "Stan Getz" },
    { title: "Music for Airports 1/1", artist: "Brian Eno" },
  ];
  const t = tracks[idx];
  return (
    <div style={p.player}>
      <button onClick={() => setPlaying((v) => !v)} style={p.playBtn} aria-label={playing ? "pause" : "play"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className={"void-bars" + (playing ? " playing" : "")} aria-hidden="true" style={p.bars}>
        <span /><span /><span />
      </div>
      <div style={p.meta}>
        <div style={p.title}>{t.title}</div>
        <div style={p.artist}>{t.artist}</div>
      </div>
      <button onClick={() => setIdx((i) => (i - 1 + tracks.length) % tracks.length)} style={p.skip} aria-label="previous">
        <SkipIcon dir="back" />
      </button>
      <button onClick={() => setIdx((i) => (i + 1) % tracks.length)} style={p.skip} aria-label="next">
        <SkipIcon dir="fwd" />
      </button>
    </div>
  );
}

function PlayIcon() {
  return <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M1.5 1L6.5 4 1.5 7Z" /></svg>;
}
function PauseIcon() {
  return <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><rect x="1.5" y="1" width="1.6" height="6" /><rect x="4.9" y="1" width="1.6" height="6" /></svg>;
}
function SkipIcon({ dir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <g transform={dir === "back" ? "scale(-1,1) translate(-10,0)" : ""}>
        <path d="M1 1L6 5 1 9Z" /><rect x="6.5" y="1" width="1.2" height="8" />
      </g>
    </svg>
  );
}

function ArrowUp({ active }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M3 7l4-4 4 4" stroke={active ? "#fff" : "#d0d0d0"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FONT = "'Untitled Sans', -apple-system, BlinkMacSystemFont, sans-serif";

const s = {
  page: {
    minHeight: "100vh",
    background: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONT,
    padding: "24px",
    paddingBottom: "128px",
  },
  col: { width: "100%", maxWidth: "520px", display: "flex", flexDirection: "column", gap: "18px" },

  signin: { display: "flex", flexDirection: "column", alignItems: "center", gap: "28px" },
  wordmark: { margin: 0, fontSize: "16px", color: "#bbb", letterSpacing: "0.04em" },
  signinBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "12px", color: "#888", padding: 0, fontFamily: FONT,
    display: "inline-flex", alignItems: "center", gap: "8px",
    letterSpacing: "0.02em",
  },
  gDot: {
    width: 12, height: 12, borderRadius: "50%",
    background: "conic-gradient(from 90deg, #ea4335, #fbbc04, #34a853, #4285f4, #ea4335)",
    opacity: 0.85,
  },

  modes: { display: "flex", alignItems: "baseline", gap: "22px", fontSize: "13px" },
  mode: (on) => ({
    background: "none", border: "none", padding: 0, cursor: "pointer",
    position: "relative", fontSize: "13px", fontFamily: FONT,
    color: on ? "#111" : "#bbb", transition: "color 0.2s ease",
  }),
  modeUnderline: {
    position: "absolute", left: 0, right: 0, bottom: "-6px",
    height: "1px", background: "#111", transformOrigin: "left",
    transition: "transform 0.28s cubic-bezier(0.4, 0.2, 0.2, 1)",
  },
  logout: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "12px", color: "#ccc", fontFamily: FONT, padding: 0,
  },

  input: {
    position: "relative", border: "1px solid #e8e8e8",
    borderRadius: "10px", padding: "14px 14px 44px",
    transition: "border-color 0.2s ease",
  },
  textarea: {
    width: "100%", background: "transparent", border: "none",
    outline: "none", resize: "none", overflow: "hidden",
    fontFamily: FONT, fontSize: "13px", lineHeight: 1.75,
    color: "#1a1a1a", caretColor: "#999", padding: 0,
    letterSpacing: "0.005em",
    transition: "color 0.35s ease, min-height 0.42s cubic-bezier(0.4,0.1,0.2,1)",
  },
  send: (active, hovered) => ({
    position: "absolute", bottom: "10px", right: "10px",
    width: "28px", height: "28px", borderRadius: "6px",
    background: active ? (hovered ? "#333" : "#111") : "#f4f4f4",
    border: "none", padding: 0,
    cursor: active ? "pointer" : "default",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.2s ease, transform 0.15s ease",
    transform: active && hovered ? "scale(1.06)" : "scale(1)",
  }),

  meta: {
    display: "flex", alignItems: "center",
    fontSize: "11px", color: "#cccccc", fontFamily: FONT,
    letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums",
  },
  kbd: { fontSize: "10.5px", color: "#bbb", letterSpacing: "0.05em" },
  result: {
    margin: 0, fontSize: "13.5px", lineHeight: 1.75,
    color: "#444", fontFamily: FONT, letterSpacing: "0.005em",
  },
  gone: {
    fontSize: "13px", color: "#bbb", padding: "48px 0",
    letterSpacing: "0.04em", animation: "voidGone 2s ease forwards",
  },
};

const p = {
  player: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    display: "flex", alignItems: "center", gap: "12px",
    padding: "14px 24px",
    borderTop: "1px solid #ececec",
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    fontFamily: FONT,
  },
  playBtn: {
    width: 22, height: 22, borderRadius: "50%",
    background: "transparent", color: "#1a1a1a",
    border: "none", padding: 0, cursor: "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
  bars: {
    display: "inline-flex", alignItems: "flex-end", gap: 2,
    height: 12, flexShrink: 0,
  },
  meta: { display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 },
  title: {
    fontSize: "12px", color: "#1a1a1a",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  artist: {
    fontSize: "10.5px", color: "#888", letterSpacing: "0.02em",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  skip: {
    background: "none", border: "none", padding: 4,
    cursor: "pointer", color: "#bbb", display: "inline-flex",
  },
};
