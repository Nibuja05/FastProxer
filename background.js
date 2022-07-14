async function SaveProgress(progress) {
	let allowed = await GetBoolSetting("progress");
	if (!allowed) return;
	chrome.tabs.query(
		{
			currentWindow: true,
			active: true,
		},
		function (tab) {
			chrome.cookies.set({
				name: "FastProxer_VideoList",
				url: tab[0].url,
				value: "" + progress,
			});
		}
	);
}

async function GetProgress() {
	let allowed = await GetBoolSetting("progress");
	if (!allowed) return;
	chrome.tabs.query(
		{
			currentWindow: true,
			active: true,
		},
		function (tab) {
			chrome.cookies.get(
				{
					name: "FastProxer_VideoList",
					url: tab[0].url,
				},
				(cookie) => {
					if (!cookie) return;
					SendMessage("set-progress", cookie.value);
				}
			);
		}
	);
}

function DownloadVideo(info) {
	return new Promise(async (resolve, reject) => {
		let pattern = await GetSetting("downloadPattern");
		pattern = pattern.replace(/\<Name\>/, info.name ?? "");
		pattern = pattern.replace(/\<Lang\>/, info.language ?? "");
		const epMatch = pattern.match(/\<Ep(?:\[(\d+)\])?\>/);
		if (epMatch) {
			let episode = info.episode ?? "";
			if (epMatch[1]) {
				episode = FormatNumber(episode, parseInt(epMatch[1]));
			}
			pattern = pattern.replace(epMatch[0], episode);
		}
		const maxEpMatch = pattern.match(/\<MaxEp(?:\[(\d+)\])?\>/);
		if (maxEpMatch) {
			let maxEpisode = info.maxEpisode ?? "";
			if (maxEpMatch[1]) {
				maxEpisode = FormatNumber(maxEpisode, parseInt(maxEpMatch[1]));
			}
			pattern = pattern.replace(maxEpMatch[0], maxEpisode);
		}
		const seMatch = pattern.match(/\<Se(?:\[(\d+)\])?\>/);
		if (seMatch) {
			let staffel = (await GetSetting("staffelNr")) ?? "";
			if (seMatch[1]) {
				staffel = FormatNumber(staffel, parseInt(seMatch[1]));
			}
			pattern = pattern.replace(seMatch[0], staffel);
		}

		const name = pattern + ".mp4";
		await chrome.downloads.download({
			url: videoUrl,
			filename: name,
		});
		videoUrl = undefined;
		resolve();
	});
}

function FormatNumber(num, size) {
	num = num.toString();
	while (num.length < size) num = "0" + num;
	return num;
}

maximized = false;
startPlay = false;
timeout = undefined;

videoUrl = undefined;
massDownload = false;
lastDownloadName = undefined;

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
	sendResponse({ status: "OK" });
	if (request.type === "set-max") {
		maximized = request.message;
		return;
	}
	if (request.type === "check-max") {
		if (maximized) {
			SendMessage("max");
		}
		return;
	}
	if (request.type === "check-play") {
		if (startPlay) {
			SendMessage("play");
		}
		return;
	}
	if (request.type === "save-progress") {
		SaveProgress(request.message);
		return;
	}
	if (request.type === "get-progress") {
		GetProgress();
		return;
	}
	if (request.type == "next" || request.type == "prev") {
		startPlay = true;
		if (timeout) clearTimeout(timeout);
		setTimeout(() => {
			startPlay = false;
		}, 5000);
	}
	if (request.type == "download") {
		videoUrl = request.message;
		SendMessage("get-info");
	}
	if (request.type == "massDownload") {
		massDownload = true;
		videoUrl = request.message;
		SendMessage("get-info");
	}
	if (request.type === "send-info") {
		if (videoUrl) {
			const info = request.message;
			DownloadVideo(info).then(() => {
				if (massDownload) {
					if (
						lastDownloadName == undefined ||
						lastDownloadName == info.name
					)
						SendMessage("next");
				}
			});
			lastDownloadName = info.name;
		}
	}
	if (request.type === "is-next-download") {
		if (!massDownload) return;
		SendMessage("next-download");
	}
	if (request.type === "no-next") {
		if (!massDownload) return;
		SendMessage("next-download");
		massDownload = false;
	}
	SendMessage(request.type);
});

function SendMessage(type, message) {
	chrome.tabs.getSelected(null, function (tab) {
		if (!tab) return;
		chrome.tabs.sendMessage(tab.id, {
			type: type,
			message: message,
		});
	});
}

let defaultSettings = {
	progress: 1,
	downloadPattern: "<Name> (<Lang>) - <Ep[2]>",
	staffelNr: 1,
};

function GetBoolSetting(name) {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get(defaultSettings, (data) => {
			const settings = data;
			if (!settings || !settings[name]) resolve(false);
			resolve(settings[name] === 1);
		});
	});
}

function GetSetting(name) {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get(defaultSettings, (data) => {
			const settings = data;
			if (!settings || !settings[name]) resolve(false);
			resolve(settings[name]);
		});
	});
}
