export const DISPLAY_NAME_LIMIT = 50;
export function cleanDisplayName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}
export function displayName(user) {
  const metadata = user?.user_metadata || {};
  for (const key of ["display_name", "full_name", "username"]) {
    const name = cleanDisplayName(metadata[key]);
    if (name) return name.slice(0, DISPLAY_NAME_LIMIT);
  }
  return "";
}
export function validateDisplayName(value) {
  const name = cleanDisplayName(value);
  if (!name) throw Error("Enter a display name.");
  if (name.length > DISPLAY_NAME_LIMIT) throw Error("Use 50 characters or fewer for your display name.");
  return name;
}
