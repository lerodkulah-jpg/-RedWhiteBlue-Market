"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setShowInstructions(true);
      return;
    }

    const promptEvent = installPrompt;
    setInstallPrompt(null);
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    } else {
      setShowInstructions(true);
    }
  }

  if (isInstalled) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={installApp}
        aria-expanded={showInstructions}
        aria-controls="pwa-install-instructions"
        className="pwa-install-button inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 sm:text-sm"
      >
        <Download aria-hidden="true" size={15} />
        Install App
      </button>
      {showInstructions && (
        <div
          id="pwa-install-instructions"
          role="status"
          className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 text-left text-sm text-slate-700 shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <p>
              {/iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
              (navigator.platform === "MacIntel" &&
                navigator.maxTouchPoints > 1)
                ? "To install on iPhone or iPad, tap Share, then Add to Home Screen."
                : "Open your browser menu and choose Install app or Add to Home screen."}
            </p>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              aria-label="Close install instructions"
              className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100"
            >
              <X aria-hidden="true" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
