// Shared by the native bridge and tests. Never navigates outside the app.
export function dispatchAndroidBack(doc = document, target = window) {
  if (target.dispatchEvent(new Event('zolnutrition:alert-back', { cancelable: true })) === false) return true;
  const dialogs = doc.querySelectorAll('dialog[open]');
  const top = dialogs[dialogs.length - 1];
  if (top) {
    top.dispatchEvent(new Event('cancel', { cancelable: true }));
    return true;
  }
  return !target.dispatchEvent(new Event('zolnutrition:back', { cancelable: true }));
}
