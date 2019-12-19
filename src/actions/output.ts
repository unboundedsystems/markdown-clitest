import { CliTest } from "../clitest";
import { Action } from "./action";

export async function checkOutput(dt: CliTest, action: Action, lastOutput: string | undefined) {
    if (lastOutput === undefined) {
        throw new Error(`A doctest 'output' action must follow a 'command' action`);
    }
    const reString = action.params.matchRegex;
    if (!reString) {
        throw new Error(`'output' action must specify a 'matchRegex' parameter`);
    }
    let regex;
    try {
        regex = RegExp(reString);
    } catch (err) {
        throw new Error(`Invalid regular expression in 'output' action: ${err.message}`);
    }

    if (!regex.test(lastOutput)) {
        return dt.error(`Output does not match regular expression: ${reString}\n` +
            `Output:\n'${lastOutput}'`);
    }
}
