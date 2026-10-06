import React, { useState } from "react";
import { Dialog, useDialog } from "./Dialog";
import { Field } from "./ui";
import { cleanDisplayName, DISPLAY_NAME_LIMIT } from "./displayName.js";
export default function DisplayNameEditor({ name, busy, save, onClose, feedback }) {
  const [draft, setDraft] = useState(name);
  const ask = useDialog();
  const close = async () => {
    if (busy) return;
    if (cleanDisplayName(draft) !== name && !(await ask({ title: "Discard your unsaved name?", message: "Your saved display name will stay the same.", action: "Discard changes", cancel: "Keep editing" }))) return;
    onClose();
  };
  return <Dialog title="Account settings" onClose={close} closeDisabled={busy}>
    <p className="muted">What would you like us to call you?</p>
    <form onSubmit={async e => { e.preventDefault(); if (await save(draft)) onClose(); }}>
      <Field label="Display name" name="displayName" autoComplete="nickname" maxLength={DISPLAY_NAME_LIMIT} required value={draft} disabled={busy} onChange={e => { setDraft(e.target.value); }} />
      <div className="actions"><button className="primary" disabled={busy}>{busy ? "Saving…" : "Save name"}</button><button type="button" disabled={busy} onClick={close}>Cancel</button></div>
    </form>
    {feedback}
  </Dialog>;
}
