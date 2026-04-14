const API_HOST = 'https://api.cardscout.co';
const POLL_INTERVAL_MS = 120000;

let pollingTimer = null;
let wasInQueue = false;

function parseWaitTime(text) {
    if (!text) return null;
    const match = text.trim().match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return null;
    return parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10);
}

function findIncapsulaIframe() {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
        if (iframe.src && iframe.src.includes('/_Incapsula_Resource')) {
            return iframe;
        }
    }
    return null;
}

function detectIncapsulaIframe() {
    return findIncapsulaIframe() !== null;
}

function getEstimatedWaitTime() {
    // Check current document first (works when running inside the iframe via all_frames)
    const ttwElement = document.getElementById('ttw');
    if (ttwElement) {
        const seconds = parseWaitTime(ttwElement.textContent);
        if (seconds !== null) return seconds;
    }

    // Fall back to reaching into the iframe from the parent document
    const iframe = findIncapsulaIframe();
    if (!iframe) return undefined;

    try {
        const iframeDoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (!iframeDoc) return undefined;

        const iframeTtw = iframeDoc.getElementById('ttw');
        if (!iframeTtw) return undefined;

        const seconds = parseWaitTime(iframeTtw.textContent);
        return seconds !== null ? seconds : undefined;
    } catch (e) {
        // Cross-origin iframe — can't access content
        return undefined;
    }
}

async function postQueueStatus(payload, done) {
    const url = done
        ? `${API_HOST}/pokemon/queue?done=true`
        : `${API_HOST}/pokemon/queue`;

    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, source: 'pc-queue-extension' }),
    });
}

async function reportQueueStatus(done) {
    const payload = {};

    if (!done) {
        const waitTime = getEstimatedWaitTime();
        if (waitTime !== undefined) {
            payload.estimatedWaitTime = waitTime;
        }
    }

    try {
        await postQueueStatus(payload, done);
    } catch (e) {
        // Silently fail — don't disrupt the user's browsing
    }
}

function stopPolling() {
    if (pollingTimer !== null) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

function startPolling() {
    stopPolling();
    wasInQueue = true;

    // Report immediately
    reportQueueStatus(false);

    // Then every 120 seconds
    pollingTimer = setInterval(() => {
        if (!detectIncapsulaIframe()) {
            // Queue cleared
            stopPolling();
            reportQueueStatus(true);
            wasInQueue = false;
            return;
        }
        reportQueueStatus(false);
    }, POLL_INTERVAL_MS);
}

function init() {
    if (detectIncapsulaIframe()) {
        startPolling();
    } else if (wasInQueue) {
        reportQueueStatus(true);
        wasInQueue = false;
    }

    // Watch for dynamically added iframes
    const observer = new MutationObserver(() => {
        const inQueue = detectIncapsulaIframe();
        if (inQueue && pollingTimer === null) {
            startPolling();
        } else if (!inQueue && pollingTimer !== null) {
            stopPolling();
            reportQueueStatus(true);
            wasInQueue = false;
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}

init();
