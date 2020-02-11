import db from "debug";
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
    const envLines: string[] = [];
    const outputLines: string[] = [];

    function processStream(s: NodeJS.ReadableStream, outStream: NodeJS.WritableStream, stdout: boolean) {
        let buf = "";

        s.on("data", (chunk) => {
            buf += chunk.toString();
            while (buf.length) {
                const idx = buf.indexOf("\n");
                if (idx === -1) return;

                const line = buf.slice(0, idx + 1);
                buf = buf.slice(idx + 1);

                processLine(line);
            }
        });
        s.on("end", () => {
            if (buf.length > 0) processLine(buf);
        });

        function processLine(line: string) {
            const m = line.match(new RegExp(`^(.*)${marker}\n`));
            if (stdout && m) {
                stdoutDone = true;
                if (m[1].length > 0) outputLines.push(m[1]);
            } else if (stdout && stdoutDone) {
                envLines.push(line);
            } else {
                outputLines.push(line);
                if (dt.interactive() || debugOutput.enabled) {
                    outStream.write(line);
                }
            }
        }
    }

    const script = `
        set -o errexit
        ${cmd}
        printf -- "${marker}\n"
        env`;
    try {
        const pRet = execa(script, {
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

        processStream(pRet.stderr, process.stderr, false);
        processStream(pRet.stdout, process.stdout, true);

        await pRet;

        const env = envLines.join("");
        dt.updateEnv(env, true);

        if (dt.interactive()) {
            await dt.userConfirm("Output OK?", { skipAllowed: false });
        }

        dt.lastCommandOutput = outputLines.join("");

    } catch (err) {
        if (!err.message) throw err;

        let msg = `\n\nCOMMAND FAILED: '${cmd}'`;
        if (err.all == null) {
            msg += `: ${err.message}`;
        } else {
            msg += ` (exit code ${err.exitCode})\nOutput:\n${err.all}`;
        }
        return dt.error(msg);
    }
}
