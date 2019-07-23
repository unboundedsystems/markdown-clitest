import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { runActions } from "./actions";
import { DocTest, Options } from "./doctest";
import { parseFile } from "./parse";
import { readFile } from "./readFile";

function usage(message: string) {
    // tslint:disable-next-line: no-console
    console.log(chalk.bold(`Error:` + message));
    // tslint:disable-next-line: no-console
    console.log(
`
Usage: doctest.js [-i] <file.md | directory>

When used with a single file, it must be a markdown file and only that
file will be tested.
When used with a directory, all markdown files in that directory will be
tested, ordered with index.md first, followed by the remaining files sorted
by filename.
`);
    return process.exit(1);
}

function parseArgs(): Options {
    const args = process.argv.slice(2);
    const opts: Partial<Options> = {};
    let filepath: string | undefined;

    while (true) {
        const arg = args.shift();
        if (!arg) break;

        if (arg.startsWith("-")) {
            switch (arg) {
                case "-i":
                    opts.interactive = true;
                    break;
                case "--list":
                    opts.list = true;
                    break;
                case "--nocleanup":
                    opts.cleanup = false;
                    break;

                default: usage(`Flag not understood: ${arg}`);
            }
        } else {
            if (filepath) usage(`Too many arguments`);
            filepath = arg;
        }
    }
    if (!filepath) return usage(`wrong number of arguments`);

    return {
        ...opts,
        filepath,
    };
}

async function isDir(filename: string) {
    const stat = await fs.stat(filename);
    return stat.isDirectory();
}

async function mdFiles(dir: string) {
    const files = await fs.readdir(dir);
    const md = files.filter((f) => f !== "index.md" && /\.md$/.test(f));
    if (files.includes("index.md")) md.unshift("index.md");
    return md.map((f) => path.join(dir, f));
}

async function testDir(dt: DocTest, dir: string) {
    const files = await mdFiles(dir);
    if (files.length === 0) throw new Error(`No .md files to process in ${dir}`);

    for (const file of files) {
        await testFile(dt, file);
    }
}

/*
function streamOutput(s) {
    if (!options.interactive && !debugOutput.enabled) return;
    let done = false;
    let data = "";

    s.on("data", (buf) => {
        if (done) return;
        buf = buf.toString();
        data += buf;
        const [ out, doctestout ] = data.split("--DOCTESTINFO--\n");
        if (doctestout) done = true;
        process.stdout.write(buf)
    });
}
*/
async function testFile(dt: DocTest, file: string) {
    dt.info(`Testing file: ${file}`);
    dt.file = file;

    const lines = await readFile(file);
    const actions = parseFile(dt, lines);
    await runActions(dt, actions);
}

async function main() {
    const opts = parseArgs();
    const dt = new DocTest(opts);
    await dt.init();

    try {
        if (await isDir(opts.filepath)) {
            await testDir(dt, dt.options.filepath);
        } else {
            await testFile(dt, dt.options.filepath);
        }
    } finally {
        await dt.cleanup();
    }
}

main().catch((err) => {
    // tslint:disable-next-line: no-console
    console.error(err);
    process.exit(1);
});
