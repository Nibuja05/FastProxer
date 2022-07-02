function OnStart() {
	const player = document.querySelector("iframe");
	if (player) {
		player.focus();
		player.contentWindow.focus();
	}
}

function CheckNext() {
	const next = document.querySelector(
		"#main table tbody tr:nth-child(4) td:nth-child(3) a"
	);
	if (next && next.innerHTML.includes("Nächste")) {
		return true;
	}
	return false;
}

function CheckLast() {
	const last = document.querySelector(
		"#main table tbody tr:nth-child(4) td:nth-child(1) a"
	);
	if (last && last.innerHTML.includes("Vorherige")) {
		return true;
	}
	return false;
}

function MoveNext() {
	const next = document.querySelector(
		"#main table tbody tr:nth-child(4) td:nth-child(3) a"
	);
	if (next) {
		window.location.href = next.href;
	}
}

function MoveLast() {
	const last = document.querySelector(
		"#main table tbody tr:nth-child(4) td:nth-child(1) a"
	);
	if (last) {
		window.location.href = last.href;
	}
}

function GetInfo() {
	const container = document.querySelector("#wContainer");
	const name = container.querySelector(".wName");
	const language = container.querySelector(".wLanguage");
	const episode = container.querySelector(".wEp");
	const maxEpisode = GetNextChild(episode);

	return {
		name: name ? name.innerHTML : undefined,
		language: language ? language.innerHTML : undefined,
		episode: episode ? episode.innerHTML : undefined,
		maxEpisode: maxEpisode ? ExtractNumber(maxEpisode) : undefined,
	};
}

function ExtractNumber(textNode) {
	if (textNode.nodeType != 3) return;
	const match = textNode.nodeValue.match(/\d+/);
	if (!match) return;
	return match[0];
}

function GetNextChild(element) {
	const parent = element.parentElement;
	let isNext = false;
	for (child of parent.childNodes) {
		if (isNext) return child;
		if (child == element) isNext = true;
	}
}

function SendMessage(type, message) {
	chrome.runtime.sendMessage(
		{
			type: type,
			message: message || "",
		},
		(response) => {}
	);
}

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "check-next") {
		if (CheckNext()) {
			SendMessage("is-next");
		} else {
			SendMessage("no-next");
		}
	}
	if (request.type === "check-prev") {
		if (CheckLast()) {
			SendMessage("is-prev");
		}
	}
	if (request.type === "next") {
		MoveNext();
	}
	if (request.type === "prev") {
		MoveLast();
	}
	if (request.type === "get-info") {
		const info = GetInfo();
		SendMessage("send-info", info);
	}
});

OnStart();
