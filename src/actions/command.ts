import execa from "execa";
import { CliTest, ConfirmAction } from "../clitest";
import { Action } from "./action";

export async function runCommand(dt: CliTest, cmd: string, _action: Action) {
    // Skip lines that are empty or only whitespace
    if (/^\s*$/.test(cmd)) return;

    dt.commands(`\nCWD: ${dt.cwd}`);
    dt.commands(`Running: ${cmd}`);
    const confirm = await dt.userConfirm("Continue?");
    if (confirm === ConfirmAction.skip) {
        dt.info(`SKIPPING: ${cmd}`);
        return;
    }

    try {
        const pRet = execa(cmd + ` && echo "--CLITESTINFO--" && env`,
            { shell: true, cwd: dt.cwd, env: dt.cmdEnv });
        //streamOutput(pRet.stdout);
        //streamOutput(pRet.stderr);

        const ret = await pRet;

        const [ stdout, clitestout ] = ret.stdout.split("--CLITESTINFO--\n");
        if (!clitestout) throw new Error(`Unable to match clitest output in:\n${ret.stdout}`);
        dt.updateEnv(clitestout, true);

        dt.output(stdout);
        dt.output(ret.stderr);

        if (dt.interactive()) {
            await dt.userConfirm("Output OK?", { skipAllowed: false });
        }

    } catch (err) {
        const msg = `\n\nCOMMAND FAILED:\n${err.all || err.message}\n`;
        return dt.error(msg);
    }
}
