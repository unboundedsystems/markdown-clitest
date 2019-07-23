import should from "should";
import { DocTest } from "../src/doctest";
import { readString } from "./testlib";

describe("parseFile", () => {
    const dt = new DocTest({ filepath: "" });

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
