

function OnStart() {
	const player = document.querySelector("iframe");
	if (player) {
		player.focus();
	}
}

function CheckNext() {
	const next = document.querySelector("#main table tbody tr:nth-child(4) td:nth-child(3) a");
	if (next && next.innerHTML.includes("Nächste")) {
		return true;
	}
	return false;
}

function CheckLast() {
	const last = document.querySelector("#main table tbody tr:nth-child(4) td:nth-child(1) a");
	if (last && last.innerHTML.includes("Vorherige")) {
		return true;
	}
	return false;
}

function MoveNext() {
	const next = document.querySelector("#main table tbody tr:nth-child(4) td:nth-child(3) a");
	if (next) {
		window.location.href = next.href;
	}
}

function MoveLast() {
	const last = document.querySelector("#main table tbody tr:nth-child(4) td:nth-child(1) a");
	if (last) {
		window.location.href = last.href;
	}
}

function SendMessage(type, message) {
	chrome.runtime.sendMessage(
		{
			type: type,
			message: message || "",
		},
		response => {
		}
	);
}

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "check-next") {
		if (CheckNext()) {
			SendMessage("is-next");
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
});

OnStart();