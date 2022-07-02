let settings = {
	fullscreen: 1,
	progress: 1,
	autonext: 1,
	autoplay: 1,
	download: 0,
	downloadPattern: "<Name> (<Lang>) - <Ep[2]>",
	staffelNr: 1,
};
settingNames = ["progress", "fullscreen", "autonext", "autoplay", "download"];
extraSettingNames = ["downloadPattern", "staffelNr"];

function CheckboxChange(element, name) {
	SaveSettings(name, element.checked ? 1 : 0);
	if (extraMap.has(name)) {
		extraMap.get(name).classList.toggle("Hidden", !element.checked);
	}
}

function CheckExtraChange(element, name, value) {
	SaveSettings(name, value, 500);
	if (name == "downloadPattern") {
		if (value.match(/\<Se(\[\d+\])?\>/)) {
			element.classList.add("ShowOptContent");
		} else {
			element.classList.remove("ShowOptContent");
		}
	}
}

let saveTimeout;
function SaveSettings(name, value, timeout = 0) {
	settings[name] = value;
	if (saveTimeout) {
		clearTimeout(saveTimeout);
		saveTimeout = undefined;
	}
	if (timeout == 0) {
		FinalizeSaveSettings();
		return;
	}
	saveTimeout = setTimeout(FinalizeSaveSettings, timeout);
}

function FinalizeSaveSettings() {
	saveTimeout = undefined;
	chrome.storage.sync.set(settings);
	document.body.classList.add("saved");
	setTimeout(() => {
		document.body.classList.remove("saved");
	}, 10);
}

function GetCheckboxDefault(name) {
	return settings[name] === 1;
}

function GetCurSetting(name) {
	return settings[name];
}

function FetchSettings() {
	chrome.storage.sync.get(settings, (data) => {
		settings = data;
		OnStart();
	});
}

let extraMap = new Map();
function OnStart() {
	for (const name of settingNames) {
		const elem = document.getElementById(name);
		elem.checked = GetCheckboxDefault(name);
		elem.addEventListener("change", () => {
			CheckboxChange(elem, name);
		});
	}
	const settingsContainer = document.getElementById("PopupSettings");
	if (!settingsContainer) return;
	for (const child of settingsContainer.querySelectorAll(
		".PopupSettingsEntryExtra"
	)) {
		const linkedId = child.getAttribute("linkedId");
		if (!linkedId) continue;
		if (GetCheckboxDefault(linkedId)) child.classList.remove("Hidden");
		extraMap.set(linkedId, child);
		const textFields = child.querySelectorAll("input");
		if (!textFields) continue;
		for (const textField of textFields) {
			const fieldId = textField.getAttribute("id");
			textField.value = GetCurSetting(fieldId);
			textField.addEventListener("input", (event) => {
				CheckExtraChange(child, fieldId, event.target.value);
			});

			if (fieldId == "downloadPattern") {
				if (textField.value.match(/\<Se(\[\d+\])?\>/)) {
					child.classList.add("ShowOptContent");
				} else {
					child.classList.remove("ShowOptContent");
				}
			}
		}
	}
}

window.onload = () => {
	FetchSettings();
};
