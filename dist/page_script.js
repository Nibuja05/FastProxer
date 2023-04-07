"use strict";
let curUrlIndex = 0;
let info = undefined;
async function page_Init() {
    curUrlIndex = page_GetCurUrlIndex();
    page_GetVideoInfo();
    let next = false;
    if (info) {
        next = curUrlIndex == info.episode && curUrlIndex + 1 <= info.maxEpisode;
    }
    else {
        await page_CheckValidUrl(page_GetIndexUrlFor(curUrlIndex + 1));
    }
    const prev = curUrlIndex - 1 > 0;
    const iframe = document.querySelector("iframe");
    if (!page_InIframe()) {
        if (next || prev) {
            iframe === null || iframe === void 0 ? void 0 : iframe.addEventListener("load", () => {
                page_SendMessage("updateStreamStatus", Object.assign({ status: "Original" }, page_GetIdData()));
                page_CheckIndex();
            });
        }
        if (info)
            page_SendMessage("prepareTimestamps", info);
        page_AddUtilityRow();
        page_SendMessage("getCinemaMode", undefined).then((answer) => {
            if (answer.status != "OK")
                return;
            if (answer.content) {
                cinemaMode = answer.content;
                page_EnterCinemaMode();
            }
        });
        page_OpenDetails();
    }
}
function page_GetVideoInfo() {
    const container = document.querySelector("#wContainer");
    const name = container === null || container === void 0 ? void 0 : container.querySelector(".wName");
    const language = container === null || container === void 0 ? void 0 : container.querySelector(".wLanguage");
    const episode = container === null || container === void 0 ? void 0 : container.querySelector(".wEp");
    const maxEpisode = page_GetNextChild(episode);
    const maxEpisodeText = maxEpisode ? page_ExtractMaxEpisodeNumber(maxEpisode) : undefined;
    if (name && language && episode && maxEpisodeText) {
        info = {
            name: name.innerHTML,
            episode: parseInt(episode.innerHTML),
            maxEpisode: maxEpisodeText,
            language: language.innerHTML,
        };
    }
}
function page_ExtractMaxEpisodeNumber(textNode) {
    var _a;
    if (textNode.nodeType != Node.TEXT_NODE)
        return;
    const match = (_a = textNode.nodeValue) === null || _a === void 0 ? void 0 : _a.match(/\d+/);
    if (!match)
        return;
    return parseInt(match[0]);
}
function page_GetNextChild(element) {
    if (!element)
        return;
    const parent = element.parentElement;
    if (!parent)
        return;
    let isNext = false;
    for (const child of parent.childNodes) {
        if (isNext)
            return child;
        if (child == element)
            isNext = true;
    }
}
async function page_CheckIndex() {
    let next = false;
    if (info) {
        next = curUrlIndex == info.episode && curUrlIndex + 1 <= info.maxEpisode;
    }
    else {
        await page_CheckValidUrl(page_GetIndexUrlFor(curUrlIndex + 1));
    }
    const prev = curUrlIndex - 1 > 0;
    if (page_InIframe())
        return;
    if (next) {
        page_SendMessage("globalEvent", "HasNext");
        page_PrepareIframe("Next");
    }
    else {
        page_SendMessage("globalEvent", "NoNext");
    }
    if (prev) {
        page_SendMessage("globalEvent", "HasPrev");
        page_PrepareIframe("Prev");
    }
    else {
        page_SendMessage("globalEvent", "NoPrev");
    }
    if (info)
        page_SendMessage("sendVideoInfo", info);
}
function page_PrepareIframe(type) {
    setTimeout(() => page_CreateNextIframe(page_GetIndexUrlFor(curUrlIndex + (type == "Next" ? 1 : -1)), type), type == "Next" ? 500 : 1001);
}
function page_GetCurUrlIndex() {
    return parseInt(window.location.href.match(/watch\/.*?\/(\d+)/)[1]);
}
function page_GetIndexUrlFor(num) {
    return window.location.href.replace(/watch\/(.*?)\/\d+/, `watch/$1/${num}`);
}
function page_CheckValidUrl(url) {
    return new Promise(async (resolve, _) => {
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.onreadystatechange = () => {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                resolve(xmlhttp.responseText.includes("iframe"));
                return;
            }
        };
        xmlhttp.open("GET", url, false);
        xmlhttp.send();
    });
}
let cinemaMode = false;
function page_AddUtilityRow() {
    const pageTable = document.querySelector("#main table tbody");
    const controlBar = document.querySelector("#main table tbody tr:nth-child(4)");
    if (!pageTable || !controlBar)
        return;
    const newRow = document.createElement("tr");
    const newColumn = document.createElement("td");
    newColumn.setAttribute("colspan", "2");
    newColumn.setAttribute("align", "right");
    newRow.appendChild(newColumn);
    const innerColumn = document.createElement("div");
    innerColumn.classList.add("utility_row");
    newColumn.appendChild(innerColumn);
    const cinemaButton = document.createElement("div");
    cinemaButton.classList.add("cinema");
    cinemaButton.setAttribute("title", "Kinomodus");
    innerColumn.appendChild(cinemaButton);
    cinemaButton.addEventListener("click", () => {
        if (!cinemaMode)
            page_EnterCinemaMode();
        else
            page_LeaveCinemaMode();
        cinemaMode = !cinemaMode;
        page_SendMessage("setCinemaMode", cinemaMode);
    });
    page_GetSetting("download").then((state) => {
        if (!state)
            return;
        const downloadButton = document.createElement("div");
        downloadButton.classList.add("download");
        downloadButton.setAttribute("title", "Downloade diese Folge");
        innerColumn.appendChild(downloadButton);
        downloadButton.addEventListener("click", () => {
            page_RequestDownload();
        });
        const downloadButtonMulti = document.createElement("div");
        downloadButtonMulti.classList.add("download_multi");
        downloadButtonMulti.setAttribute("title", "Downloade alle Folgen ab dieser");
        innerColumn.appendChild(downloadButtonMulti);
        downloadButtonMulti.addEventListener("click", () => {
            page_RequestMassDownload();
        });
    });
    pageTable.insertBefore(newRow, controlBar);
}
function page_EnterCinemaMode() {
    const pageTable = document.querySelector("#main table tbody");
    const controlBar = document.querySelector("#main table tbody tr:nth-child(5)");
    const videoRow = document.querySelector("#main table tbody tr:nth-child(3)");
    if (!pageTable || !controlBar || !videoRow)
        return;
    const leftPadding = videoRow.querySelector("td:nth-child(1)");
    const videoFrame = videoRow.querySelector("td:nth-child(2) iframe");
    const rightPadding = videoRow.querySelector("td:nth-child(3)");
    leftPadding.style.display = "none";
    rightPadding.style.display = "none";
    videoFrame.classList.add("video_frame");
    const controlPrev = controlBar.querySelector("td:nth-child(1) a");
    const controlNext = controlBar.querySelector("td:nth-child(3) a");
    const controlCenter = controlBar.querySelector("td:nth-child(2)");
    const controlWatchlist = controlBar.querySelector("td:nth-child(2) a:first-child");
    controlCenter.insertBefore(controlPrev, controlWatchlist);
    controlCenter.appendChild(controlNext);
    controlCenter.classList.add("control_center_flex");
    const brElem = controlCenter.querySelector("br");
    const leftColumn = controlBar.querySelector("td:nth-child(3)");
    const rightColumn = controlBar.querySelector("td:nth-child(1)");
    brElem.style.display = "none";
    leftColumn.style.display = "none";
    rightColumn.style.display = "none";
}
function page_LeaveCinemaMode() {
    const pageTable = document.querySelector("#main table tbody");
    const controlBar = document.querySelector("#main table tbody tr:nth-child(5)");
    const videoRow = document.querySelector("#main table tbody tr:nth-child(3)");
    if (!pageTable || !controlBar || !videoRow)
        return;
    const leftPadding = videoRow.querySelector("td:nth-child(1)");
    const videoFrame = videoRow.querySelector("td:nth-child(2) iframe");
    const rightPadding = videoRow.querySelector("td:nth-child(3)");
    leftPadding.removeAttribute("style");
    rightPadding.removeAttribute("style");
    videoFrame.classList.remove("video_frame");
    const controlPrev = controlBar.querySelector("td:nth-child(2) a:nth-child(1)");
    const controlNext = controlBar.querySelector("td:nth-child(2) a:last-child");
    const controlCenter = controlBar.querySelector("td:nth-child(2)");
    controlCenter.classList.remove("control_center_flex");
    const brElem = controlCenter.querySelector("br");
    const leftColumn = controlBar.querySelector("td:nth-child(1)");
    const rightColumn = controlBar.querySelector("td:nth-child(3)");
    brElem.removeAttribute("style");
    leftColumn.removeAttribute("style");
    rightColumn.removeAttribute("style");
    leftColumn.appendChild(controlPrev);
    rightColumn.appendChild(controlNext);
}
function page_RequestDownload() {
    if (!info)
        return;
    page_SendMessage("download", {
        info,
        mass: false,
    });
}
async function page_RequestMassDownload() {
    if (!info)
        return;
    page_RequestDownload();
    const count = info.maxEpisode - info.episode;
    for (let index = 1; index <= count; index++) {
        const url = page_GetIndexUrlFor(curUrlIndex + index);
        const iframe = document.createElement("iframe");
        iframe.classList.add("TemporaryDownloadIFrame");
        iframe.setAttribute("src", url);
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.setAttribute("episode", `${info.episode + index}`);
        document.body.appendChild(iframe);
        iframe.addEventListener("load", () => {
            if (!info)
                return;
            page_SendMessage("updateStreamStatus", {
                status: "Download",
                name: info.name,
                episode: info.episode + index,
            });
        });
        await page_Wait(1000);
    }
}
function page_CreateNextIframe(url, type) {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("src", url);
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    document.body.appendChild(iframe);
    iframe === null || iframe === void 0 ? void 0 : iframe.addEventListener("load", () => {
        page_SendMessage("updateStreamStatus", Object.assign({ status: `Created_${type}` }, page_GetIdData()));
        setTimeout(() => {
            iframe.remove();
        }, 250);
    });
}
function page_GetIdData() {
    if (!info)
        return { name: window.location.href, episode: 0 };
    return { name: info.name, episode: info.episode };
}
function page_InIframe() {
    try {
        return window.self !== window.top;
    }
    catch (e) {
        return true;
    }
}
function page_RefreshUrl() {
    if (!info)
        return;
    const curUrl = window.location.href;
    const targetUrl = page_GetIndexUrlFor(info.episode);
    if (curUrl == targetUrl)
        return;
    page_GetSetting("autoRefresh").then((state) => {
        if (!state)
            return;
        window.location.href = targetUrl;
    });
}
function page_OldJump(type) {
    if (!info)
        return;
    const targetUrl = page_GetIndexUrlFor(info.episode + (type == "Next" ? 1 : -1));
    window.location.href = targetUrl;
}
/**
 * Open Details Page to get Anime info!!
 * @returns
 */
