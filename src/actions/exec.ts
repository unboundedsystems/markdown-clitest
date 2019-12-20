import { UserError } from "@adpt/utils";
import db from "debug";
import execa from "execa";
import { CliTest, ConfirmAction } from "../clitest";
import { Action } from "./action";
import { checkOutput } from "./output";

const debugOutput = db("clitest:output");

export async function exec(dt: CliTest, action: Action, lastOutput: string | undefined) {
    const cmd = action.params.cmd;
    let cmdStr: string;
    let toExec: string;
    let args: string[];
    let shell = false;

    if (typeof cmd === "string" && cmd.length > 0) {
        cmdStr = cmd;
        toExec = cmd;
        args = [];
        shell = true;

    } else if (Array.isArray(cmd)) {
        if (cmd.length === 0) {
            throw new UserError(`Action 'exec' parameter 'cmd' array cannot be length 0`);
        }
        for (const c of cmd) {
            if (typeof c !== "string") {
                throw new UserError(`Action 'exec' parameter 'cmd' has non-string element in array`);
            }
        }
        cmdStr = cmd.join(" ");
        toExec = cmd[0];
        args = cmd.slice(1);

    } else {
        throw new UserError(`Action 'exec' has invalid cmd parameter '${cmd}'. Must be string or array of string.`);
    }

    dt.commands(`\nCWD: ${dt.cwd}`);
    dt.commands(`Command: ${cmdStr}`);
    const confirm = await dt.userConfirm("Continue?");
    if (confirm === ConfirmAction.skip) {
        dt.info(`SKIPPING: ${cmdStr}`);
        return;
    }

    const env = {
        ...dt.cmdEnv,
        CLITEST_LAST_OUTPUT: lastOutput,
    };

    try {
        const pRet = execa(toExec, args, {
            all: true,
            cwd: dt.cwd,
            env,
            shell,
            stripFinalNewline: false,
        });

        if (pRet.stdout == null) {
            throw new Error(`execa stdout stream is null??`);
        }
        if (pRet.stderr == null) {
            throw new Error(`execa stdout stream is null??`);
        }

        if (dt.interactive() || debugOutput.enabled) {
            pRet.stderr.pipe(process.stderr);
            pRet.stdout.pipe(process.stdout);
        }

        const ret = await pRet;

        if (action.params.matchRegex) {
            await checkOutput(dt, action, ret.all);
        }

    } catch (err) {
        const msg = `EXEC FAILED: ${cmdStr}\n${err.all || err.message}`;
        return dt.error(msg);
    }
}
