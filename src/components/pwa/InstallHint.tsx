import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/** Separate from the zustand persist key `hand-foot-score`. */
const HINT_KEY = "hand-foot-install-hint";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

function hintDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return true;
  }
}

function dismissHint() {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    if (isStandalone() || hintDismissed()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const timer = window.setTimeout(() => setVisible(true), 900);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  async function install() {
    if (!installEvent) {
      window.location.assign("/?install=1");
      return;
    }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") {
      dismissHint();
      setVisible(false);
    }
  }

  function close() {
    dismissHint();
    setVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 safe-x safe-bottom">
      <div className="mx-auto mb-3 flex max-w-lg items-center gap-3 rounded-lg border border-felt-line bg-felt-elev px-3 py-2.5 text-felt-fg shadow-felt">
        <p className="min-w-0 flex-1 text-sm text-pretty">
          Install <span className="font-medium">Hand & Foot</span> on your
          home screen for a full-screen score sheet.
        </p>
        <button
          type="button"
          onClick={() => void install()}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-paper px-3 text-xs font-medium text-paper-fg"
        >
          <Download className="size-3.5" />
          {installEvent ? "Install" : "How"}
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss install hint"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-felt-muted hover:bg-felt-line/40 hover:text-felt-fg"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
