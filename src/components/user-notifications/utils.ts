export const showBrowserNotification = (message: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  // we'll see if website has any favicon icon, then we'll use it
  const favicon = document.querySelector("link[rel*='icon']");
  const icon = favicon?.getAttribute('href') ?? undefined;
  // oxlint-disable-next-line no-new
  new Notification(message, { icon });
};
