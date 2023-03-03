import JSZip from "jszip";
import * as fs from "fs";
import glob from "glob";
const rootFiles = [
    "manifest.json",
    "popup.html",
    "README.md",
    "style_popup.css",
    "style.css",
    "LICENSE",
];
function findFiles(pattern) {
    return new Promise((resolve) => {
        glob("./" + pattern, {}).then((files) => {
            resolve(files);
        });
    });
}
function addFile(zip, path) {
    const content = fs.readFileSync(path);
    zip.file(path, content);
}
async function makeZip() {
    const jsFiles = await findFiles("dist/*.js");
    const icons = await findFiles("icons/*");
    const allFiles = [...rootFiles, ...jsFiles, ...icons];
    const zip = new JSZip();
    for (const file of allFiles) {
        addFile(zip, file);
    }
    zip.generateAsync({ type: "arraybuffer" }).then(function (content) {
        fs.writeFileSync("./ProxerCinema.zip", Buffer.from(content));
    });
}
makeZip();
