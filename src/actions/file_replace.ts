import fs from "fs-extra";
import path from "path";
import { DocTest } from "../doctest";
import { ActionComplete } from "./action";

export async function fileReplace(dt: DocTest, action: ActionComplete) {
    const content = action.lines.join("\n") + "\n";
    dt.commands(`\nCWD: ${dt.cwd}`);
    dt.commands(`Replacing file: ${action.params.file} with:\n\n${content}`);
    await dt.userConfirm("Continue?");

    await fs.writeFile(path.join(dt.cwd, action.params.file), content);
}
