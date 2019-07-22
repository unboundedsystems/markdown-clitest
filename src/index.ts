import { InternalError } from "@adpt/utils";
import chalk from "chalk";
import db from "debug";
import execa from "execa";
import fs from "fs-extra";
import json5 from "json5";
import os from "os";
import path from "path";
import { createInterface } from "readline";
import { WithRequiredT } from "type-ops";
import { inspect } from "util";

const debugCommands = db("doctest:commands");
const debugOutput = db("doctest:output");
const debugParse = db("doctest:parse");

interface Options {
    cleanup?: boolean;
    filepath: string;
    interactive?: boolean;
    list?: boolean;
}

let cwd = "";
let tmpDir: string | undefined;
let cmdEnv: NodeJS.ProcessEnv = {};

const origPath = process.env.PATH || "";

type WriteFunc = (s: string) => void;

const defaultOptions = {
    cleanup: true,
    filepath: "",
    interactive: false,
    list: false,
};

class DocTest {
    readonly options: Required<Options>;
    commands: WriteFunc = debugCommands;
    output: WriteFunc = debugOutput;
    parse: WriteFunc = debugParse;

    cmdEnv: NodeJS.ProcessEnv;
    file: string | undefined;

    constructor(options: Options) {
        this.options = { ...defaultOptions, ...options };
        this.interactive(options.interactive);
        this.updateEnv(process.env);
    }

    info: WriteFunc = (s: string) => {
        // tslint:disable-next-line: no-console
        console.log(chalk.bold(s));
    }

    error(s: string): never {
        // tslint:disable-next-line: no-console
        console.log(chalk.redBright(s));
        throw new Error(`Doctest failed: ${s}`);
    }

    interactive(on?: boolean) {
        const cur = this.options.interactive;
        if (on !== undefined) {
            this.commands = on ? this.info : debugCommands;
            this.output = on ? this.info : debugOutput;

            this.options.interactive = on;
        }
        return cur;
    }

    userConfirm(query = "OK?", color: ChalkColors = "green") {
        if (!this.interactive()) return;

        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        query = chalk[color](query) + " ";

        return new Promise((resolve, reject) => rl.question(query, (ans: string) => {
            rl.close();
            switch (ans.toLowerCase()) {
                case "":
                case "y":
                case "yes":
                    resolve();
                    break;

                default:
                    reject("Canceled by user");
                    break;
            }
        }));
    }

    updateEnv(newEnv: NodeJS.ProcessEnv, diff = false) {
        const e = { ...newEnv };

        e.PATH = origPath;
        delete e.PWD;
        delete e._;
        delete e.SHLVL;
        delete e.OLDPWD;

        if (diff) {
            const lines = [];
            for (const key of Object.keys(e)) {
                if (key in cmdEnv) {
                    if (cmdEnv[key] === e[key]) continue;
                    lines.push(`- ${key}: ${cmdEnv[key]}`);
                    lines.push(`+ ${key}: ${e[key]}`);
                } else {
                    lines.push(`+ ${key}: ${e[key]}`);
                }
            }
            for (const key of Object.keys(cmdEnv)) {
                if (!(key in e)) {
                    lines.push(`- ${key}: ${cmdEnv[key]}`);
                }
            }
            if (lines.length > 0) {
                this.output(`Environment change:`);
                this.output(lines.join("\n") + "\n");
            }
        }

        cmdEnv = e;
    }
}

async function makeTmpdir() {
    return fs.mkdtemp(path.join(os.tmpdir(), "doctest-"));
}

