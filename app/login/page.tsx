"use client";

import { useActionState } from "react";
import { sendCode, verifyCode, type LoginState } from "./actions";

const initial: LoginState = { step: "email" };

export default function LoginPage() {
  const [emailState, emailAction, emailPending] = useActionState(sendCode, initial);
  const [codeState, codeAction, codePending] = useActionState(verifyCode, initial);

  const onCodeStep = emailState.step === "code";
  const state = onCodeStep ? { ...emailState, error: codeState.error } : emailState;

  return (
    <>
      <div>
        <div className="eyebrow">Tap as it happens. Sweep at night.</div>
        <h1 className="title">Bothy</h1>
      </div>

      {!onCodeStep ? (
        <form action={emailAction} className="section">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          {state.error && <p className="error">{state.error}</p>}
          <button className="btn" type="submit" disabled={emailPending}>
            {emailPending ? "Sending…" : "Send sign-in code"}
          </button>
        </form>
      ) : (
        <form action={codeAction} className="section">
          <p className="muted">{state.info} Sent to {state.email}.</p>
          <input type="hidden" name="email" value={state.email ?? ""} />
          <div className="field">
            <label htmlFor="code">Code</label>
            <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
          </div>
          {state.error && <p className="error">{state.error}</p>}
          <button className="btn" type="submit" disabled={codePending}>
            {codePending ? "Checking…" : "Sign in"}
          </button>
        </form>
      )}
    </>
  );
}
