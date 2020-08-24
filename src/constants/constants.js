export const EXECUTING_STEPS_KEYS = {
    START: "Start",
    CHECK_ACCOUNT: "CheckAccount",
    INPUT_ACCOUNT: "InputAccount",
    PREPARE_TOKEN: "PrepareToken",
    AUTHENTICATE:  "Authenticate",
    LIST_PROJECTS: "ListProjects",
    CHECK_PROJECT: "CheckProject",
    INPUT_PROJECT: "InputProject",
    LOAD_DOCUMENT: "LoadDocument",
    STAT_DOCUMENT: "StatDocument",
    EDIT_DOCUMENT: "EditDocument",
    SAVE_DOCUMENT: "SaveDocument",
    ENUMERATE_DOCUMENT_LAYERS: "EnumerateDocumentLayers",
    ENUMERATE_CHILDREN_LAYERS: "EnumerateChildrenLayers",
    REPORT_SUCCESS: "ReportSuccess"
};

export function stepsMessages() {
    return {
        START: " | Start.",
        CHECK_ACCOUNT: " | Checking account.",
        INPUT_ACCOUNT: " | Waiting for account user input.",
        PREPARE_TOKEN: " | Waiting for server.",
        AUTHENTICATE:  " | Waiting for server.",
        LIST_PROJECTS: " | Downloading project list.",
        CHECK_PROJECT: " | Checking account.",
        INPUT_PROJECT: " | Waiting for account user input.",
        LOAD_DOCUMENT: " | Waiting for server.",
        STAT_DOCUMENT: " | Waiting for server.",
        EDIT_DOCUMENT: () => (!!this.layerUploadObject.length)
            ? " | Uploading data. " + this.layerUploadObject.length + " layers and " + this.imageUploadObject.length + " images left."
            : " | Uploading data. " + this.imageUploadObject.length + " images left.",
        SAVE_DOCUMENT: " | Waiting for server.",
        ENUMERATE_DOCUMENT_LAYERS: () => " | Enumerating layers. " + this.artboardCounter + " artboards and " + this.layerCounter + " layers found so far.",
        ENUMERATE_CHILDREN_LAYERS: () => " | Enumerating layers. " + this.artboardCounter + " artboards and " + this.layerCounter + " layers found so far.",
        REPORT_SUCCESS: " | Success."
    }
}

export function createSteps(message = '') {
    return new Map([
        [EXECUTING_STEPS_KEYS, () => message += this.STEPS_MASSAGES.START],
        [EXECUTING_STEPS_KEYS.CHECK_ACCOUNT, () => message += this.STEPS_MASSAGES.CHECK_ACCOUNT],
        [EXECUTING_STEPS_KEYS.INPUT_ACCOUNT, () =>  message += this.STEPS_MASSAGES.INPUT_ACCOUNT],
        [EXECUTING_STEPS_KEYS.PREPARE_TOKEN, () => message += this.STEPS_MASSAGES.PREPARE_TOKEN],
        [EXECUTING_STEPS_KEYS.AUTHENTICATE, () => message += this.STEPS_MASSAGES.AUTHENTICATE],
        [EXECUTING_STEPS_KEYS.LIST_PROJECTS, () => message += this.STEPS_MASSAGES.LIST_PROJECTS],
        [EXECUTING_STEPS_KEYS.CHECK_PROJECT, () => message += this.STEPS_MASSAGES.CHECK_PROJECT],
        [EXECUTING_STEPS_KEYS.INPUT_PROJECT, () => message += this.STEPS_MASSAGES.INPUT_PROJECT],
        [EXECUTING_STEPS_KEYS.LOAD_DOCUMENT, () => message += this.STEPS_MASSAGES.LOAD_DOCUMENT],
        [EXECUTING_STEPS_KEYS.STAT_DOCUMENT, () => message += this.STEPS_MASSAGES.STAT_DOCUMENT],
        [EXECUTING_STEPS_KEYS.EDIT_DOCUMENT, () => message += this.STEPS_MASSAGES.EDIT_DOCUMENT()],
        [EXECUTING_STEPS_KEYS.SAVE_DOCUMENT, () => message += this.STEPS_MASSAGES.SAVE_DOCUMENT],
        [EXECUTING_STEPS_KEYS.ENUMERATE_DOCUMENT_LAYERS, () => message += this.STEPS_MASSAGES.ENUMERATE_DOCUMENT_LAYERS()],
        [EXECUTING_STEPS_KEYS.ENUMERATE_CHILDREN_LAYERS, () => message += this.STEPS_MASSAGES.ENUMERATE_CHILDREN_LAYERS()],
        [EXECUTING_STEPS_KEYS.REPORT_SUCCESS, () => message += this.STEPS_MASSAGES.REPORT_SUCCESS]
    ]);
}