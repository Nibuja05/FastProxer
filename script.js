
let fullscreen = false;

function OnFullScreenChange(event) {
	fullscreen = !fullscreen;
	SendMessage("set-max", fullscreen);
}

document.addEventListener("fullscreenchange", OnFullScreenChange, false);
document.addEventListener("webkitfullscreenchange", OnFullScreenChange, false);
document.addEventListener("mozfullscreenchange", OnFullScreenChange, false);

let nextButton = undefined;

function AddNextButton() {
	let player = document.getElementById("plyr").parentElement.parentElement;
	let button = document.createElement("div");
	button.setAttribute("id", "ControlButton");
	button.classList.add("Next");
	button.classList.add("hidden");
	player.appendChild(button);

	let buttonText = document.createElement("span");
	buttonText.innerHTML = "Next";
	button.appendChild(buttonText);

	button.addEventListener("click", event => {
		SendMessage("next");
	});

	nextButton = button;
}

let lastButton = undefined;

function AddPrevButton() {
	let player = document.getElementById("plyr").parentElement.parentElement;
	let button = document.createElement("div");
	button.setAttribute("id", "ControlButton");
	button.classList.add("Prev");
	button.classList.add("hidden");
	button.innerHTML = "Prev";
	player.appendChild(button);

	button.addEventListener("click", event => {
		SendMessage("prev");
	});

	lastButton = button;
}

function GetVideoProgress() {
	const slider = document.querySelector("input[data-plyr='seek']");
	if (slider) {
		const style = getComputedStyle(slider);
		const progress = style.getPropertyValue("--value");
		return parseFloat(progress.slice(0, progress.length - 1));
	}
}

function SetVideoProgress(progress) {
	if (isNaN(progress)) return;
	if (progress > 96) return;
	const video = document.querySelector("video");
	if (video) {
		let checkInterval = setInterval(() => {
			if (isNaN(video.duration)) return;
			clearInterval(checkInterval);

			const duration = video.duration;
			const time = duration * (progress/100);
			video.currentTime = time - 5;
		}, 100);
	}
}

skipTimeout = undefined;

async function StartVideoSkip() {
	let allowed = await GetSetting("autonext");
	if (!allowed) return;

	if (!nextButton) return;
	if (skipTimeout) return;
	skipTimeout = true;

	nextButton.classList.remove("hidden");

	const inner = nextButton.innerHTML;

	const buttonBack = document.createElement("div");
	buttonBack.classList.add("ControlButtonBack");

	setTimeout(() => {
		buttonBack.classList.add("started");
	}, 10);

	nextButton.insertBefore(buttonBack, nextButton.childNodes[0]);

	skipTimeout = setTimeout(() => {
		skipTimeout = undefined;
		let progress = GetVideoProgress();
		if (progress < 100) {
			buttonBack.classList.remove("started");
			RestartChecks();
			return;
		}
		SendMessage("next");
	}, 5000);
}

async function Maximize() {
	let allowed = await GetSetting("fullscreen");
	if (!allowed) return;

	const maxButton = document.querySelector(".plyr__controls button[data-plyr='fullscreen']");
	setTimeout(() => {
		maxButton.click();
	}, 10);
}

async function Play() {
	let allowed = await GetSetting("autoplay");
	if (!allowed) return;

	const playButton = document.querySelector(".plyr__poster");
	setTimeout(() => {
		playButton.click();
	}, 10);
}

let timeout = undefined;
let still = true;

function OnMouseMove() {
	if (timeout) clearTimeout(timeout);
	OnMouseMoveAgain();
	timeout = setTimeout(() => {
		OnMouseStill();
	}, 2000);
}

function OnMouseStill() {
	still = true;
	if (skipTimeout) return;
	if (nextButton) nextButton.classList.add("hidden");
	if (lastButton) lastButton.classList.add("hidden");
}

function OnMouseMoveAgain() {
	still = false;
	if (nextButton) nextButton.classList.remove("hidden");
	if (lastButton) lastButton.classList.remove("hidden");
}

function OnStart() {
	const videoObj = document.querySelector("body > div > div:nth-child(3)");
	if (videoObj) {
		videoObj.focus();
	}

	SendMessage("check-next");
	SendMessage("check-prev");
	SendMessage("check-max");
	SendMessage("check-play");
	SendMessage("get-progress");

	document.onmousemove = (event) => {
		OnMouseMove();
	};
	let skipInterval = setInterval(() => {
		let progress = GetVideoProgress();
		if (progress > 99.7) {
			StartVideoSkip();
			clearInterval(skipInterval);
		}
	}, 500);
	window.addEventListener('beforeunload', function (e) {
		let progress = GetVideoProgress();
		SaveVideoTime(progress);
	});
}

function RestartChecks() {
	let skipInterval = setInterval(() => {
		let progress = GetVideoProgress();
		if (progress > 99.7) {
			StartVideoSkip();
			clearInterval(skipInterval);
		}
	}, 500);
}

function SaveVideoTime(progress) {
	SendMessage("save-progress", progress);
}

function SendMessage(type, message) {
	chrome.runtime.sendMessage(
		{
			type: type,
			message: message || "",
		},
		response => {}
	);
}

chrome.extension.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "is-next") {
		AddNextButton();
	}
	if (request.type === "is-prev") {
		AddPrevButton();
	}
	if (request.type === "max") {
		Maximize();
	}
	if (request.type === "play") {
		Play();
	}
	if (request.type === "set-progress") {
		SetVideoProgress(parseFloat(request.message));
	}
});

let defaultSettings = {
	fullscreen: 1,
	progress: 1,
	autonext: 1,
	autoplay: 1,
}

function GetSetting(name) {
	return new Promise((resolve, reject) => {
		chrome.storage.sync.get(defaultSettings, (data) => {
			const settings = data;
			if (!settings || !settings[name]) resolve(false);
			resolve(settings[name] === 1);
		});
	});
}

OnStart();