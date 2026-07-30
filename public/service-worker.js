// Deliberately no response caching: the presale must always load fresh on-chain UI.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
