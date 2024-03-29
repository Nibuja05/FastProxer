"use strict";
let STATUS = "None";
let nextUrl;
let prevUrl;
let streamInfo;
let autoSkip = true;
let autoStart = false;
let hotkeys = {
    next: "n",
    prev: "p",
    cancel: "x",
};
let timeSkips = [];
let tries = 0; //max = 5
async function stream_Init() {
    try {
        autoSkip = await stream_GetSetting("autoNext");
        autoStart = await stream_GetSetting("autoPlay");
        hotkeys = await stream_GetSettingHotkeys();
    }
    catch (_a) {
        console.log("Failed to load ProxerCinema global settings!");
        if (tries >= 5) {
            throw new Error("Maximum number of retries reached for retrieving ProxerCinema global settings!");
        }
        tries++;
        setTimeout(() => stream_Init(), 1000);
        return;
    }
    document.onmousemove = () => {
        stream_onMouseMove();
    };
    stream_RefreshChecks();
    const playerDiv = document.querySelector("#player_code");
    if (playerDiv) {
        playerDiv.style.height = "auto";
        playerDiv.style.width = "100%";
    }
    const player = document.querySelector("#plyr");
    if (player) {
        player.style.height = "auto";
        player.style.width = "100%";
    }
    stream_HandleHotkeys();
}
function stream_HandleHotkeys() {
    document.addEventListener("keydown", (event) => {
        if (event.key == hotkeys.next) {
            if (nextButton)
                stream_NextButtonClick();
        }
        if (event.key == hotkeys.prev) {
            if (prevButton)
                stream_PrevButtonClick();
        }
        if (event.key == hotkeys.cancel) {
            if (cancelButton)
                stream_CancelButtonClick();
        }
    });
}
function stream_RefreshChecks() {
    if (skipTimeout) {
        clearTimeout(skipTimeout);
        skipTimeout = undefined;
    }
    if (!autoSkip)
        return;
    const skipInterval = setInterval(() => {
        const timeLeft = stream_GetVideoTimeLeft();
        if (!timeLeft)
            return;
        if (timeLeft <= 6) {
            steam_StartVideoSkip();
            clearInterval(skipInterval);
            return;
        }
        const curTime = stream_GetVideoTime();
        if (!curTime)
            return;
        const nextSkip = stream_ToNextSkip(curTime);
        if (!nextSkip)
            return;
        if (nextSkip.left <= 2) {
            if (nextSkip.toEnd) {
                steam_StartVideoSkip();
            }
            else {
                steam_StartVideoSkip(nextSkip.end);
            }
            clearInterval(skipInterval);
        }
    }, 500);
}
function stream_GetVideoTimeLeft() {
    const video = document.querySelector("video");
    if (!video)
        return;
    const curTime = video.currentTime;
    const maxTime = video.duration;
    return maxTime - curTime;
}
function stream_GetVideoTime() {
    const video = document.querySelector("video");
    if (!video)
        return;
    return video.currentTime;
}
async function stream_StartVideo() {
    const video = document.querySelector("video");
    if (!video)
        return;
    await stream_WaitForVideoLoaded(video);
    video.play();
}
async function stream_SetVideoTime(time) {
    const video = document.querySelector("video");
    if (!video)
        return;
    await stream_WaitForVideoLoaded(video);
    // await stream_Wait(1000);
    video.currentTime = time;
}
function stream_ToNextSkip(time) {
    if (timeSkips.length < 1)
        return;
    for (const skip of timeSkips) {
        if (skip.start < time)
            continue;
        return {
            left: skip.start - time,
            end: skip.end,
            toEnd: skip.toEnd,
        };
    }
}
let cancelButton = undefined;
let skipTimeout;
function steam_StartVideoSkip(to) {
    if (!nextButton)
        return;
    nextButton.classList.remove("hidden");
    if (to)
        nextButton.classList.add("skip");
    const oldFiller = nextButton.querySelector(".ControlButtonBack");
    if (oldFiller)
        oldFiller.remove();
    const nextButtonFiller = document.createElement("div");
    nextButtonFiller.classList.add("ControlButtonBack");
    setTimeout(() => {
        nextButtonFiller.classList.add("started");
    }, 10);
    nextButton.insertBefore(nextButtonFiller, nextButton.childNodes[0]);
    // so elements are showed again
    stream_onMouseMove();
    stream_AddCancelButton();
    skipTimeout = setTimeout(() => {
        if (cancelButton)
            cancelButton.classList.add("hidden");
        nextButtonFiller.remove();
        nextButton.classList.remove("skip");
        skipTimeout = undefined;
        if (to) {
            stream_SetVideoTime(to);
        }
        else {
            stream_NextButtonClick();
        }
        if (to)
            setTimeout(() => stream_RefreshChecks(), 5000);
    }, 5000);
}
function stream_AddCancelButton() {
    if (cancelButton) {
        cancelButton.classList.remove("hidden");
        return;
    }
    let player = stream_FindPlayer();
    if (!player)
        return;
    cancelButton = document.createElement("div");
    cancelButton.setAttribute("id", "ControlButton");
    cancelButton.classList.add("Cancel");
    cancelButton.innerHTML = "Cancel";
    player.appendChild(cancelButton);
    cancelButton.addEventListener("click", () => {
        stream_CancelButtonClick();
    });
}
function stream_CancelButtonClick() {
    if (skipTimeout) {
        clearTimeout(skipTimeout);
        skipTimeout = undefined;
    }
    if (cancelButton)
        cancelButton.classList.add("hidden");
    if (!nextButton)
        return;
    const nextButtonFiller = nextButton === null || nextButton === void 0 ? void 0 : nextButton.querySelector(".ControlButtonBack");
    if (!nextButtonFiller)
        return;
    nextButtonFiller.remove();
    nextButton.classList.remove("skip");
    setTimeout(() => stream_RefreshChecks(), 5000);
}
let mouseMoveTimeout = undefined;
let still = true;
function stream_onMouseMove() {
    if (mouseMoveTimeout)
        clearTimeout(mouseMoveTimeout);
    stream_onMouseMoveAgain();
    mouseMoveTimeout = setTimeout(() => {
        if (skipTimeout) {
            stream_onMouseMove();
            return;
        }
        stream_onMouseStill();
    }, 2000);
}
function stream_onMouseStill() {
    still = true;
    if (nextButton)
        nextButton.classList.add("hidden");
    if (prevButton)
        prevButton.classList.add("hidden");
    if (videoInfoLabel)
        videoInfoLabel.classList.add("hidden");
}
async function stream_onMouseMoveAgain() {
    still = false;
    if (nextButton)
        nextButton.classList.remove("hidden");
    if (prevButton)
        prevButton.classList.remove("hidden");
    if (videoInfoLabel)
        videoInfoLabel.classList.remove("hidden");
}
async function stream_SendUrl(type) {
    const url = await stream_GetUrl();
    if (!url)
        return;
    stream_SendMessage("setVideoUrl", { url, type });
}
async function stream_GetUrl() {
    const video = document.querySelector("video");
    if (!video)
        return;
    const videoSource = video.querySelector("source");
    let url;
    if (!videoSource) {
        url = video.src;
        if (!url) {
            await stream_WaitForVideoLoaded(video);
            url = video.src;
        }
    }
    else {
        url = videoSource.src;
    }
    return url;
}
function stream_WaitForVideoLoaded(video) {
    return new Promise((resolve, _) => {
        const interval = setInterval(() => {
            if (video.duration) {
                clearInterval(interval);
                resolve();
                return;
            }
        }, 500);
    });
}
function stream_ChangeUrl(url) {
    const video = document.querySelector("video");
    if (!video)
        return;
    const videoSource = video.querySelector("source");
    if (!videoSource) {
        video.setAttribute("src", url);
    }
    else {
        videoSource.setAttribute("src", url);
    }
    video.load();
    video.play();
}
let nextButton = undefined;
function stream_AddNextButton() {
    if (nextButton) {
        nextButton.classList.remove("hidden");
        return;
    }
    let player = stream_FindPlayer();
    if (!player)
        return;
    let button = document.createElement("div");
    button.setAttribute("id", "ControlButton");
    button.classList.add("Next");
    button.classList.add("hidden");
    player.appendChild(button);
    let buttonText = document.createElement("span");
    buttonText.classList.add("nextText");
    buttonText.innerHTML = "Next";
    button.appendChild(buttonText);
    let buttonTextAlt = document.createElement("span");
    buttonTextAlt.classList.add("nextTextAlt");
    buttonTextAlt.innerHTML = "Skip";
    button.appendChild(buttonTextAlt);
    button.addEventListener("click", () => {
        stream_NextButtonClick();
    });
    nextButton = button;
}
function stream_NextButtonClick() {
    if (isProxerHD) {
        stream_SendMessage("globalEvent", "JumpNextOld");
        return;
    }
    nextButton.classList.add("hidden");
    stream_ChangeUrl(nextUrl);
    streamInfo.episode++;
    stream_SendMessage("globalEvent", "JumpNext");
    stream_RefreshChecks();
    stream_SendMessage("requestTimestamps", streamInfo);
}
let prevButton = undefined;
function stream_AddPrevButton() {
    if (prevButton) {
        prevButton.classList.remove("hidden");
        return;
    }
    let player = stream_FindPlayer();
    if (!player)
        return;
    let button = document.createElement("div");
    button.setAttribute("id", "ControlButton");
    button.classList.add("Prev");
    button.classList.add("hidden");
    button.innerHTML = "Prev";
    player.appendChild(button);
    button.addEventListener("click", () => {
        stream_PrevButtonClick();
    });
    prevButton = button;
}
function stream_PrevButtonClick() {
    if (isProxerHD) {
        stream_SendMessage("globalEvent", "JumpPrevOld");
        return;
    }
    prevButton.classList.add("hidden");
    stream_ChangeUrl(prevUrl);
    streamInfo.episode--;
    stream_SendMessage("globalEvent", "JumpPrev");
    stream_RefreshChecks();
    stream_SendMessage("requestTimestamps", streamInfo);
}
let videoInfoLabel = undefined;
function stream_UpdateVideoInfo(info) {
    if (!videoInfoLabel) {
        let player = stream_FindPlayer();
        if (!player)
            return;
        videoInfoLabel = document.createElement("p");
        videoInfoLabel.setAttribute("id", "VideoInfo");
        videoInfoLabel.classList.add("hidden");
        player.appendChild(videoInfoLabel);
    }
    videoInfoLabel.innerHTML = `${info.name} - ${info.episode}/${info.maxEpisode}`;
}
let isProxerHD = false;
function stream_FindPlayer() {
    var _a, _b;
    let player = (_b = (_a = document.getElementById("plyr")) === null || _a === void 0 ? void 0 : _a.parentElement) === null || _b === void 0 ? void 0 : _b.parentElement;
    if (!player) {
        // m4upload video
        player = document.querySelector(".video-js");
    }
    if (!player) {
        // proxer HD video
        isProxerHD = true;
        const video = document.querySelector("video");
        if (video)
            player = video.parentElement;
    }
    return player;
}
function stream_GetId() {
    if (!streamInfo)
        return window.location.href;
    return `${streamInfo.name}_${streamInfo.episode}`;
}
function stream_OnStatusChange(request) {
    STATUS = request.status;
    streamInfo = {
        name: request.name,
        episode: request.episode,
    };
    if (STATUS == "Original") {
        stream_SendMessage("streamLoaded", stream_GetId()).then((answer) => {
            if (answer.status != "OK")
                return;
            if (!answer.content.savedTime)
                return;
            stream_SetVideoTime(answer.content.time);
        });
        if (autoStart)
            stream_StartVideo();
        stream_SendMessage("requestTimestamps", streamInfo);
    }
    if (STATUS == "Created_Next")
        stream_SendUrl("Next");
    if (STATUS == "Created_Prev")
        stream_SendUrl("Prev");
    if (STATUS == "Download") {
        stream_GetUrl().then((url) => {
            if (!url)
                return;
            stream_SendMessage("massDownload", {
                name: request.name,
                episode: request.episode,
                url,
            });
        });
    }
}
function stream_ParseTimestamps(timeStamps) {
    if (timeStamps.length <= 2)
        return;
    timeSkips = [];
    let curSkip = false;
    let start = 0;
    for (const stamp of timeStamps) {
        switch (stamp.type) {
            case "Canon":
            case "Title Card":
                if (curSkip) {
                    curSkip = false;
                    timeSkips.push({
                        toEnd: false,
                        start,
                        end: stamp.at,
                    });
                }
                break;
            case "Branding":
                break;
            case "Intro":
            case "Credits":
            case "Recap":
                if (!curSkip) {
                    curSkip = true;
                    start = stamp.at;
                }
                break;
        }
    }
    if (curSkip) {
        timeSkips.push({
            toEnd: true,
            start,
        });
    }
    timeSkips.sort((a, b) => (a.start < b.start ? -1 : 1));
}
function stream_SendMessage(type, message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: type,
            message: message || "",
        }, (response) => {
            if (response && response.status != "Error") {
                resolve(response);
            }
            else
                reject();
        });
    });
}
chrome.runtime.onMessage.addListener(stream_ReceiveMessge);
function stream_ReceiveMessge(request, _, sendResponse) {
    const fail = () => sendResponse({ status: "Error" });
    let answer;
    if (request.type == "updateStreamStatus" && STATUS == "None") {
        stream_OnStatusChange(request.message);
    }
    if (request.type == "setVideoUrl" && STATUS == "Original") {
        if (request.message.type == "Next")
            nextUrl = request.message.url;
        if (request.message.type == "Prev")
            prevUrl = request.message.url;
    }
    if (request.type == "getVideoUrl" && STATUS == "Original") {
        stream_GetUrl().then((url) => {
            if (url)
                stream_SendMessage("getVideoUrl_reply", url);
        });
    }
    if (request.type == "sendVideoInfo" && STATUS == "Original") {
        stream_UpdateVideoInfo(request.message);
    }
    if (request.type == "sendTimestamps") {
        stream_ParseTimestamps(request.message);
    }
    if (request.type == "globalEvent") {
        const event = request.message;
        if (event == "HasNext" && STATUS == "Original")
            stream_AddNextButton();
        if (event == "HasPrev" && STATUS == "Original")
            stream_AddPrevButton();
        if (event == "NoNext" && STATUS == "Original") {
            nextButton === null || nextButton === void 0 ? void 0 : nextButton.remove();
            nextButton = undefined;
        }
        if (event == "NoPrev" && STATUS == "Original") {
            prevButton === null || prevButton === void 0 ? void 0 : prevButton.remove();
            prevButton = undefined;
        }
    }
    if (!answer) {
        sendResponse({ status: "NoData" });
    }
    else {
        sendResponse({ status: "OK", content: answer });
    }
}
function stream_Wait(time) {
    return new Promise((resolve, _) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
document.addEventListener("fullscreenchange", stream_OnChangeFullscreen, false);
async function stream_OnChangeFullscreen(event) {
    if (document.fullscreenElement)
        return; //only care if it's exiting fullscreen
    const curTime = stream_GetVideoTime();
    if (curTime) {
        stream_SendMessage("saveProgress", {
            id: stream_GetId(),
            time: curTime,
        });
    }
    stream_SendMessage("globalEvent", "ExitFullscreen");
}
const stream_SettingNames = ["autoNext", "autoPlay"];
function stream_GetSetting(name) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(stream_SettingNames, (data) => {
            if (!data || data[name] == undefined)
                reject();
            resolve(data[name] === 1);
        });
    });
}
function stream_GetSettingHotkeys() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get("hotkeys", (data) => {
            if (!data || !data.hotkeys)
                reject();
            resolve(data.hotkeys);
        });
    });
}
stream_Init();
