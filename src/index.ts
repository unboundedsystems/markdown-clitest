import { isUserError } from "@adpt/utils";
import chalk from "chalk";
import program from "commander";
import fs from "fs-extra";
import path from "path";
import { isError } from "util";
import { runActions } from "./actions";
import { CliTest, Options } from "./clitest";
import { parseFile } from "./parse";
import { readFile } from "./readFile";

function parseArgs(): Options {
    program
        .option("-i, --interactive", "Ask for user input at each action")
        .option("--list", "List actions, but do not run them")
        .option("--no-cleanup", "Don't remove temporary directory on exit")
        .arguments("<filepath>");

    // tslint:disable-next-line: no-console
    program.on("--help", () => console.log(`
When used with a single file, it must be a markdown file and only that
file will be tested.

When used with a directory, all markdown files in that directory will be
tested, ordered with index.md first, followed by the remaining files sorted
by filename.
`)
    );

    program.parse(process.argv);
    if (program.args.length !== 1) {
        // tslint:disable-next-line: no-console
        console.log("\n" + chalk.bold(`Error: Wrong number of arguments\n`));
        program.help();
    }

    const [ filepath ] = program.args;

    return {
        ...program.opts(),
        filepath
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

async function testDir(dt: CliTest, dir: string) {
    const files = await mdFiles(dir);
    if (files.length === 0) throw new Error(`No .md files to process in ${dir}`);

    for (const file of files) {
        await testFile(dt, file);
    }
}

async function testFile(dt: CliTest, file: string) {
    dt.info(`Testing file: ${file}`);
    dt.file = file;

    const lines = await readFile(file);
    const actions = parseFile(dt, lines);
    await runActions(dt, actions);
}

async function main() {
    const opts = parseArgs();
    const dt = new CliTest(opts);
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
    const msg = isUserError(err) ? err.message :
        isError(err) ? err.stack :
        err.toString();
    const idx = msg.indexOf("\n");
    const first = idx > 1 ? msg.slice(0, idx + 1) : msg;
    const rest = msg.length > first.length ? msg.slice(idx + 1) : "";
    // tslint:disable-next-line: no-console
    console.error(chalk.redBright(first) + rest);
    process.exit(1);
});
