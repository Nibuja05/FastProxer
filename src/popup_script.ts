let settings: GlobalSettings = {
	autoNext: 1,
	autoPlay: 0,
	autoRefresh: 1,
	download: 1,
	downloadPattern: "<Name> (<Lang>) - <Ep[2]>",
	staffelNr: 1,
	hotkeys: {
		next: "n",
		prev: "p",
		cancel: "x",
	},
};
const settingNames: (keyof GlobalSettings)[] = ["autoNext", "autoPlay", "autoRefresh", "download"];

const extraMap = new Map();
function popup_Init() {
	for (const name of settingNames) {
		const elem = document.getElementById(name) as HTMLInputElement;
		if (!elem) continue;
		elem.checked = settings[name] == 1;
		elem.addEventListener("change", () => {
			popup_CheckboxChange(elem, name);
		});
	}
	const settingsContainer = document.getElementById("PopupSettings");
	if (!settingsContainer) return;
	for (const child of settingsContainer.querySelectorAll(".PopupSettingsEntryExtra")) {
		const linkedId = child.getAttribute("linkedId") as keyof GlobalSettings;
		if (!linkedId) continue;
		if (settings[linkedId] == 1) child.classList.remove("Hidden");
		extraMap.set(linkedId, child);
		const textFields = child.querySelectorAll("input");
		if (!textFields) continue;
		for (const textField of textFields) {
			const fieldId = textField.getAttribute("id") as keyof GlobalSettings;
			textField.value = settings[fieldId] as string;
			textField.addEventListener("input", (event) => {
				const target = event.target as HTMLInputElement;
				popup_CheckExtraChange(child, fieldId, target.value);
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
	popup_FinalizeSaveSettings(); //initial!
	popup_HandleHotkeys();
}

function popup_CheckboxChange(element: HTMLInputElement, name: keyof GlobalSettings) {
	popup_SaveSettings(name, element.checked ? 1 : 0);
	if (extraMap.has(name)) {
		extraMap.get(name).classList.toggle("Hidden", !element.checked);
	}
}

let saveTimeout: NodeJS.Timeout | undefined;
function popup_SaveSettings(
	name: keyof GlobalSettings | keyof Hotkeys,
	value: SettingBool | string,
	timeout = 0,
	hotkey = false
) {
	if (!hotkey) {
		//@ts-ignore
		settings[name] = value;
	} else {
		//@ts-ignore
		settings.hotkeys[name] = value;
	}

	if (saveTimeout) {
		clearTimeout(saveTimeout);
		saveTimeout = undefined;
	}
	if (timeout == 0) {
		popup_FinalizeSaveSettings();
		return;
	}
	saveTimeout = setTimeout(popup_FinalizeSaveSettings, timeout);
}

function popup_FinalizeSaveSettings() {
	saveTimeout = undefined;
	chrome.storage.sync.set(settings);
	document.body.classList.add("saved");
	setTimeout(() => {
		document.body.classList.remove("saved");
	}, 10);
}

function popup_CheckExtraChange(
	element: Element,
	name: keyof GlobalSettings,
	value: SettingBool | string
) {
	popup_SaveSettings(name, value, 500);
	if (name == "downloadPattern") {
		if ((value as string).match(/\<Se(\[\d+\])?\>/)) {
			element.classList.add("ShowOptContent");
		} else {
			element.classList.remove("ShowOptContent");
		}
	}
}

function popup_FetchSettings() {
	chrome.storage.sync.get(settings, (data) => {
		settings = data as GlobalSettings;
		popup_Init();
	});
}

window.onload = () => {
	popup_FetchSettings();
};

function popup_HandleHotkeys() {
	const hotkeyOpen = document.getElementById("HotkeyOpen");
	hotkeyOpen?.addEventListener("click", popup_ToggleHotkeys);

	const hotkeyNext = document.getElementById("HotkeyNext")!;
	hotkeyNext.setAttribute("sName", "next");
	hotkeyNext.textContent = settings.hotkeys.next.toUpperCase();
	const hotkeyPrev = document.getElementById("HotkeyPrev")!;
	hotkeyPrev.setAttribute("sName", "prev");
	hotkeyPrev.textContent = settings.hotkeys.prev.toUpperCase();
	const hotkeyCancel = document.getElementById("HotkeyCancel")!;
	hotkeyCancel.setAttribute("sName", "cancel");
	hotkeyCancel.textContent = settings.hotkeys.cancel.toUpperCase();
	for (const btn of [hotkeyNext, hotkeyPrev, hotkeyCancel]) {
		btn.addEventListener("click", async () => {
			btn.classList.add("active");
			const newButton = await popup_ListenToKeys();
			btn.classList.remove("active");
			if (!newButton) return;
			const settingName = btn.getAttribute("sName");
			if (!settingName) return;

			btn.textContent = newButton.toUpperCase();
			popup_SaveSettings(settingName as keyof Hotkeys, newButton, 0, true);
		});
	}
}

function popup_ToggleHotkeys() {
	const hotkeys = document.getElementById("Hotkeys");
	if (!hotkeys) return;
	if (hotkeys.classList.contains("open")) hotkeys.classList.remove("open");
	else hotkeys.classList.add("open");
}

function popup_ListenToKeys(): Promise<string | undefined> {
	return new Promise((resolve, reject) => {
		const onKeydown = (event: KeyboardEvent) => {
			const letter = event.key;
			if (isLetter(letter)) {
				resolve(letter);
				document.removeEventListener("keydown", onKeydown);
			}
		};
		document.addEventListener("keydown", onKeydown);
	});
}

function isLetter(str: string) {
	return str.length === 1 && str.match(/[a-z]/i);
}
