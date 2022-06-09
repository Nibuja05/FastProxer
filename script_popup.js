let settings = {
	fullscreen: 1,
	progress: 1,
	autonext: 1,
	autoplay: 1,
	download: 0,
};
settingNames = ["progress", "fullscreen", "autonext", "autoplay", "download"];

function CheckboxChange(element, name) {
	SaveSettings(name, element.checked ? 1 : 0);
}

function SaveSettings(name, state) {
	settings[name] = state;
	chrome.storage.sync.set(settings);
	document.body.classList.add("saved");
	setTimeout(() => {
		document.body.classList.remove("saved");
	}, 10);
}

function GetCheckboxDefault(name) {
	return settings[name] === 1;
}

function FetchSettings() {
	chrome.storage.sync.get(settings, (data) => {
		settings = data;
		OnStart();
	});
}

function OnStart() {
	for (const name of settingNames) {
		const elem = document.getElementById(name);
		elem.checked = GetCheckboxDefault(name);
		elem.addEventListener("change", () => {
			CheckboxChange(elem, name);
		});
	}
}

window.onload = () => {
	FetchSettings();
};
