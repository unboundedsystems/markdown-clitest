import fs from "fs-extra";
import { createInterface } from "readline";

export interface LineInfo {
    filename: string;
    lineNum: number;
    text: string;
}

export async function readFile(filename: string) {
    const fileStream = fs.createReadStream(filename);
    return readStream(fileStream, filename);
}

export async function readStream(stream: fs.ReadStream, filename: string) {
    const rl = createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    let lineNum = 0;
    const lines: LineInfo[] = [];

    rl.on("line", (text) => {
        ++lineNum;
        lines.push({ filename, text, lineNum });
    });

    await new Promise((resolve, reject) => {
        rl.once("close", resolve);
        rl.once("error", reject);
    });
    rl.close();
    return lines;
}
