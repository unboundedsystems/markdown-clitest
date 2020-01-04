import { CliTest } from "../clitest";
import { ActionError } from "../error";
import { Action } from "./action";

export async function checkOutput(dt: CliTest, action: Action, lastOutput: string | undefined) {
    if (lastOutput === undefined) {
        throw new ActionError(action, `A doctest 'output' action must follow a 'command' action`);
    }
    const reString = action.params.matchRegex;
    if (!reString) {
        throw new ActionError(action, `'output' action must specify a 'matchRegex' parameter`);
    }
    let regex;
    try {
        regex = RegExp(reString, action.params.regexFlags);
    } catch (err) {
        throw new ActionError(action, `Invalid regular expression or flags in 'output' action: ${err.message}`);
    }

    if (!regex.test(lastOutput)) {
        return dt.error(`Output does not match regular expression: ${reString}\n` +
            `Output:\n'${lastOutput}'`);
    }
}
