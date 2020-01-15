import should from "should";
import { CliTest } from "../src/clitest";
import { readString } from "./testlib";

describe("parseFile", () => {
    const dt = new CliTest({ filepath: "" });

    it("should parse command", async () => {
        const md = [
            "Some text",
            "<!-- doctest command -->",
            "```",
            "command one",
            "another command",
            "```",
        ].join("\n");
        const actions = await readString(dt, md);
        should(actions).eql([
            {
                type: "command",
                filename: "<string>",
                actionLineNum: 2,
                indent: 0,
                params: {},
                lines: [
                    "command one",
                    "another command",
                ]
            }
        ]);
    });

    it("should parse indented command code block", async () => {
        const md = [
            "1. A list",
            "",
            "<!-- doctest command -->",
            "    ```",
            "     command one",
            "      another command",
            "    ```",
        ].join("\n");
        const actions = await readString(dt, md);
        should(actions).eql([
            {
                type: "command",
                actionLineNum: 3,
                indent: 4,
                filename: "<string>",
                params: {},
                lines: [
                    " command one",
                    "  another command",
                ]
            }
        ]);
    });
});
