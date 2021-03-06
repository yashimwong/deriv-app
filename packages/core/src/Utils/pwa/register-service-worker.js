import { getUrlBase } from '@deriv/shared';

const EVERY_HOUR = 3600000; // 1000 * 60 * 60
const AUTO_REFRESH_THRESHOLD = 10000; // 10 Seconds

let interval_id;
let should_refresh_on_register = false;

function refreshOnUpdate() {
    return swRegistrationObject => {
        swRegistrationObject.onupdatefound = () => {
            const updatingWorker = swRegistrationObject.installing;
            updatingWorker.onstatechange = () => {
                if (updatingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // eslint-disable-next-line no-console
                    console.log('New version is found, refreshing the page...');
                    clearInterval(interval_id);
                }
            };
        };
    };
}

export default function register() {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length !== 0) {
            should_refresh_on_register = true;
        }
    });

    // Register the service worker
    if (/* process.env.NODE_ENV === 'production' && */ 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const sw_url = `${window.location.origin}${getUrlBase('/service-worker.js')}`;
            navigator.serviceWorker
                .register(sw_url)
                .then(registration => {
                    interval_id = setInterval(() => {
                        registration.update().then(refreshOnUpdate);
                    }, EVERY_HOUR);

                    registration.onupdatefound = () => {
                        const installingWorker = registration.installing;
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller && AUTO_REFRESH_THRESHOLD < performance.now()) {
                                    // User's first visit:
                                    // At this point, the old content will have been purged and
                                    // the fresh content will have been added to the cache.
                                    // It's the perfect time to display a "New content is
                                    // available; please refresh." message in your web app.
                                    console.log('New content is available; please refresh.'); // eslint-disable-line no-console
                                    const new_version_received = new Event('UpdateAvailable');
                                    document.dispatchEvent(new_version_received);
                                } else {
                                    // At this point, everything has been precached.
                                    // It's the perfect time to display a
                                    // "Content is cached for offline use." message.
                                    console.log('Content is cached for offline use.', performance.now()); // eslint-disable-line no-console
                                }
                            }
                        };
                    };
                })
                .catch(error => {
                    console.error('Error during service worker registration:', error); // eslint-disable-line no-console
                });
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            // This fires when the service worker controlling this page
            // changes, eg a new worker has skipped waiting and become
            // the new active worker.
            if (AUTO_REFRESH_THRESHOLD > performance.now() && should_refresh_on_register) {
                window.location.reload();
            } else {
                // eslint-disable-next-line no-console
                console.log('First registration, no need to refresh.');
            }
        });
    }
}

export function unregister() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.unregister();
        });
    }
}
