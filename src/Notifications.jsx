import React, { useEffect, useRef } from "react";
export default function Notifications({ notices = [], dismiss, reload, pending, undo, inline = false }) {
  const undoButton = useRef(null);
  useEffect(() => {
    if (pending && !pending.committing) undoButton.current?.focus();
  }, [pending?.id]);
  return <div className={inline ? "notifications notifications-inline" : "notifications"}>
    {notices.map(notice => <div key={notice.id} className={`notice toast feedback-toast ${notice.error ? "bad" : "success"}`} role={notice.error ? "alert" : "status"} aria-atomic="true">
      <span className="feedback-symbol" aria-hidden="true">{notice.error ? "!" : "✓"}</span>
      <span className="feedback-message">{notice.message}</span>
      <div className="actions">
        {notice.error && reload && <button onClick={reload}>Reload data</button>}
        <button onClick={() => dismiss(notice.id)} aria-label={notice.error ? "Dismiss error" : "Dismiss notification"}>Dismiss</button>
      </div>
    </div>)}
    {pending && <div className="notice undo feedback-toast" role="status" aria-atomic="true">
      <span className="feedback-message">{pending.committing ? "Deleting…" : `${pending.label} removed. Undo within 5 seconds. Leaving now cancels deletion.`}</span>
      <button ref={undoButton} disabled={pending.committing} onClick={undo}>Undo</button>
    </div>}
  </div>;
}
