// public/js/subscribe.js
async function subscribeToPush() {
    console.log('Starting push subscription process');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('Push notifications not supported by browser');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered:', registration);
        await navigator.serviceWorker.ready;
        console.log('Service worker ready');

        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        if (permission !== 'granted') {
            console.error('Notification permission denied');
            return;
        }

        const vapidPublicKey = await fetch('/vapidPublicKey')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch VAPID public key');
                return res.text();
            })
            .catch(err => {
                console.error('VAPID fetch error:', err);
                throw err;
            });
        console.log('VAPID public key:', vapidPublicKey);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        }).catch(err => {
            console.error('Subscription error:', err);
            throw err;
        });
        console.log('Push subscription:', JSON.stringify(subscription));

        const response = await fetch('/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin' // Ensure session cookies are sent
        });
        const result = await response.json();
        console.log('Subscription response from server:', result);

        if (!response.ok) {
            throw new Error('Failed to save subscription: ' + result.error);
        }
    } catch (err) {
        console.error('Push subscription failed:', err);
    }
}

function urlBase64ToUint8Array(base64String) {
    try {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (err) {
        console.error('Error converting VAPID key:', err);
        throw err;
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('subscribe.js loaded');
    subscribeToPush();
});