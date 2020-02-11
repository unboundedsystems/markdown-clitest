import should from "should";
import { Action, runActions } from "../../src/actions";
import { checkOutput } from "../../src/actions/output";
import { CliTest } from "../../src/clitest";
import { readString } from "../testlib";

describe("output action", () => {
    const actionLineNum = 1;
    const filename = "file.md";

    it("should error with no output", async () => {
        const dt = new CliTest({ filepath: "" });
        const action: Action = {
            type: "output",
            filename,
            indent: 0,
            actionLineNum,
            params: { step: false, matchRegex: "test" },
        };
        await should(checkOutput(dt, action, undefined))
            .be.rejectedWith("A doctest 'output' action must follow a 'command' action [file.md:1]");
    });

    it("should error with invalid regex", async () => {
        const dt = new CliTest({ filepath: "" });
        const action: Action = {
            type: "output",
            filename,
            indent: 0,
            actionLineNum,
            params: { step: false, matchRegex: "(foo" },
        };
        await should(checkOutput(dt, action, "some output"))
            .be.rejectedWith(/Invalid regular expression or flags in 'output' action.*Unterminated group/);
    });

    it("should error with invalid regex flags", async () => {
        const dt = new CliTest({ filepath: "" });
        const action: Action = {
            type: "output",
            filename,
            indent: 0,
            actionLineNum,
            params: { step: false, matchRegex: "foo", regexFlags: "Q" },
        };
        await should(checkOutput(dt, action, "some output"))
            .be.rejectedWith(/Invalid regular expression or flags in 'output' action.*Invalid flags/);
    });

    it("should error if match fails", async () => {
        const dt = new CliTest({ filepath: "" });
        const action: Action = {
            type: "output",
            filename,
            indent: 0,
            actionLineNum,
            params: { step: false, matchRegex: "foo" },
        };
        await should(checkOutput(dt, action, "some output"))
            .be.rejectedWith(
`Test failed: Output does not match regular expression: foo
Output:
'some output'`);
    });

    it("should error if previous command isn't output", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            '<!-- doctest output { matchRegex: "foo" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await should(runActions(dt, actions))
            .be.rejectedWith(/'output' action must follow a 'command' action/);
    });

    it("should validate output", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "echo Some output",
            "```",
            '<!-- doctest output { matchRegex: "Some" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await runActions(dt, actions);
    });

    it("should validate output from stderr", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "echo Some output 1>&2",
            "```",
            '<!-- doctest output { matchRegex: "Some" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await runActions(dt, actions);
    });

    it("should validate mixed output from stdout and stderr", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "echo To stderr 1>&2 ; echo To stdout",
            "```",
            '<!-- doctest output { matchRegex: "^To stderr\\\\nTo stdout" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await runActions(dt, actions);
    });

    it("should validate exact output", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "printf 'Some output\\n\\n'",
            "```",
            '<!-- doctest output { matchRegex: "^Some output\\\\n\\\\n$" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await runActions(dt, actions);
    });

    it("should allow setting regex flags", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "printf 'Line one\\nline TWO\\n'",
            "```",
            '<!-- doctest output { matchRegex: "one.*two", regexFlags: "is" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await runActions(dt, actions);
    });

    it("should fail on non-match", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "echo Some output",
            "```",
            '<!-- doctest output { matchRegex: "Somf" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await should(runActions(dt, actions))
            .be.rejectedWith(
`Test failed: Output does not match regular expression: Somf
Output:
'Some output
'`);
    });
});
