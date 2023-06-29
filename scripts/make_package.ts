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

function findFiles(pattern: string): Promise<string[]> {
	return new Promise((resolve) => {
		glob("./" + pattern, {}).then((files) => {
			resolve(files);
		});
	});
}

function removeDistPath(manifest: string) {
	const text = fs.readFileSync(manifest, "utf-8");
	return text.replace(/(dist|icons)\//g, "");
}

function addFile(zip: JSZip, path: string, placeInRoot = false) {
	let content: Buffer | string = fs.readFileSync(path);
	if (path == "manifest.json") content = removeDistPath(path);
	if (placeInRoot) {
		const newPath = path.replace(/.*?[\\\/](.*)/, "$1");
		zip.file(newPath, content);
	} else {
		zip.file(path, content);
	}
}

async function makeZip() {
	const jsFiles = await findFiles("dist/*.js");
	const icons = await findFiles("icons/*");
	const zip = new JSZip();
	for (const file of rootFiles) {
		addFile(zip, file);
	}
	for (const file of [...jsFiles, ...icons]) {
		addFile(zip, file, true);
	}
	zip.generateAsync({ type: "arraybuffer" }).then(function (content) {
		fs.writeFileSync("./ProxerCinema.zip", Buffer.from(content));
	});
}

makeZip();
