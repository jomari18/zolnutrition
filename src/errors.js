export function friendlyError(error) {
  const code = error?.code,
    message = error?.message || "";
  if (error?.friendly) return message;
  if (code === "invalid_credentials")
    return "Email or password is incorrect. Please try again.";
  if (code === "otp_expired")
    return "That code has expired or is invalid. Request a new code and try again.";
  if (code === "23505")
    return "That entry already exists. Refresh to see the latest saved data.";
  if (code === "42501" || /row.level security|permission denied/i.test(message))
    return "We couldn't access that data with this account. Try signing in again.";
  if (/fetch|network|timeout|load failed/i.test(message))
    return "Connection interrupted. Check your internet, then retry. If you were saving, check your entries before submitting again.";
  if (error?.status === 429 || /rate.limit/i.test(message))
    return "Too many attempts. Please wait a moment and try again.";
  if (code === "23503")
    return "This food or meal is no longer available. Refresh and choose another.";
  if (code === "23514")
    return "Please check the amounts and try again. Values must be within the allowed range.";
  if (!code && error instanceof Error)
    return message || "Something went wrong. Please try again.";
  return "We couldn't complete that request. Please try again. If it continues, sign in again.";
}
export function userError(message) {
  return Object.assign(new Error(message), { friendly: true });
}
