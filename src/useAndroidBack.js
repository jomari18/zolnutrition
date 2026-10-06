import { useEffect, useRef } from 'react';
export default function useAndroidBack(handle) {
  const current = useRef(handle);
  current.current = handle;
  useEffect(() => {
    const back = event => { if (current.current()) event.preventDefault(); };
    window.addEventListener('zolnutrition:back', back);
    return () => window.removeEventListener('zolnutrition:back', back);
  }, []);
}
