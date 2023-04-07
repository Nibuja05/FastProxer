let curUrlIndex = 0;
let info: VideoInfo | undefined = undefined;

async function page_Init() {
	curUrlIndex = page_GetCurUrlIndex();
	page_GetVideoInfo();
	let next = false;
	if (info) {
		next = curUrlIndex == info.episode && curUrlIndex + 1 <= info.maxEpisode;
	} else {
		await page_CheckValidUrl(page_GetIndexUrlFor(curUrlIndex + 1));
	}
	const prev = curUrlIndex - 1 > 0;
	const iframe = document.querySelector("iframe");
	if (!page_InIframe()) {
		if (next || prev) {
			iframe?.addEventListener("load", () => {
				page_SendMessage("updateStreamStatus", {
					status: "Original",
					...page_GetIdData(),
				});
				page_CheckIndex();
			});
		}
		if (info) page_SendMessage("prepareTimestamps", info);
		page_AddUtilityRow();
		page_SendMessage("getCinemaMode", undefined).then((answer) => {
			if (answer.status != "OK") return;
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
	const name = container?.querySelector(".wName");
	const language = container?.querySelector(".wLanguage");
	const episode = container?.querySelector(".wEp");
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

function page_ExtractMaxEpisodeNumber(textNode: Node) {
	if (textNode.nodeType != Node.TEXT_NODE) return;
	const match = textNode.nodeValue?.match(/\d+/);
	if (!match) return;
	return parseInt(match[0]);
}

function page_GetNextChild(element?: Element | null) {
	if (!element) return;
	const parent = element.parentElement;
	if (!parent) return;
	let isNext = false;
	for (const child of parent.childNodes) {
		if (isNext) return child;
		if (child == element) isNext = true;
	}
}

async function page_CheckIndex() {
	let next = false;
	if (info) {
		next = curUrlIndex == info.episode && curUrlIndex + 1 <= info.maxEpisode;
	} else {
		await page_CheckValidUrl(page_GetIndexUrlFor(curUrlIndex + 1));
	}
	const prev = curUrlIndex - 1 > 0;

	if (page_InIframe()) return;
	if (next) {
		page_SendMessage("globalEvent", "HasNext");
		page_PrepareIframe("Next");
	} else {
		page_SendMessage("globalEvent", "NoNext");
	}
	if (prev) {
		page_SendMessage("globalEvent", "HasPrev");
		page_PrepareIframe("Prev");
	} else {
		page_SendMessage("globalEvent", "NoPrev");
	}
	if (info) page_SendMessage("sendVideoInfo", info);
}

function page_PrepareIframe(type: "Next" | "Prev") {
	setTimeout(
		() =>
			page_CreateNextIframe(
				page_GetIndexUrlFor(curUrlIndex + (type == "Next" ? 1 : -1)),
				type
			),
		type == "Next" ? 500 : 1001
	);
}

function page_GetCurUrlIndex() {
	return parseInt(window.location.href.match(/watch\/.*?\/(\d+)/)![1]);
}

function page_GetIndexUrlFor(num: number) {
	return window.location.href.replace(/watch\/(.*?)\/\d+/, `watch/$1/${num}`);
}

function page_CheckValidUrl(url: string): Promise<boolean> {
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
	if (!pageTable || !controlBar) return;

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
		if (!cinemaMode) page_EnterCinemaMode();
		else page_LeaveCinemaMode();
		cinemaMode = !cinemaMode;
		page_SendMessage("setCinemaMode", cinemaMode);
	});

	page_GetSetting("download").then((state) => {
		if (!state) return;
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
	if (!pageTable || !controlBar || !videoRow) return;

	const leftPadding = videoRow.querySelector("td:nth-child(1)") as HTMLElement;
	const videoFrame = videoRow.querySelector("td:nth-child(2) iframe") as HTMLElement;
	const rightPadding = videoRow.querySelector("td:nth-child(3)") as HTMLElement;
	leftPadding.style.display = "none";
	rightPadding.style.display = "none";
	videoFrame.classList.add("video_frame");

	const controlPrev = controlBar.querySelector("td:nth-child(1) a")!;
	const controlNext = controlBar.querySelector("td:nth-child(3) a")!;
	const controlCenter = controlBar.querySelector("td:nth-child(2)")!;
	const controlWatchlist = controlBar.querySelector("td:nth-child(2) a:first-child")!;
	controlCenter.insertBefore(controlPrev, controlWatchlist);
	controlCenter.appendChild(controlNext);
	controlCenter.classList.add("control_center_flex");

	const brElem = controlCenter.querySelector("br") as HTMLElement;
	const leftColumn = controlBar.querySelector("td:nth-child(3)") as HTMLElement;
	const rightColumn = controlBar.querySelector("td:nth-child(1)") as HTMLElement;
	brElem.style.display = "none";
	leftColumn.style.display = "none";
	rightColumn.style.display = "none";
}

function page_LeaveCinemaMode() {
	const pageTable = document.querySelector("#main table tbody");
	const controlBar = document.querySelector("#main table tbody tr:nth-child(5)");
	const videoRow = document.querySelector("#main table tbody tr:nth-child(3)");
	if (!pageTable || !controlBar || !videoRow) return;

	const leftPadding = videoRow.querySelector("td:nth-child(1)") as HTMLElement;
	const videoFrame = videoRow.querySelector("td:nth-child(2) iframe") as HTMLElement;
	const rightPadding = videoRow.querySelector("td:nth-child(3)") as HTMLElement;
	leftPadding.removeAttribute("style");
	rightPadding.removeAttribute("style");
	videoFrame.classList.remove("video_frame");

	const controlPrev = controlBar.querySelector("td:nth-child(2) a:nth-child(1)")!;
	const controlNext = controlBar.querySelector("td:nth-child(2) a:last-child")!;
	const controlCenter = controlBar.querySelector("td:nth-child(2)")!;
	controlCenter.classList.remove("control_center_flex");

	const brElem = controlCenter.querySelector("br") as HTMLElement;
	const leftColumn = controlBar.querySelector("td:nth-child(1)") as HTMLElement;
	const rightColumn = controlBar.querySelector("td:nth-child(3)") as HTMLElement;
	brElem.removeAttribute("style");
	leftColumn.removeAttribute("style");
	rightColumn.removeAttribute("style");

	leftColumn.appendChild(controlPrev);
	rightColumn.appendChild(controlNext);
}

function page_RequestDownload() {
	if (!info) return;
	page_SendMessage("download", {
		info,
		mass: false,
	});
}

async function page_RequestMassDownload() {
	if (!info) return;
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
			if (!info) return;
			page_SendMessage("updateStreamStatus", {
				status: "Download",
				name: info.name,
				episode: info.episode + index,
			});
		});
		await page_Wait(1000);
	}
}

function page_CreateNextIframe(url: string, type: "Next" | "Prev") {
	const iframe = document.createElement("iframe");
	iframe.setAttribute("src", url);
	iframe.style.width = "0px";
	iframe.style.height = "0px";
	document.body.appendChild(iframe);
	iframe?.addEventListener("load", () => {
		page_SendMessage("updateStreamStatus", {
			status: `Created_${type}`,
			...page_GetIdData(),
		});
		setTimeout(() => {
			iframe.remove();
		}, 250);
	});
}

function page_GetIdData(): { name: string; episode: number } {
	if (!info) return { name: window.location.href, episode: 0 };
	return { name: info.name, episode: info.episode };
}

function page_InIframe() {
	try {
		return window.self !== window.top;
	} catch (e) {
		return true;
	}
}

function page_RefreshUrl() {
	if (!info) return;
	const curUrl = window.location.href;
	const targetUrl = page_GetIndexUrlFor(info.episode);
	if (curUrl == targetUrl) return;
	page_GetSetting("autoRefresh").then((state) => {
		if (!state) return;
		window.location.href = targetUrl;
	});
}

function page_OldJump(type: "Next" | "Prev") {
	if (!info) return;
	const targetUrl = page_GetIndexUrlFor(info.episode + (type == "Next" ? 1 : -1));
	window.location.href = targetUrl;
}

/**
 * Open Details Page to get Anime info!!
 * @returns
 */
function page_OpenDetails() {
	const navBar = document.getElementById("simple-navi");
	if (!navBar) return;
	const detailsElement = navBar.querySelector("li:nth-child(2) a") as HTMLLinkElement;
	if (!detailsElement) return;
	const link = detailsElement.href;

	const iframe = document.createElement("iframe");
	iframe.setAttribute("src", link);
	iframe.style.width = "0px";
	iframe.style.height = "0px";
	document.body.appendChild(iframe);
	iframe?.addEventListener("load", () => {
		setTimeout(() => {
			iframe.remove();
		}, 250);
	});
}

function page_SendMessage<
	MName extends keyof MessageDeclarations,
	M extends MessageDeclarations[MName]
>(type: MName, message: M[0]): Promise<MessageCallback<MName>> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{
				type: type,
				message: message || "",
			},
			(response: MessageCallbackRaw<MName> | undefined) => {
				if (response && response.status != "Error") {
					resolve(response);
				} else reject();
			}
		);
	});
}

