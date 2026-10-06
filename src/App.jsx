import { useDialog } from "./Dialog";
import { Skeleton } from "./Motion";
import { friendlyError } from "./errors";
import React, { useState, useEffect, lazy, Suspense } from "react";
import { sb, result } from "./client";

import Auth from "./Auth";
const Onboarding = lazy(() => import("./Onboarding"));
const Dashboard = lazy(() => import("./Dashboard"));
export default function App() {
  const ask = useDialog();
  const [reviewingError, setReviewingError] = useState(false);
  const [session, setSession] = useState(undefined),
    [goal, setGoal] = useState(undefined),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    sb.auth.getSession().then(({ data, error }) => {
      if (alive) {
        if (error) setError(friendlyError(error));
        setSession(data.session);
      }
    });
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => {
      if (alive) setSession(s);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let alive = true;
    setGoal(undefined);
    setError("");
    if (session)
      result(
        sb
          .from("nutrition_goals")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      )
        .then((g) => {
          if (alive) setGoal(g);
        })
        .catch((e) => {
          if (alive) setError(friendlyError(e));
        });
    return () => {
      alive = false;
    };
  }, [session?.user.id, retry]);
  return (
    <div className={session && goal ? "app-shell signed-in" : "app-shell"}>
      <header className="app-header">
        <a className="brand" href="/">
          Zol<span>Nutrition</span>
        </a>
        <div>
          {session && goal && <span id="account-settings-action" />}
          {session && (
            <button
              onClick={async () => {
                try {
                  await result(sb.auth.signOut());
                } catch (e) {
                  setError(friendlyError(e));
                }
              }}
            >
              Sign out
            </button>
          )}
          <button
            aria-label="Change color theme"
            onClick={() => {
              const dark = document.documentElement.dataset.theme !== "dark";
              document.documentElement.dataset.theme = dark ? "dark" : "light";
              localStorage.setItem("znTheme", dark ? "dark" : "light");
            }}
          >
            ◐
          </button>
        </div>
      </header>
      {error && !reviewingError && (
        <div className="notice bad" role="alert">
          {error}
          {session && goal === undefined ? (
            <button onClick={async () => {
              setReviewingError(true);
              try {
                if (await ask({ title: "Unable to load your targets", message: error + " Retry loading your saved targets?", icon: "error", action: "Retry", cancel: "Not now" })) setRetry(n => n + 1);
              } finally { setReviewingError(false); }
            }}>Retry</button>
          ) : (
            <button onClick={() => setError("")}>Dismiss</button>
          )}
        </div>
      )}
      <Suspense
        fallback={
          <main className="setup">
            <Skeleton label="Loading screen" />
          </main>
        }
      >
        {session === undefined ? (
          <main className="setup">
            <Skeleton label="Loading your session" />
          </main>
        ) : !session ? (
          <Auth />
        ) : goal === undefined ? (
          <main className="setup">
            <Skeleton label="Loading your targets" />
          </main>
        ) : !goal ? (
          <Onboarding uid={session.user.id} onDone={setGoal} />
        ) : (
          <Dashboard
            key={session.user.id}
            uid={session.user.id}
            user={session.user}
            goal={goal}
            setGoal={setGoal}
          />
        )}
      </Suspense>
      <footer>Track smarter. Progress better.</footer>
    </div>
  );
}
