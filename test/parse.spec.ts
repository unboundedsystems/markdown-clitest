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
                params: {},
                lines: [
                    "command one",
                    "another command",
                ]
            }
        ]);
    });
});
