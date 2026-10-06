import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { dispatchAndroidBack } from './androidBack.js';
export default function NativeShell() {
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    document.documentElement.classList.add('native-android');
    let disposed = false, handle;
    NativeApp.addListener('backButton', () => {
      if (!dispatchAndroidBack()) NativeApp.minimizeApp().catch(() => {});
    }).then(listener => {
      if (disposed) listener.remove();
      else handle = listener;
    }).catch(() => {});
    return () => { disposed = true; handle?.remove(); };
  }, []);
  return null;
}
