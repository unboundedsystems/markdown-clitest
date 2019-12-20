import db from "debug";
// tslint:disable-next-line: no-var-requires
const devNull = require("dev-null");
import execa from "execa";
import { CliTest, ConfirmAction } from "../clitest";
import { Action } from "./action";

const debugOutput = db("clitest:output");

const marker = "--CLITESTINFO--";

export async function runCommand(dt: CliTest, cmd: string, _action: Action) {
    // Skip lines that are empty or only whitespace
    if (/^\s*$/.test(cmd)) return;

    dt.commands(`\nCWD: ${dt.cwd}`);
    dt.commands(`Command: ${cmd}`);
    const confirm = await dt.userConfirm("Continue?");
    if (confirm === ConfirmAction.skip) {
        dt.info(`SKIPPING: ${cmd}`);
        return;
    }

    let stdoutDone = false;
    let buf = "";
    const envLines: string[] = [];
    const stdoutLines: string[] = [];

    function processLine(line: string) {
        if (line === marker + "\n") {
            stdoutDone = true;
        } else if (stdoutDone) {
            envLines.push(line);
        } else {
            stdoutLines.push(line);
            if (dt.interactive() || debugOutput.enabled) {
                process.stdout.write(line);
            }
        }
    }

    try {
        const pRet = execa(cmd + ` && printf "\n${marker}\n" && env`, {
            all: true,
            cwd: dt.cwd,
            env: dt.cmdEnv,
            shell: true,
            stripFinalNewline: false,
        });
        if (pRet.stdout == null) {
            throw new Error(`execa stdout stream is null??`);
        }
        if (pRet.stderr == null) {
            throw new Error(`execa stdout stream is null??`);
        }

        pRet.stderr.pipe((dt.interactive() || debugOutput.enabled) ? process.stderr : devNull());

        pRet.stdout.on("data", (chunk) => {
            buf += chunk.toString();
            while (buf.length) {
                const idx = buf.indexOf("\n");
                if (idx === -1) return;

                const line = buf.slice(0, idx + 1);
                buf = buf.slice(idx + 1);

                processLine(line);
            }
        });
        pRet.stdout.on("end", () => {
            if (buf.length > 0) processLine(buf);
        });

        await pRet;

        const env = envLines.join("");
        dt.updateEnv(env, true);

        if (dt.interactive()) {
            await dt.userConfirm("Output OK?", { skipAllowed: false });
        }

        stdoutLines.pop(); // Remove final \n we inserted
        dt.lastCommandOutput = stdoutLines.join("");

    } catch (err) {
        const msg = `\n\nCOMMAND FAILED:\n${err.all || err.message}\n`;
        return dt.error(msg);
    }
}
