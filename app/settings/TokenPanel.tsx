"use client";

import { useState, useTransition } from "react";
import { createApiToken, revokeApiTokens } from "../actions";

export default function TokenPanel({ hasTokens }: { hasTokens: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="card section">
      {token ? (
        <>
          <p className="muted">Copy this now. It won&apos;t be shown again. Paste it into your Shortcuts as the Authorization header: <code>Bearer</code>, a space, then the token.</p>
          <div className="token">{token}</div>
          <button
            className="btn"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(token);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy token"}
          </button>
        </>
      ) : (
        <p className="muted">
          {hasTokens
            ? "A token is active. Make a new one if you lost it; old ones keep working until you revoke them."
            : "Shortcuts need a token to log habits for you."}
        </p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="button" disabled={pending} onClick={() => start(async () => setToken(await createApiToken()))}>
          New token
        </button>
        {hasTokens && (
          <button
            className="btn secondary"
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await revokeApiTokens();
                setToken(null);
              })
            }
          >
            Revoke all
          </button>
        )}
      </div>
    </div>
  );
}
