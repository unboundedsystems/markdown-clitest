import { UserError } from "@adpt/utils";
import { Action } from "./actions";

/**
 * A UserError where the user has given an incorrect parameter to the action
 * or otherwise incorrectly used the action.
 */
export class ActionError extends UserError {
    constructor(action: Action, msg: string) {
        super(`${msg} [${action.filename}:${action.actionLineNum}]`);
    }
}
