"use strict";
function info_Init() {
    const info = info_GatherInformation();
    info_SendMessage("sendAnimeInfo", info);
}
function info_GatherInformation() {
    const infoElements = document.querySelectorAll("td:nth-child(2) .details tr");
    const info = {
        name: "",
        englishName: "",
        germanName: "",
        japaneseName: "",
        description: "",
        genre: [],
        status: "Unknown",
    };
    for (const infoElem of infoElements) {
        const descElem = infoElem.querySelector("td[colspan='2']");
        if (descElem) {
            let text = descElem.innerHTML;
            text = text.slice(text.indexOf("<br>"));
            info.description = text;
            continue;
        }
        const nameElem = infoElem.querySelector("td:first-child b");
        if (!nameElem)
            continue;
        const valueElem = infoElem.querySelector("td:last-child");
        if (!valueElem)
            continue;
        const value = valueElem.innerHTML;
        switch (nameElem.innerHTML) {
            case "Original Titel":
                info.name = value;
                break;
            case "Englischer Titel":
                info.englishName = value;
                break;
            case "Deutscher Titel":
                info.germanName = value;
                break;
            case "Japanischer Titel":
                info.japaneseName = value;
                break;
            case "Synonym":
                info.synonym = value;
                break;
            case "Status":
                info.status = value;
                break;
            case "Genre":
                info.genre = info_ExtractGenre(valueElem);
                break;
        }
    }
    return info;
}
function info_ExtractGenre(elem) {
    const genre = [];
    elem.querySelectorAll("a").forEach((linkElem) => {
        genre.push(linkElem.innerHTML);
    });
    return genre;
}
function info_SendMessage(type, message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            type: type,
            message: message || "",
        }, (response) => {
            if (response && response.status != "Error") {
                resolve(response);
            }
            else
                reject();
        });
    });
}
info_Init();
// Not listen is spawned iframes
// if (!page_InIframe()) {
// 	chrome.runtime.onMessage.addListener(page_ReceiveMessge);
// 	function page_ReceiveMessge<MName extends keyof MessageDeclarations>(
// 		request: {
// 			message: any;
// 			type: MName;
// 		},
// 		_: chrome.runtime.MessageSender,
// 		sendResponse: (answer: MessageCallbackRaw<MName>) => void
// 	) {
// 		const fail = () => sendResponse({ status: "Error" });
// 		let answer: any;
// 		if (request.type == "globalEvent") {
// 			const event = request.message as GlobalEvent;
// 			if (event == "JumpNext") {
// 				curUrlIndex++;
// 				if (info) info.episode++;
// 				page_CheckIndex();
// 			}
// 			if (event == "JumpPrev") {
// 				curUrlIndex--;
// 				if (info) info.episode--;
// 				page_CheckIndex();
// 			}
// 			if (event == "ExitFullscreen") {
// 				page_RefreshUrl();
// 			}
// 			if (event == "MassDownloadDone") {
// 				const iframes = document.querySelectorAll(".TemporaryDownloadIFrame");
// 				for (const iframe of iframes) {
// 					iframe.remove();
// 				}
// 			}
// 			if (event == "JumpNextOld") page_OldJump("Next");
// 			if (event == "JumpPrevOld") page_OldJump("Prev");
// 		}
// 		if (!answer) {
// 			sendResponse({ status: "NoData" });
// 		} else {
// 			sendResponse({ status: "OK", content: answer });
// 		}
// 	}
// }
