import { InternalError } from "@adpt/utils";
import json5 from "json5";
import { inspect } from "util";
import { Action, ActionComplete, isAction, LineType, validateAction } from "./actions";
import { CliTest } from "./clitest";
import { LineInfo } from "./readFile";
import { AnyObject } from "./types";

export function parseFile(dt: CliTest, lines: LineInfo[]) {
    if (lines.length === 0) throw new Error(`Parsing file with no lines`);

    let parseState = "text";
    const actions: ActionComplete[] = [];
    let captureAction: ActionComplete | undefined;

    for (const lineInfo of lines) {
        const { text, lineNum }  = lineInfo;
        const oldParseState = parseState;
        const lineType = parseLine(lineInfo);
        dt.parse(`${lineNum}: state=${parseState} type=${lineType.type} ${text}`);
        if (isAction(lineType) && lineType.params && Object.keys(lineType.params).length > 0) {
            dt.parse(`    params=${inspect(lineType.params)}`);
        }

        switch (parseState) {
            case "text":
                switch (lineType.type) {
                    case "command":
                    case "file-replace":
                        parseState = "pre-capture";
                        captureAction = {
                            ...lineType,
                            lines: [],
                        };
                        break;

                    case "text":
                    case "codetag":
                        break;

                    case "exec":
                    case "output":
                        actions.push({
                            ...lineType,
                            lines: [],
                        });
                        break;

                    default:
                        throw new InternalError(`Unhandled action type '${(lineType as any).type}'`);
                }
                break;

            case "pre-capture":
                if (!captureAction) throw new InternalError(`captureAction is null`);
                switch (lineType.type) {
                    case "codetag": parseState = "capture"; break;
                    default:
                        if (text.trim() !== "") {
                            // tslint:disable-next-line: no-console
                            console.log(`WARN: doctest ${captureAction.type} not followed by code`);
                        }
                        break;
                }
                break;

            case "capture":
                if (!captureAction) throw new InternalError(`captureAction is null`);
                switch (lineType.type) {
                    case "codetag":
                        parseState = "text";
                        actions.push(captureAction);
                        captureAction = undefined;
                        break;
                    default:
                        captureAction.lines.push(text);
                        break;
                }
                break;

            default:
                throw new Error(`Internal error: bad parseState '${parseState}'`);
        }
        if (parseState !== oldParseState) {
            dt.parse(`NEWSTATE: ${parseState}`);
        }
    }

    // tslint:disable-next-line: no-console
    if (dt.options.list) console.log(`Commands:`);

    return actions;
}

function parseLine(lineInfo: LineInfo): LineType {
    const line = lineInfo.text;
    switch (true) {
        case /<!--\s*doctest.*-->/.test(line):
            return parseClitestComment(lineInfo);
        case /^```/.test(line):
            return { type: "codetag" };
        default:
            return { type: "text" };
    }
}

/**
 * Format of a doctest comment is:
 * <!-- doctest ACTION [JSONPARAMS] -->
 */
function parseClitestComment(lineInfo: LineInfo): Action {
    const line = lineInfo.text;
    const action: AnyObject = {};

    // Extract everything after "doctest"
    let m = line.match(/<!--\s*doctest(.*)-->/);
    if (!m) throw new Error(`Internal error - doctest comment match not found`);
    const tdLine = m[1];
    if (!tdLine.startsWith(" ")) throw new Error(`Error in doctest comment: no space after 'doctest'`);

    // Extract the action
    m = tdLine.match(/^\s+(\S+)\s*(.*)$/);
    if (!m) throw new Error(`Error in doctest comment: No action provided`);
    action.type = m[1];

    try {
        if (!m[2]) {
            action.params = {};
        } else {
            action.params = json5.parse(m[2]);
            if (typeof action.params !== "object") {
                throw new Error(`Parameters are valid JSON but not an object`);
            }
        }
    } catch (err) {
        throw new Error(`Error in doctest command: parameters must be a valid ` +
            `JSON object\n` + err.message);
    }

    if (!validateAction(action)) throw new InternalError(`validateAction should have thrown`);

    return action;
}