function usage(message: string) {
    // tslint:disable-next-line: no-console
    console.log(chalk.red(`Error:` + message +
`
Usage: doctest.js [-i] <file.md | directory>

When used with a single file, it must be a markdown file and only that
file will be tested.
When used with a directory, all markdown files in that directory will be
tested, ordered with index.md first, followed by the remaining files sorted
by filename.
`));
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

const commonParamsDef = {
    step: "optional",
};

const actionsDef = {
    "output": commonParamsDef,
    "command": commonParamsDef,
    "file-replace": { ...commonParamsDef, file: "required" },
};

type ActionType = keyof typeof actionsDef;

interface LineInfo {
    line: string;
}

interface CommonParams {
    step: boolean;
}

interface AnyObject {
    [ key: string ]: any;
}
interface GenericParams extends CommonParams, AnyObject {}

interface Action {
    type: ActionType;
    params: GenericParams;
    lines?: string[];
}
type ActionComplete = WithRequiredT<Action, "lines">;

/**
 * Format of a doctest comment is:
 * <!-- doctest ACTION [JSONPARAMS] -->
 */
function parseDoctestComment(lineInfo: LineInfo): Action {
    const line = lineInfo.line;
    const action: AnyObject = {};

    // Extract everything after "doctest"
    let m = line.match(/<!--\s*doctest(.*)-->/);
    if (!m) throw new Error(`Internal error - doctest comment match not found`);
    const tdLine = m[1];
    if (!tdLine.startsWith(" ")) throw new Error(`Error in doctest comment: no space after 'doctest'`);

    // Extract the action
    m = tdLine.match(/^\s+(\S+)\s*(.*)$/);
    if (!m) throw new Error(`Error in doctest comment: No action provided`);
    action.type = m[1];

    try {
        if (!m[2]) {
            action.params = {};
        } else {
            action.params = json5.parse(m[2]);
            if (typeof action.params !== "object") {
                throw new Error(`Parameters are valid JSON but not an object`);
            }
        }
    } catch (err) {
        throw new Error(`Error in doctest command: parameters must be a valid ` +
            `JSON object\n` + err.message);
    }

    if (!validateAction(action)) throw new InternalError(`validateAction should have thrown`);

    return action;
}

function validateAction(action: AnyObject): action is Action {
    const paramInfo = actionsDef[action.type as ActionType];
    if (!paramInfo) throw new Error(`Error in doctest comment: Invalid action '${action.type}'`);

    for (const p of Object.keys(action.params)) {
        if (!(p in paramInfo)) throw new Error(`Invalid parameter '${p}' for action '${action.type}'`);
    }
    for (const p of Object.keys(paramInfo)) {
        if (paramInfo[p as keyof typeof paramInfo] === "required" && !(p in action.params)) {
            throw new Error(`Required parameter '${p}' missing from action '${action.type}'`);
        }
    }
    return true;
}

function isAction(action: AnyObject): action is Action {
    try {
        validateAction(action);
        return true;
    } catch (err) {
        return false;
    }
}

type NonActionType = "codetag" | "text";

interface NonAction {
    type: NonActionType;
}

type LineType = Action | NonAction;

function parseLine(lineInfo: LineInfo): LineType {
    const line = lineInfo.line;
    switch (true) {
        case /<!--\s*doctest.*-->/.test(line):
            return parseDoctestComment(lineInfo);
        case /^```/.test(line):
            return { type: "codetag" };
        default:
            return { type: "text" };
    }
}

function parseEnv(output: string): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = {};
    const envLines = output.split("\n");
    for (const l of envLines) {
        if (/^\s*$/.test(l)) continue;
        const idx = l.indexOf("=");
        if (idx >= 0) {
            const name = l.slice(0, idx);
            const val = l.slice(idx + 1);
            env[name] = val;
        }
    }
    return env;
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

async function runCommand(dt: DocTest, cmd: string, _action: Action) {
    // Skip lines that are empty or only whitespace
    if (/^\s*$/.test(cmd)) return;

    dt.commands(`\nCWD: ${cwd}`);
    dt.commands(`Running: ${cmd}`);
    await dt.userConfirm("Continue?");

    try {
        const pRet = execa(cmd + ` && echo "--DOCTESTINFO--" && env`,
            { shell: true, cwd, env: cmdEnv });
        //streamOutput(pRet.stdout);
        //streamOutput(pRet.stderr);

        const ret = await pRet;

        const [ stdout, doctestout ] = ret.stdout.split("--DOCTESTINFO--\n");
        if (!doctestout) throw new Error(`Unable to match doctest output in:\n${ret.stdout}`);
        const newEnv = parseEnv(doctestout);

        dt.updateEnv(newEnv, true);

        const newCwd = newEnv.PWD;
        if (newCwd !== cwd) dt.output(`Changed to new cwd: '${newCwd}'`);
        if (!newCwd) throw new Error(`'PWD' not set in environment of executed command '${cmd}'`);
        cwd = newCwd;

        dt.output(stdout);
        dt.output(ret.stderr);

        if (dt.interactive()) {
            await dt.userConfirm("Output OK?");
        }

    } catch (err) {
        return dt.error(`\n\nCOMMAND FAILED:\n${err.message}\n`);
    }
}

async function testFile(test: DocTest, file: string) {
    test.info(`Testing file: ${file}`);
    test.file = file;

    const fileStream = fs.createReadStream(file);

    const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let parseState = "text";
    const actions: ActionComplete[] = [];
    let lineNum = 0;
    let captureAction: ActionComplete | undefined;

    rl.on("line", (line) => {
        ++lineNum;
        const oldParseState = parseState;
        const lineInfo = { line, lineNum, file };
        const lineType = parseLine(lineInfo);
        debugParse(`${lineNum}: state=${parseState} type=${lineType.type} ${line}`);
        if (isAction(lineType) && lineType.params && Object.keys(lineType.params).length > 0) {
            debugParse(`    params=${inspect(lineType.params)}`);
        }

        switch (parseState) {
            case "text":
                switch (lineType.type) {
                    case "command":
                    case "file-replace":
                        parseState = "pre-capture";
                        captureAction = {
                            ...lineType,
                            lines: [],
                        };
                        break;

                    case "text":
                    case "codetag":
                        break;

                    default:
                        throw new Error(`Internal error: Unhandled action type '${lineType.type}'`);
                }
                break;

            case "pre-capture":
                if (!captureAction) throw new InternalError(`captureAction is null`);
                switch (lineType.type) {
                    case "codetag": parseState = "capture"; break;
                    default:
                        console.log(`WARN: doctest ${captureAction.type} not followed by code`);
                        break;
                }
                break;

            case "capture":
                if (!captureAction) throw new InternalError(`captureAction is null`);
                switch (lineType.type) {
                    case "codetag":
                        parseState = "text";
                        actions.push(captureAction);
                        captureAction = undefined;
                        break;
                    default:
                        captureAction.lines.push(line);
                        break;
                }
                break;

            default:
                throw new Error(`Internal error: bad parseState '${parseState}'`);
        }
        if (parseState !== oldParseState) {
            debugParse(`NEWSTATE:`, parseState);
        }
    });

    await new Promise((resolve, reject) => {
        rl.once("close", resolve);
        rl.once("error", reject);
    });
    rl.close();

    if (test.options.list) console.log(`Commands:`);

    for (const a of actions) {
        switch (a.type) {
            case "command":
                let saved;
                if (a.params.step) saved = test.interactive(true);
                for (const line of a.lines) {
                    if (test.options.list) console.log(line);
                    else {
                        await runCommand(test, line, a);
                    }
                }
                if (a.params.step) test.interactive(saved);
                break;

            case "file-replace":
                await fileReplace(test, a);
                break;

            default:
                throw new Error(`Unrecognized action ${a.type}`);
        }
    }
}

async function fileReplace(dt: DocTest, action: ActionComplete) {
    const content = action.lines.join("\n") + "\n";
    dt.commands(`\nCWD: ${cwd}`);
    dt.commands(`Replacing file: ${action.params.file} with:\n\n${content}`);
    await dt.userConfirm("Continue?");

    await fs.writeFile(path.join(cwd, action.params.file), content);
}

// The supported chalk colors aren't available easily from the TS definitions
// for that package.
type ChalkColors = "red" | "green" | "white";

async function main() {
    const opts = parseArgs();
    const dt = new DocTest(opts);

    tmpDir = await makeTmpdir();
    dt.output(`Running in temp dir: ${tmpDir}`);
    cwd = tmpDir;

    try {

        if (await isDir(opts.filepath)) {
            await testDir(dt, dt.options.filepath);
        } else {
            await testFile(dt, dt.options.filepath);
        }
    } finally {
        if (dt.options.cleanup) {
            dt.output(`Removing temp dir: ${tmpDir}`);
            await fs.remove(tmpDir);
        } else {
            dt.output(`NOT removing temp dir: ${tmpDir}`);
        }
    }
}

main().catch((err) => {
    // tslint:disable-next-line: no-console
    console.error(err);
    process.exit(1);
});
