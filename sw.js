// sw.js

self.addEventListener('push', event => {
  const data = event.data.json();
  console.log('New notification', data);
  const options = {
    body: data.body,
    icon: '/vite.svg', // Puteți schimba cu o pictogramă adecvată
    badge: '/vite.svg'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Această funcție aduce în prim-plan fereastra aplicației dacă este deschisă.
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientsArr => {
      const hadWindowToFocus = clientsArr.length > 0;
      if (hadWindowToFocus) {
        clientsArr[0].focus();
      } else if (clients.openWindow) {
        // Dacă nicio fereastră nu este deschisă, deschide una nouă.
        clients.openWindow('/');
      }
    })
  );
});