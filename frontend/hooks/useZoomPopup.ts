// lib/zoomUi.ts
import zoomSdk from "@zoom/appssdk";

// Define the Zoom SDK notification shape (to avoid DOM NotificationOptions collision)
type ZoomNotificationOptions = {
  type: "info" | "warning" | "error";
  title: string;
  message: string;
};

let zoomReady = false;

export async function initZoomOnce() {
  if (zoomReady) return;
  try {
    await zoomSdk.config({
      // version: "0.16", // uncomment if you're loading via <script>
      capabilities: ["bringAppToFront", "expandApp", "showNotification"],
      popoutSize: { width: 520, height: 420 },
    });
    zoomReady = true;
  } catch (e) {
    console.warn("Zoom SDK not available/config failed:", e);
  }
}

// Strongly typed wrapper around showNotification
async function showZoomNotification(opts: ZoomNotificationOptions): Promise<void> {
  // zoomSdk typing may be too loose, so assert only this method with our safe type
  const fn = (zoomSdk as unknown as {
    showNotification(o: ZoomNotificationOptions): Promise<void>;
  }).showNotification;

  return fn(opts);
}

export async function zoomNotifyError(message: string, title = "Error") {
  await initZoomOnce();
  try {
    await showZoomNotification({ type: "error", title, message });
  } catch {
    console.error(`${title}: ${message}`);
  }
}

export async function zoomConfirm(
  message: string,
  title = "Confirm"
): Promise<boolean> {
  await initZoomOnce();
  try {
    await zoomSdk.bringAppToFront();
    await zoomSdk.expandApp({ action: "expand" });
  } catch {
    // ignore if not in Zoom
  }

  return new Promise<boolean>((resolve) => {
    const host = document.createElement("div");
    host.id = "zoom-confirm-host";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    Object.assign(host.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,.40)",
      display: "grid",
      placeItems: "center",
      zIndex: "9999",
    } as Partial<CSSStyleDeclaration>);

    host.innerHTML = `
      <div style="
        width: 480px; max-width: 92vw; background:#fff; border-radius:12px;
        padding:18px; box-shadow:0 12px 30px rgba(0,0,0,.22); font: 14px/1.4 system-ui;">
        <div style="font-weight:600; margin-bottom:6px;">${title}</div>
        <div style="margin-bottom:14px;">${message}</div>
        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button id="zCancel" style="padding:6px 12px; border-radius:10px; border:1px solid #e5e7eb; background:#f3f4f6;">Cancel</button>
          <button id="zOk" style="padding:6px 12px; border-radius:10px; border:0; background:#0284c7; color:#fff;">OK</button>
        </div>
      </div>
    `;

    const cleanup = (val: boolean) => {
      host.remove();
      resolve(val);
    };

    host.addEventListener("click", (e) => {
      if (e.target === host) cleanup(false);
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup(false);
      if (e.key === "Enter") cleanup(true);
    };

    document.addEventListener("keydown", onKey, { once: true });
    (host.querySelector<HTMLButtonElement>("#zOk")!).onclick = () => cleanup(true);
    (host.querySelector<HTMLButtonElement>("#zCancel")!).onclick = () => cleanup(false);

    document.body.appendChild(host);
    (host.querySelector<HTMLButtonElement>("#zOk") as HTMLButtonElement).focus();
  });
}
