import db from "debug";
import should from "should";
import { stderr, stdout } from "stdout-stderr";
import { Action, runActions } from "../../src/actions";
import { exec } from "../../src/actions/exec";
import { CliTest } from "../../src/clitest";
import { readString } from "../testlib";

const origOutput = db.enabled("clitest:output");
const origDebug = db.disable();
db.enable(origDebug);

function resetDebug() {
    db.disable();
    db.enable(origDebug);
}

function withCapture(f: Mocha.AsyncFunc): Mocha.AsyncFunc {
    return async function() {
        try {
            stderr.start();
            stderr.print = origOutput;
            stdout.start();
            stdout.print = origOutput;
            await f.call(this);
        } finally {
            stderr.stop();
            stdout.stop();
            resetDebug();
        }
    };
}

describe("exec action", () => {
    const actionLineNum = 1;
    const filename = "file.md";

    it("should run string cmd with shell", withCapture(async () => {
        db.enable("clitest:output");
        const dt = new CliTest({ filepath: "" });
        const action: Action = {
            type: "exec",
            filename,
            indent: 0,
            actionLineNum,
            params: { step: false, cmd: "echo 'Output line'; exit 5" },
        };
        await should(exec(dt, action, undefined))
            .be.rejectedWith(
`Test failed: EXEC FAILED: echo 'Output line'; exit 5
Output line
`);
        should(stdout.output).equal("Output line\n");
    }));

    it("should process array cmd", withCapture(async () => {
        db.enable("clitest:output");
        const dt = new CliTest({ filepath: "" });
        const action: Action = {
            type: "exec",
            filename,
            indent: 0,
            actionLineNum,
            params: { step: false, cmd: ["echo", "Some output"] },
        };
        await exec(dt, action, undefined);
        should(stdout.output).equal("Some output\n");
    }));

    it("should error on bad command", async () => {
        const dt = new CliTest({ filepath: "" });
        const action: Action = {
            type: "exec",
            filename,
            indent: 0,
            actionLineNum,
            params: { step: false, cmd: ["FOO"] },
        };
        await should(exec(dt, action, undefined))
            .be.rejectedWith(
`Test failed: EXEC FAILED: FOO
Command failed with ENOENT: FOO
spawn FOO ENOENT`);
    });

    it("should process array cmd and error", async () => {
        const dt = new CliTest({ filepath: "" });
        const action: Action = {
            type: "exec",
            filename,
            indent: 0,
            actionLineNum,
            params: { step: false, cmd: ["ls", "BADFILE"] },
        };
        await should(exec(dt, action, undefined))
            .be.rejectedWith(
                /Test failed: EXEC FAILED: ls BADFILE\nls: cannot access '?BADFILE'?: No such file or directory/);
    });

    it("should process array cmd and error in markdown", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            '<!-- doctest exec { cmd: ["ls", "BADFILE"] } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await should(runActions(dt, actions))
            .be.rejectedWith(
                /Test failed: EXEC FAILED: ls BADFILE\nls: cannot access '?BADFILE'?: No such file or directory/);
    });

    it("should validate exact exec output", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            '<!-- doctest exec { cmd: "echo Some output; echo", matchRegex: "^Some output\\\\n\\\\n" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await runActions(dt, actions);
    });

    it("should fail on non-match of exec output", async () => {
        const dt = new CliTest({ filepath: "" });
        const md = [
            "Some text",
            '<!-- doctest exec { cmd: "echo Some output", matchRegex: "Somf" } -->',
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await should(runActions(dt, actions))
            .be.rejectedWith(
`Test failed: EXEC FAILED: echo Some output
Test failed: Output does not match regular expression: Somf
Output:
'Some output
'`);
    });

    it("should validate previous command output", async () => {
        const params = {
            cmd: `if [ "$CLITEST_LAST_OUTPUT" = "Some output\n" ]; then echo MATCH; else echo NO; fi`,
            matchRegex: "MATCH",
        };
        const dt = new CliTest({ filepath: "" });
        const md = [
            "<!-- doctest command -->",
            "```",
            "echo Some output",
            "```",
            "Some text",
            `<!-- doctest exec ${JSON.stringify(params)} -->`,
            "more text",
        ].join("\n");
        const actions = await readString(dt, md);
        await runActions(dt, actions);
    });
});