function page_OpenDetails() {
    const navBar = document.getElementById("simple-navi");
    if (!navBar)
        return;
    const detailsElement = navBar.querySelector("li:nth-child(2) a");
    if (!detailsElement)
        return;
    const link = detailsElement.href;
    const iframe = document.createElement("iframe");
    iframe.setAttribute("src", link);
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    document.body.appendChild(iframe);
    iframe === null || iframe === void 0 ? void 0 : iframe.addEventListener("load", () => {
        setTimeout(() => {
            iframe.remove();
        }, 250);
    });
}
function page_SendMessage(type, message) {
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
// Not listen is spawned iframes
if (!page_InIframe()) {
    chrome.runtime.onMessage.addListener(page_ReceiveMessge);
    function page_ReceiveMessge(request, _, sendResponse) {
        const fail = () => sendResponse({ status: "Error" });
        let answer;
        if (request.type == "globalEvent") {
            const event = request.message;
            if (event == "JumpNext") {
                curUrlIndex++;
                if (info)
                    info.episode++;
                page_CheckIndex();
            }
            if (event == "JumpPrev") {
                curUrlIndex--;
                if (info)
                    info.episode--;
                page_CheckIndex();
            }
            if (event == "ExitFullscreen") {
                page_RefreshUrl();
            }
            if (event == "MassDownloadDone") {
                const iframes = document.querySelectorAll(".TemporaryDownloadIFrame");
                for (const iframe of iframes) {
                    iframe.remove();
                }
            }
            if (event == "JumpNextOld")
                page_OldJump("Next");
            if (event == "JumpPrevOld")
                page_OldJump("Prev");
        }
        if (!answer) {
            sendResponse({ status: "NoData" });
        }
        else {
            sendResponse({ status: "OK", content: answer });
        }
    }
}
function page_Wait(time) {
    return new Promise((resolve, _) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
const page_SettingNames = [
    "autoNext",
    "autoPlay",
    "autoRefresh",
    "download",
];
function page_GetSetting(name) {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(page_SettingNames, (data) => {
            if (!data || data[name] == undefined)
                reject();
            resolve(data[name] === 1);
        });
    });
}
page_Init();
