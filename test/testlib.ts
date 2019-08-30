import { CliTest } from "../src/clitest";
import { parseFile } from "../src/parse";
import { readStream } from "../src/readFile";
// tslint:disable-next-line: no-var-requires
const toStream = require("string-to-stream");

export async function readString(dt: CliTest, s: string) {
    const lines = await readStream(toStream(s), "<string>");
    return parseFile(dt, lines);
}
