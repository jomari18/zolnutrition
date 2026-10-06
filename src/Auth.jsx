import { checkRegistrationUsername, registrationError } from "./registration.js";
import { validateDisplayName } from "./displayName.js";
import useAndroidBack from "./useAndroidBack";
import { friendlyError } from "./errors";
import React, { useState, useEffect, useRef, useId } from "react";
import { sb, result } from "./client";
import { number } from "./lib";
import { Field } from "./ui";
import Icon from "./Icon";

function PasswordField({ label, ...props }) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <div className="password-control">
        <input {...props} id={id} type={visible ? "text" : "password"} />
        <button type="button" aria-controls={id}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          aria-pressed={visible} onClick={() => setVisible(v => !v)}>
          <Icon name={visible ? "eyeOff" : "eye"} /><span>{visible ? "Hide" : "Show"}</span>
        </button>
      </div>
    </div>
  );
}

export default function Auth() {
  const [mode, setMode] = useState(
      location.pathname.includes("register")
        ? "register"
        : location.pathname.includes("verify-email")
          ? "verify"
          : "login",
    ),
    [email, setEmail] = useState(
      sessionStorage.getItem("zolnutrition_verification_email") || "",
    ),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(""),
    [deadline, setDeadline] = useState(
      number(localStorage.getItem("zolnutrition_resend_deadline")),
    ),
    [clock, setClock] = useState(Date.now());
  useAndroidBack(() => {
    if (busy) return true;
    if (mode === "login") return false;
    setMode("login"); setMsg(""); return true;
  });
  const lock = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 1000);
    const sync = () =>
      setDeadline(number(localStorage.getItem("zolnutrition_resend_deadline")));
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const wait = Math.max(0, Math.ceil((deadline - clock) / 1000));
  const cooldown = (seconds = 60) => {
    const d = Date.now() + seconds * 1000;
    localStorage.setItem("zolnutrition_resend_deadline", d);
    setDeadline(d);
    setClock(Date.now());
  };
  const run = async (fn) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMsg("");
    try {
      await fn();
    } catch (e) {
      const m = e.message || "Something went wrong.";
      const w = m.match(/after\s+(\d+)\s+seconds?/i);
      if (w || e.status === 429) {
        cooldown(w ? Number(w[1]) : 60);
        setMsg("Please wait for the countdown before requesting another code.");
      } else setMsg(friendlyError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(async () => {
      if (mode === "register") {
        if (f.get("password") !== f.get("confirm"))
          throw Error("Passwords do not match.");
        const username = await checkRegistrationUsername(sb, f.get("username"));
        let d;
        try {
          d = await result(
            sb.auth.signUp({
              email: email.trim(),
              password: f.get("password"),
              options: {
                data: {
                  full_name: f.get("full").trim(),
                  display_name: validateDisplayName(f.get("displayName")),
                  username,
                },
              },
            }),
          );
        } catch (error) { throw registrationError(error); }
        if (d.user?.identities?.length === 0)
          throw Error("Email already registered. Please sign in.");
        if (!d.session) {
          sessionStorage.setItem(
            "zolnutrition_verification_email",
            email.trim(),
          );
          cooldown();
          setMode("verify");
        }
      } else if (mode === "verify") {
        const token = f.get("code").trim();
        if (!/^\d{6,10}$/.test(token))
          throw Error("Enter the complete code from your email.");
        await result(
          sb.auth.verifyOtp({ email: email.trim(), token, type: "email" }),
        );
        sessionStorage.removeItem("zolnutrition_verification_email");
      } else {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password: f.get("password"),
        });
        if (error) {
          if (error.code === "email_not_confirmed") {
            sessionStorage.setItem(
              "zolnutrition_verification_email",
              email.trim(),
            );
            setMode("verify");
            setMsg("Verify your email to continue.");
            return;
          }
          throw error;
        }
      }
    });
  };
  return (
    <main className="auth-layout">
      <aside className="auth-hero">
        <div className="eyebrow">FUEL YOUR NEXT REP</div>
        <h2>Track smarter.<br /><span>Progress better.</span></h2>
        <p>Your targets. Your meals. Your progress.<br />A clearer picture, one day at a time.</p>
        <div className="auth-benefits"><span><Icon name="target" /> Daily targets</span><span><Icon name="meal" /> Simple logging</span><span><Icon name="progress" /> Real progress</span></div>
      </aside>
      <section className={`auth panel auth-card auth-${mode}`}>
      <div className="eyebrow">MEAL & NUTRITION TRACKING</div>
      <h1>
        {mode === "register"
          ? "Create account"
          : mode === "verify"
            ? "Verify your email"
            : "Welcome back"}
      </h1>
      <p className="auth-description">{mode === "verify" ? "Enter the code from your newest signup email. Keep this page open while you check your inbox." : mode === "register" ? "Build a routine around your goals. Start with an account, then set your daily targets." : "Sign in to pick up where you left off."}</p>
      {mode === "verify" && <div className="verification-badge"><Icon name="saved" /><span>Check your inbox<br /><small>Use the complete code from your latest email.</small></span></div>}
      <form key={mode} onSubmit={submit}>
        {mode === "register" && (
          <>
            <Field label="Full name" name="full" required maxLength="100" />
            <Field label="Display name" name="displayName" autoComplete="nickname" required maxLength="50" />
            <Field
              label="Username"
              name="username"
              required
              minLength="3"
              maxLength="30"
            />
          </>
        )}
        <Field
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {mode === "verify" ? (
          <Field
            label="Verification code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            minLength="6"
            maxLength="10"
            required
          />
        ) : (
          <PasswordField
            label="Password"
            name="password"
            type="password"
            minLength="6"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            required
          />
        )}
        {mode === "register" && (
          <PasswordField
            label="Confirm password"
            name="confirm"
            autoComplete="new-password"
            minLength="6"
            required
          />
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "register"
              ? "Create Account"
              : mode === "verify"
                ? "Verify Email"
                : "Sign In"}
        </button>
      </form>
      {mode === "verify" && (
        <button
          disabled={busy || wait > 0}
          onClick={() =>
            run(async () => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                throw Error("Enter a valid email.");
              await result(
                sb.auth.resend({ type: "signup", email: email.trim() }),
              );
              cooldown();
              setMsg("Code requested. Check your inbox and spam folder.");
            })
          }
        >
          {wait ? `Resend Code (${wait}s)` : "Resend Code"}
        </button>
      )}
      {msg && (
        <p className="notice" role="alert">
          {msg}
        </p>
      )}
      <div className="actions">
        <button
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setMsg("");
          }}
        >
          {mode === "login" ? "Create an account" : "Back to sign in"}
        </button>
      </div>
      <p className="auth-footnote">Your next meal is a fresh start.</p>
      </section>
    </main>
  );
}
