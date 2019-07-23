import execa from "execa";
import { DocTest } from "../doctest";
import { Action } from "./action";

export async function runCommand(dt: DocTest, cmd: string, _action: Action) {
    // Skip lines that are empty or only whitespace
    if (/^\s*$/.test(cmd)) return;

    dt.commands(`\nCWD: ${dt.cwd}`);
    dt.commands(`Running: ${cmd}`);
    await dt.userConfirm("Continue?");

    try {
        const pRet = execa(cmd + ` && echo "--DOCTESTINFO--" && env`,
            { shell: true, cwd: dt.cwd, env: dt.cmdEnv });
        //streamOutput(pRet.stdout);
        //streamOutput(pRet.stderr);

        const ret = await pRet;

        const [ stdout, doctestout ] = ret.stdout.split("--DOCTESTINFO--\n");
        if (!doctestout) throw new Error(`Unable to match doctest output in:\n${ret.stdout}`);
        dt.updateEnv(doctestout, true);

        dt.output(stdout);
        dt.output(ret.stderr);

        if (dt.interactive()) {
            await dt.userConfirm("Output OK?");
        }

    } catch (err) {
        return dt.error(`\n\nCOMMAND FAILED:\n${err.message}\n`);
    }
}
