import { InternalError } from "@adpt/utils";
import { WithRequiredT } from "type-ops";
import { DocTest } from "../doctest";
import { AnyObject } from "../types";
import { runCommand } from "./command";
import { fileReplace } from "./file_replace";

const commonParamsDef = {
    step: "optional",
};

const actionsDef = {
    "output": commonParamsDef,
    "command": commonParamsDef,
    "file-replace": { ...commonParamsDef, file: "required" },
};

export type ActionType = keyof typeof actionsDef;

interface CommonParams {
    step: boolean;
}

export interface GenericParams extends CommonParams, AnyObject {}

export interface Action {
    type: ActionType;
    params: GenericParams;
    lines?: string[];
}

export type ActionComplete = WithRequiredT<Action, "lines">;

export type NonActionType = "codetag" | "text";

export interface NonAction {
    type: NonActionType;
}

export type LineType = Action | NonAction;

export function validateAction(action: AnyObject): action is Action {
    const paramInfo = actionsDef[action.type as ActionType];
    if (!paramInfo) throw new Error(`Error in doctest comment: Invalid action '${action.type}'`);

    for (const p of Object.keys(action.params)) {
        if (!(p in paramInfo)) throw new Error(`Invalid parameter '${p}' for action '${action.type}'`);
    }
    for (const p of Object.keys(paramInfo)) {
        if (paramInfo[p as keyof typeof paramInfo] === "required" && !(p in action.params)) {
            throw new Error(`Required parameter '${p}' missing from action '${action.type}'`);
        }
    }
    return true;
}

export function isAction(action: AnyObject): action is Action {
    try {
        validateAction(action);
        return true;
    } catch (err) {
        return false;
    }
}

export function isActionComplete(action: AnyObject): action is ActionComplete {
    return isAction(action) && action.lines != null;
}

export async function runActions(dt: DocTest, actions: Action[]) {
    for (const a of actions) {
        switch (a.type) {
            case "command":
                let saved;
                if (a.params.step) saved = dt.interactive(true);
                for (const line of a.lines || []) {
                    if (dt.options.list) console.log(line);
                    else {
                        await runCommand(dt, line, a);
                    }
                }
                if (a.params.step) dt.interactive(saved);
                break;

            case "file-replace":
                if (!isActionComplete(a)) throw new InternalError(`file-replace with no lines`);
                await fileReplace(dt, a);
                break;

            default:
                throw new Error(`Unrecognized action ${a.type}`);
        }
    }
}
