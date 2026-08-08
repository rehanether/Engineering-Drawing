import React, { useEffect, useState } from "react";
import "./InstallApp.css";

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isMobile = () => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const isStandalone = () =>
  (typeof window.matchMedia === "function" && Boolean(window.matchMedia("(display-mode: standalone)")?.matches)) ||
  window.navigator.standalone === true;

export default function InstallApp() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installed, setInstalled] = useState(() => typeof window !== "undefined" && isStandalone());

  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) {
      setShowInstallHelp((open) => !open);
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (installed) return null;

  if (!installPrompt && !isMobile()) return null;

  const ios = isIOS();
  const helpText = ios
    ? "Tap Share, then Add to Home Screen."
    : "Open your browser menu, then choose Install app or Add to Home screen.";

  return (
    <aside className={`pwa-install${ios ? " ios" : ""}`} aria-label="Install EDG app">
      <span>{installPrompt ? "Install the EDG app" : "Add EDG to your phone"}</span>
      <button onClick={install}>Install app</button>
      {showInstallHelp && <span className="pwa-install-help">{helpText}</span>}
    </aside>
  );
}
