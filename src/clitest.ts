import { UserError } from "@adpt/utils";
import chalk from "chalk";
import db from "debug";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { createInterface } from "readline";

const debugCommands = db("clitest:commands");
const debugOutput = db("clitest:output");
const debugParse = db("clitest:parse");

export interface Options {
    cleanup?: boolean;
    filepath: string;
    interactive?: boolean;
    list?: boolean;
}

export enum ConfirmAction {
    continue = "continue",
    skip = "skip",
}

// The supported chalk colors aren't available easily from the TS definitions
// for that package.
type ChalkColors = "red" | "green" | "white";

type WriteFunc = (s: string) => void;

const defaultOptions = {
    cleanup: true,
    filepath: "",
    interactive: false,
    list: false,
};

export interface UserConfirmOptions {
    color?: ChalkColors;
    skipAllowed?: boolean;
}

const defaultUserConfirmOptions = {
    color: "green" as const,
    skipAllowed: true,
};

export class CliTest {
    readonly options: Required<Options>;
    commands: WriteFunc = debugCommands;
    output: WriteFunc = debugOutput;
    parse: WriteFunc = debugParse;

    cmdEnv: NodeJS.ProcessEnv;
    cwd = "";
    file: string | undefined;
    lastCommandOutput: string | undefined;
    origPath: string;
    tmpDir: string;

    constructor(options: Options) {
        this.options = { ...defaultOptions, ...options };
        this.origPath = process.env.PATH || "";
        this.interactive(options.interactive);
        this._updateEnv({ ...process.env, PWD: process.cwd() });
        if (!this.origPath) throw new Error(`Environment PATH is empty. Cannot continue.`);
    }

    async init() {
        this.tmpDir = await makeTmpdir();
        this.cwd = this.tmpDir;
        this.output(`Running in temp dir: ${this.cwd}`);
    }

    info: WriteFunc = (s: string) => {
        // tslint:disable-next-line: no-console
        console.log(chalk.bold(s));
    }

    error(s: string): never {
        throw new UserError(`Test failed: ${s}`);
    }

    async cleanup() {
        const tmpDir = this.tmpDir;
        if (this.options.cleanup) {
            this.output(`Removing temp dir: ${tmpDir}`);
            await fs.remove(tmpDir);
        } else {
            this.output(`NOT removing temp dir: ${tmpDir}`);
        }
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

    async userConfirm(query = "OK?", options: UserConfirmOptions = {}): Promise<ConfirmAction> {
        const opts = { ...defaultUserConfirmOptions, ...options };
        if (!this.interactive()) return ConfirmAction.continue;

        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        const inputs = [ "Yes", "No" ];
        if (opts.skipAllowed) inputs.push("Skip");

        query = chalk[opts.color](query) + ` [${inputs.join(", ")}] `;
        try {
            while (true) {
                const ans = await new Promise<string>((resolve) => rl.question(query, resolve));

                switch (ans.toLowerCase()) {
                    case "":
                    case "y":
                    case "yes":
                        return ConfirmAction.continue;

                    case "n":
                    case "no":
                        throw new UserError("Canceled by user");

                    case "s":
                    case "skip":
                        if (opts.skipAllowed) return ConfirmAction.skip;
                        // Fall through

                    default:
                        this.info("Invalid response");
                        break;
                }
            }
        } finally {
            rl.close();
        }
    }

    updateEnv(output: string, diff = false): void {
        const newEnv = this.parseEnv(output);
        this._updateEnv(newEnv, diff);
    }

    parseEnv(output: string): NodeJS.ProcessEnv {
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

    private updateCwd(newCwd: string | undefined) {
        if (!newCwd) throw new Error(`'PWD' not set in environment`);
        if (newCwd !== this.cwd) this.output(`Changed to new cwd: '${newCwd}'`);
        this.cwd = newCwd;
    }

    private _updateEnv(newEnv: NodeJS.ProcessEnv, diff = false) {
        const e = { ...newEnv };

        this.updateCwd(e.PWD);

        e.PATH = this.origPath;
        delete e.PWD;
        delete e._;
        delete e.SHLVL;
        delete e.OLDPWD;

        if (diff) {
            const lines = [];
            for (const key of Object.keys(e)) {
                if (key in this.cmdEnv) {
                    if (this.cmdEnv[key] === e[key]) continue;
                    lines.push(`- ${key}: ${this.cmdEnv[key]}`);
                    lines.push(`+ ${key}: ${e[key]}`);
                } else {
                    lines.push(`+ ${key}: ${e[key]}`);
                }
            }
            for (const key of Object.keys(this.cmdEnv)) {
                if (!(key in e)) {
                    lines.push(`- ${key}: ${this.cmdEnv[key]}`);
                }
            }
            if (lines.length > 0) {
                this.output(`Environment change:`);
                this.output(lines.join("\n") + "\n");
            }
        }

        this.cmdEnv = e;
    }
}

async function makeTmpdir() {
    return fs.mkdtemp(path.join(os.tmpdir(), "clitest-"));
}
