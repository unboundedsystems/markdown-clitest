import should from "should";
import { runActions } from "../../src/actions";
import { CliTest } from "../../src/clitest";
import { readString } from "../testlib";

describe("command action", () => {

    it("should error on non-zero command exit", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "echo foo && false",
            "```",
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        // tslint:disable-next-line: no-trailing-whitespace
        await should(runActions(dt, actions)).be.rejectedWith(`Test failed: 

COMMAND FAILED: 'echo foo && false' (exit code 1)
Output:
foo
`);
    });

    it("should work correctly with comments in command", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "echo 'Some output' # This is a comment",
            "```",
            '<!-- doctest output { matchRegex: "^Some output\\\\n$" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await runActions(dt, actions);
    });
});
