"use strict";
function SendMessage(type, message) {
    return new Promise((resolve, _) => {
        chrome.runtime.sendMessage({
            type: type,
            message: message || "",
        }, (response) => {
            resolve(response);
        });
    });
}
