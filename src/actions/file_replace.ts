import fs from "fs-extra";
import path from "path";
import { CliTest, ConfirmAction } from "../clitest";
import { ActionComplete } from "./action";

export async function fileReplace(dt: CliTest, action: ActionComplete) {
    const content = action.lines.join("\n") + "\n";
    dt.commands(`\nCWD: ${dt.cwd}`);
    dt.commands(`Replacing file: ${action.params.file} with:\n\n${content}`);
    const confirm = await dt.userConfirm("Continue?");
    if (confirm === ConfirmAction.skip) {
        dt.info(`SKIPPING: Replace file ${action.params.file}`);
        return;
    }

    await fs.writeFile(path.join(dt.cwd, action.params.file), content);
}
