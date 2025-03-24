const queueTimes = []; // array of [time, position]
let interval = null;

const positionId = "position";
const queueId = "queue-info";
const timeId = "time-info";
let positionObserver = null;

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    const timeInfo = document.getElementById(timeId)

    // If we had a previous queue time, check the difference
    if (queueTimes.length > 0) {
        const [lastTime, lastPosition] = queueTimes[queueTimes.length - 1];
        if (lastPosition === position) {
            return;
        }

        // TODO better estimation based on previous times
        // TODO update time remaining every second

        // Calculate time left
        const positionDiff = position - lastPosition;
        const timeDiff = now - lastTime;
        const msPerMove = timeDiff / Math.abs(positionDiff);
        const msLeft = position * msPerMove;

        let seconds = msLeft / 1000;
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        seconds = Math.floor(seconds % 60);

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
        
        timeInfo.innerText = `Remaining time in queue: ${remainingTime.join(', ')}`;
    } else {
        timeInfo.innerText = `Calculating remaining time...`;
    }

    queueTimes.push([now, position]);
    const queueInfo = document.getElementById(queueId)
    queueInfo.innerText = `You are currently in position ${numberWithCommas(position)}.`;
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
    }

    if (Date.now() - startTime > 5000 || waitingText || !!positionObserver) {
        clearInterval(checker);
    }
}, 500)