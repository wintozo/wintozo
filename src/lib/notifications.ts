// Browser notification utility

export function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showNotification(title: string, body: string, onClick?: () => void) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  const notif = new Notification(title, {
    body,
    icon: "/favicon.ico",
    tag: "wintozo-message",
  });

  if (onClick) {
    notif.onclick = () => {
      window.focus();
      onClick();
      notif.close();
    };
  }

  // Auto-close after 5 seconds
  setTimeout(() => notif.close(), 5000);
}