// Not listen is spawned iframes
if (!page_InIframe()) {
	chrome.runtime.onMessage.addListener(page_ReceiveMessge);
	function page_ReceiveMessge<MName extends keyof MessageDeclarations>(
		request: {
			message: any;
			type: MName;
		},
		_: chrome.runtime.MessageSender,
		sendResponse: (answer: MessageCallbackRaw<MName>) => void
	) {
		const fail = () => sendResponse({ status: "Error" });
		let answer: any;

		if (request.type == "globalEvent") {
			const event = request.message as GlobalEvent;
			if (event == "JumpNext") {
				curUrlIndex++;
				if (info) info.episode++;
				page_CheckIndex();
			}
			if (event == "JumpPrev") {
				curUrlIndex--;
				if (info) info.episode--;
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
			if (event == "JumpNextOld") page_OldJump("Next");
			if (event == "JumpPrevOld") page_OldJump("Prev");
		}

		if (!answer) {
			sendResponse({ status: "NoData" });
		} else {
			sendResponse({ status: "OK", content: answer });
		}
	}
}

function page_Wait(time: number): Promise<void> {
	return new Promise((resolve, _) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}

const page_SettingNames: (keyof GlobalSettings)[] = [
	"autoNext",
	"autoPlay",
	"autoRefresh",
	"download",
];

function page_GetSetting(name: keyof GlobalSettings): Promise<boolean> {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get(page_SettingNames, (data) => {
			if (!data || data[name] == undefined) reject();
			resolve(data[name] === 1);
		});
	});
}

page_Init();
