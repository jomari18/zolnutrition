import 'sweetalert2/dist/sweetalert2.min.css';
import './alerts.css';

let active = false;
// One decision at a time; never replace an unanswered dialog or replay a write.
export async function askAlert(options) {
  if (active) return null;
  active = true;
  const previous = document.activeElement;
  const native = [...document.querySelectorAll('dialog[open]')];
  native.forEach(el => { el.close(); el.hidden = true; });
  let Swal;
  let cancelled = false;
  const back = event => { event.preventDefault(); cancelled = true; Swal?.clickCancel(); };
  window.addEventListener('zolnutrition:alert-back', back);
  try {
    ({ default: Swal } = await import("sweetalert2/dist/sweetalert2.esm.js"));
    if (cancelled) return null;
    const response = await Swal.fire({
      titleText: options.title,
      text: options.message,
      icon: options.icon || (options.input ? undefined : 'warning'),
      showCancelButton: true,
      confirmButtonText: options.action || 'Continue',
      cancelButtonText: options.cancel || 'Cancel',
      focusCancel: !options.input,
      buttonsStyling: false,
      heightAuto: false,
      returnFocus: false,
      allowOutsideClick: false,
      keydownListenerCapture: true,
      customClass: { popup: 'zn-alert', confirmButton: 'primary', cancelButton: 'zn-alert-cancel' },
      showClass: { popup: 'zn-alert-enter' },
      hideClass: { popup: '' },
      ...(options.input ? {
        input: 'text', inputLabel: options.label || 'Meal name',
        inputValue: options.initial || '',
        inputAttributes: { maxlength: '60', required: 'true', autocomplete: 'off' },
        inputValidator: value => !value.trim() ? 'Enter a meal name.' : value.trim().length > 60 ? 'Use 60 characters or fewer.' : undefined,
      } : {}),
    });
    return response.isConfirmed ? (options.input ? response.value.trim() : true) : null;
  } finally {
    window.removeEventListener('zolnutrition:alert-back', back);
    native.forEach(el => { if (el.isConnected) { el.hidden = false; el.showModal(); } });
    if (previous?.isConnected) previous.focus();
    active = false;
  }
}
