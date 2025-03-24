const REFRESH_INTERVAL = 1000;
const WAITING_TIMEOUT = 5000;

const queueTimes = []; // array of [time, position]

const positionId = "position";
const queueId = "queue-info";
const timeId = "time-info";

let updateDisplayInterval = null;
let positionObserver = null;

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function updateDisplay() {
    // If we haven't had two updates yet, we can't do any estimations
    if (queueTimes.length < 2) {
        return;
    }

    const [lastTime, lastPosition] = queueTimes[queueTimes.length - 2];
    const [time, position] = queueTimes[queueTimes.length - 1];

    const now = Date.now();

    // Calculate time left
    const positionDiff = position - lastPosition;
    const timeDiff = time - lastTime;
    const msPerMove = timeDiff / Math.abs(positionDiff);
    const msLeft = position * msPerMove;
    const secondsLeft = Math.floor(msLeft / 1000);

    // Calculate difference between last update and what our estimated metrics are
    const msSinceLastUpdate = now - time;
    // Give a 40% decrease so we will rarely see the number go UP when an update happens
    const positionChangeSinceLastUpdate = Math.floor(msSinceLastUpdate / msPerMove * 0.6);

    // Find hr/min/sec
    let seconds = secondsLeft - Math.floor(msSinceLastUpdate / 1000);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;

    // Set time left display
    let remainingTime = [`${seconds} second${seconds !== 1 ? 's' : ''}`]
    if (hours) {
        remainingTime = [
            `${hours} hour${hours !== 1 ? 's' : ''}`,
            `${minutes} minute${minutes !== 1 ? 's' : ''}`,
            `${seconds} second${seconds !== 1 ? 's' : ''}`,
        ]
    } else if (minutes) {
        remainingTime = [
            `${minutes} minute${minutes !== 1 ? 's' : ''}`,
            `${seconds} second${seconds !== 1 ? 's' : ''}`,
        ]
    }

    // Set display
    const timeInfo = document.getElementById(timeId);
    const queueInfo = document.getElementById(queueId);

    timeInfo.innerText = `Remaining time in queue: ${remainingTime.join(', ')}`;
    queueInfo.innerText = `You are currently in position ${numberWithCommas(position - positionChangeSinceLastUpdate)}.`;
}

function handlePositionChange() {
    // Base case checks, make sure we have all that we need
    const p = document.getElementById(positionId);
    if (!p) {
        return;
    }
    
    const position = parseInt(p.innerText);
    if (!position) {
        return;
    }

    const now = Date.now();

    if (queueTimes.length === 0) {
        // Set up initial display
        const timeInfo = document.getElementById(timeId);
        const queueInfo = document.getElementById(queueId);

        timeInfo.innerText = `Calculating remaining time...`;
        queueInfo.innerText = `You are currently in position ${numberWithCommas(position)}.`;

        queueTimes.push([now, position]);
    } else {
        // If we had a previous queue time, check if there's a difference
        const [lastTime, lastPosition] = queueTimes[queueTimes.length - 1];
        if (lastPosition !== position) {
            queueTimes.push([now, position]);
        }
    }

}

// Callback for observer
function watchPositionChange(mutationsList, observer) {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            handlePositionChange();
        }
    }
}

// Watch for our elements to appear, if we are in the queue
let startTime = Date.now();
const checker = setInterval(() => {
    const waitingText = document.getElementsByClassName("waiting-text")

    // Yay (sorta?), we're in the queue
    if (waitingText.length && !positionObserver) {
        // Create the element that PC attaches position to
        const span = document.createElement("span");
        span.setAttribute("id", positionId);
        span.setAttribute("style", "display: none");

        // Create our elements
        const queueInfo = document.createElement("div");
        queueInfo.setAttribute("id", queueId);
        queueInfo.classList.add("waiting-text");

        const timeInfo = document.createElement("p");
        timeInfo.setAttribute("id", timeId);
        timeInfo.classList.add("sub-text");
        
        waitingText[0].parentElement.appendChild(span);
        waitingText[0].parentElement.appendChild(queueInfo);
        waitingText[0].parentElement.appendChild(timeInfo);
        
        // Kick off our position observer
        handlePositionChange();
        positionObserver = new MutationObserver(watchPositionChange);
        positionObserver.observe(span, { childList: true });
        updateDisplay();
        setInterval(updateDisplay, REFRESH_INTERVAL);
    }

    // If we don't see the waiting-text within 5 seconds, stop checking
    if (Date.now() - startTime > WAITING_TIMEOUT || waitingText || !!positionObserver) {
        clearInterval(checker);
    }
}, 500)