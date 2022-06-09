async function SaveProgress(progress) {
	let allowed = await GetSetting("progress");
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
	let allowed = await GetSetting("progress");
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
	const name = `${info.name} (${info.language}) - ${info.episode}.mp4`;
	chrome.downloads.download({
		url: videoUrl,
		filename: name,
	});
	videoUrl = undefined;
}

maximized = false;
startPlay = false;
timeout = undefined;

videoUrl = undefined;

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
	if (request.type === "send-info") {
		if (videoUrl) DownloadVideo(request.message);
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
	fullscreen: 1,
	progress: 1,
	autonext: 1,
	autoplay: 1,
};

function GetSetting(name) {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get(defaultSettings, (data) => {
			const settings = data;
			if (!settings || !settings[name]) resolve(false);
			resolve(settings[name] === 1);
		});
	});
}
