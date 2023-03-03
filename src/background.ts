async function bg_Download(url: string, info: VideoInfo) {
	let pattern = await bg_GetSetting("downloadPattern");
	pattern = pattern.replace(/\<Name\>/, info.name ?? "");
	pattern = pattern.replace(/\<Lang\>/, info.language ?? "");
	const epMatch = pattern.match(/\<Ep(?:\[(\d+)\])?\>/);
	if (epMatch) {
		if (epMatch[1]) {
			const episode = bg_FormatNumber(info.episode, parseInt(epMatch[1]));
			pattern = pattern.replace(epMatch[0], episode);
		}
	}
	const maxEpMatch = pattern.match(/\<MaxEp(?:\[(\d+)\])?\>/);
	if (maxEpMatch) {
		if (maxEpMatch[1]) {
			const maxEpisode = bg_FormatNumber(info.maxEpisode, parseInt(maxEpMatch[1]));
			pattern = pattern.replace(maxEpMatch[0], maxEpisode);
		}
	}
	const seMatch = pattern.match(/\<Se(?:\[(\d+)\])?\>/);
	if (seMatch) {
		if (seMatch[1]) {
			const staffelNr = parseInt(await bg_GetSetting("staffelNr"));
			const staffel = bg_FormatNumber(staffelNr, parseInt(seMatch[1]));
			pattern = pattern.replace(seMatch[0], staffel);
		}
	}

	const filename = pattern + ".mp4";
	chrome.downloads.download({
		url: url,
		filename,
	});
}

function bg_FormatNumber(num: number, size: number) {
	let numStr = num.toString();
	while (numStr.length < size) numStr = "0" + numStr;
	return numStr;
}

const bg_SettingNames: (keyof GlobalSettings)[] = ["downloadPattern", "staffelNr"];
function bg_GetSetting(name: keyof GlobalSettings): Promise<string> {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get(bg_SettingNames, (data) => {
			if (!data || !data[name]) resolve("");
			resolve(data[name]);
		});
	});
}

function bg_SendMessage<
	MName extends keyof MessageDeclarations,
	M extends MessageDeclarations[MName]
>(type: MName, message: M[0]): Promise<MessageCallback<MName>> {
	return new Promise((resolve, reject) => {
		chrome.tabs.getSelected(function (tab) {
			if (!tab) return;
			chrome.tabs.sendMessage(
				tab.id!,
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
	});
}

function bg_PrepareTimestamps(name: string) {
	chrome.storage.local.get("timestamps", async (rawData) => {
		let data = rawData.timestamps as SavedTimestampData;

		if (!data) data = {};
		if (!data[name]) {
			const answer = await bg_TimestampRequest(name);
			const showData = answer.data.searchShows[0];
			if (name != showData.name) return;
			const episodes: SavedTimestampData[string] = {};
			showData.episodes.forEach((episode) => {
				const num = episode.number
					? parseInt(episode.number)
					: episode.absoluteNumber
					? parseInt(episode.absoluteNumber)
					: -1;
				if (num == -1) return;
				const timeStamps: TimeStamp[] = [];
				for (const timeStamp of episode.timestamps) {
					timeStamps.push({
						type: timeStamp.type.name,
						at: timeStamp.at,
					});
				}
				if (timeStamps.length <= 2) return;
				episodes[num] = {
					name: episode.name,
					season: episode.season ? parseInt(episode.season) : 0,
					timeStamps,
				};
			});
			data[name] = episodes;
			await chrome.storage.local.set({
				timestamps: data,
			});
		}
	});
}

function bg_GetTimestampInfo(info: {
	name: string;
	episode: number;
}): Promise<TimeStamp[] | undefined> {
	return new Promise((resolve) => {
		chrome.storage.local.get("timestamps", async (rawData) => {
			let data = rawData.timestamps as SavedTimestampData;
			if (!data) return resolve(undefined);
			if (!data[info.name]) return resolve(undefined);
			if (!data[info.name][info.episode]) return resolve(undefined);
			resolve(data[info.name][info.episode].timeStamps);
		});
	});
}

function bg_TimestampRequest(name: string): Promise<RawTimestampResultData> {
	return new Promise(async (resolve, reject) => {
		const url = "https://api.anime-skip.com/graphql";

		const data = JSON.stringify({
			query: `{searchShows(search:"${name}",limit:5){id name episodeCount episodes{name number absoluteNumber season timestamps{type{name}at}}}}`,
		});

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"x-client-id": "mGgCneNyvy4sKBTY1zZucUX1aGIcaTwi",
				"Content-Type": "application/json",
			},
			body: data,
		});

		response
			.text()
			.then((answer) => {
				resolve(JSON.parse(answer));
			})
			.catch((err) => {
				reject(err);
			});
	});
}

let savedVideoInfo: VideoInfo | undefined;
let savedProgress: Map<string, number> = new Map();
let globalCinemaMode = false;

chrome.runtime.onMessage.addListener(bg_ReceiveMessge);
function bg_ReceiveMessge<MName extends keyof MessageDeclarations>(
	request: {
		message: any;
		type: MName;
	},
	_: chrome.runtime.MessageSender,
	sendResponse: (answer: MessageCallbackRaw<MName>) => void
) {
	const fail = () => sendResponse({ status: "Error" });
	let answer: any;

	if (request.type == "saveProgress") {
		const info = request.message as MessageInfo<"saveProgress">;
		savedProgress.set(info.id, info.time);
	}
	if (request.type == "streamLoaded") {
		answer = {
			savedTime: savedProgress.has(request.message),
			time: savedProgress.get(request.message),
		};
	}
	if (request.type == "download") {
		if (!request.message.mass) {
			const info: VideoInfo = request.message.info;
			savedVideoInfo = info;
			bg_SendMessage("getVideoUrl", {
				name: info.name,
				episode: info.episode,
			});
			answer = true;
		}
	}
	if (request.type == "getVideoUrl_reply") {
		if (savedVideoInfo) bg_Download(request.message, savedVideoInfo);
	}
	if (request.type == "massDownload") {
		const data: MessageInfo<"massDownload"> = request.message;
		if (savedVideoInfo && data.name == savedVideoInfo.name) {
			bg_Download(data.url, { ...savedVideoInfo, episode: data.episode });
			if (data.episode == savedVideoInfo.maxEpisode)
				bg_SendMessage("globalEvent", "MassDownloadDone");
		}
	}
	if (request.type == "setCinemaMode") {
		globalCinemaMode = request.message;
	}
	if (request.type == "getCinemaMode") {
		answer = globalCinemaMode;
	}
	if (request.type == "prepareTimestamps") {
		bg_PrepareTimestamps(request.message.name);
	}
	if (request.type == "requestTimestamps") {
		bg_GetTimestampInfo(request.message).then((stamps) => {
			if (stamps) bg_SendMessage("sendTimestamps", stamps);
		});
	}

	// Just relay the messages back.
	bg_SendMessage(request.type, request.message);

	if (!answer) {
		sendResponse({ status: "NoData" });
	} else {
		sendResponse({ status: "OK", content: answer });
	}
}
