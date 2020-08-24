import sketch from "sketch"
import dom from "sketch/dom"
import ui from "sketch/ui"
import {createSteps, EXECUTING_STEPS_KEYS, stepsMessages} from "./constants/constants";


const fetch = require("sketch-polyfill-fetch");
const base64 = require("./base64.js");
const settingsManagerFactory = require("./settingsmanager.js");
const settingsWindowFactory = require("./settingswindow.js");


function assignmentBugWorkaround(buggyValue) {
    return buggyValue;
}


class StateMachine {
    constructor(document) {
        this.totalTimeFrom = Date.now();
        this.document = document;
        this.settings = settingsManagerFactory.create(this.document, this.totalTimeFrom);
        this.stepStack = [];
        this.stepTimeFrom = 0;
        this.currentStep = null;
        this.loopIsRunning = false;
        this.hasError = false;
        this.errorTitle = undefined;
        this.errorDescription = undefined;

        this.tokenID = null;
        this.sessionID = null;

        this.projects = [];
        this.project = null;

        this.imageStats = {};

        this.artboardCounter = 0;
        this.layerCounter = 0;
        this.layerFilterQueue = [];
        this.layerUploadObject = [];
        this.imageCounter = 0;
        this.imageFilterQueue = [];
        this.imageUploadObject = [];

        this.totalDownloadSize = 0;
        this.totalUploadSize = 0;
        this.serverTime = 0;
        this.totalCreateCounter = 0;
        this.totalUpdateCounter = 0;
        this.totalDeleteCounter = 0;

        this.STEPS_MASSAGES = stepsMessages.call(this);
        this.EXECUTING_STEPS_KEYS = EXECUTING_STEPS_KEYS;
        this.callableMap = new Map([
            [this.EXECUTING_STEPS_KEYS.START, this.stepStart.bind(this)],
            [this.EXECUTING_STEPS_KEYS.CHECK_ACCOUNT, this.stepCheckAccount.bind(this)],
            [this.EXECUTING_STEPS_KEYS.INPUT_ACCOUNT, this.stepInputAccount.bind(this)],
            [this.EXECUTING_STEPS_KEYS.PREPARE_TOKEN, this.stepPrepareToken.bind(this)],
            [this.EXECUTING_STEPS_KEYS.AUTHENTICATE, this.stepAuthenticate.bind(this)],
            [this.EXECUTING_STEPS_KEYS.LIST_PROJECTS, this.stepListProjects.bind(this)],
            [this.EXECUTING_STEPS_KEYS.CHECK_PROJECT, this.stepCheckProject.bind(this)],
            [this.EXECUTING_STEPS_KEYS.INPUT_PROJECT, this.stepInputProject.bind(this)],
            [this.EXECUTING_STEPS_KEYS.LOAD_DOCUMENT, this.stepLoadDocument.bind(this)],
            [this.EXECUTING_STEPS_KEYS.STAT_DOCUMENT, this.stepStatDocument.bind(this)],
            [this.EXECUTING_STEPS_KEYS.EDIT_DOCUMENT, this.stepEditDocument.bind(this)],
            [this.EXECUTING_STEPS_KEYS.SAVE_DOCUMENT, this.stepSaveDocument.bind(this)],
            [this.EXECUTING_STEPS_KEYS.ENUMERATE_DOCUMENT_LAYERS, this.stepEnumerateDocumentLayers.bind(this)],
            [this.EXECUTING_STEPS_KEYS.ENUMERATE_CHILDREN_LAYERS, this.stepEnumerateChildrenLayers.bind(this)],
            [this.EXECUTING_STEPS_KEYS.REPORT_SUCCESS, this.stepReportSuccess.bind(this)]
        ]);
    }

    utilFormatSize(byteNumber) {
        if (byteNumber < 1024) {
            return byteNumber + " bytes";
        } else if (byteNumber < 1024 * 1024) {
            return (Math.round(100.0 * byteNumber / (1024.0)) / 100.0) + " Kb";
        } else if (byteNumber < 1024 * 1024 * 1024) {
            return (Math.round(100.0 * byteNumber / (1024.0 * 1024.0)) / 100.0) + " Mb";
        } else {
            return (Math.round(100.0 * byteNumber / (1024.0 * 1024.0 * 1024.0)) / 100.0) + " Gb";
        }
    }

    utilFormatTime(secondNumber) {
        const minutes = Math.floor(secondNumber / 60);
        const seconds = secondNumber % 60;

        return ("00" + minutes.toFixed(0)).slice(-2) + ":" + ("00" + seconds.toFixed(0)).slice(-2);
    }

    utilFormatError(error) {
        if (typeof error.localizedDescription === "function") {
            return error.localizedDescription();
        } else if (typeof error.nativeException === "object") {
            return String(error) + "\n" + String(error.nativeException);
        } else {
            return String(error);
        }
    }

    getJsonRpc(suffix) {
        return fetch(this.settings.getEndpoint() + suffix, {
            method: "GET",
            params: {
                "jsonrpc": "2.0",
                "id": 0,
                "method": "session.init",
                "params": {}
            },
        })
    }

    async postJsonRpc(suffix, methodName, params) {
        const headers = {};

        if (this.tokenID) {
            if (this.sessionID) {
                headers["Cookie"] = "sessionid=" + this.sessionID + "; csrftoken=" + this.tokenID;
                headers["X-CSRFToken"] = this.tokenID;
            } else {
                headers["Cookie"] = "csrftoken=" + this.tokenID;
                headers["X-CSRFToken"] = this.tokenID;
            }
        }

        const response = await fetch(
            this.settings.getEndpoint() + suffix,
            {
                method: "POST",
                body: {
                    "jsonrpc": "2.0",
                    "method": methodName,
                    "id": Date.now(),
                    "params": params
                },
                headers: headers
            })

        switch (response.status) {
            case 200: {
                return response;
            }
            case 403: {
                this.handleRequestError('HTTP ERROR', "Invalid user data");
                this.settings.makeShowSettings("account");
                this.enqueueNextStep(EXECUTING_STEPS_KEYS.INPUT_ACCOUNT);
                return null
            }
            default: {
                const errorDescription = response.status + ": " + response.statusText;
                this.handleRequestError("INVALID RESPONSE", errorDescription);
                this.enqueueNextStep(null);
                return null;
            }
        }
    }

    handleRequestError(title, error) {
        this.hasError = true;
        this.errorTitle = title;
        this.errorDescription = (typeof error === 'string') ? error : this.utilFormatError(error);
    }

    extractJsonRpc(json) {
        const version = json["jsonrpc"];
        if (version !== "2.0") {
            const errorDescription = "Invalid version. Expected 2.0, got '" + version + "'";
            this.handleRequestError("JSON RPC ERROR", errorDescription);
            this.loopIsRunning = false

            return null;
        }

        const error = json["error"];

        if (!!error) {
            this.handleRequestError('JSON RPC ERROR', error);
            this.loopIsRunning = false

            return null;
        }

        this.totalUploadSize += json[".request.size"];
        this.serverTime += json[".request.time"];

        return json["result"];
    }

    enqueueNextStep(name) {
        this.loopIsRunning = true;

        if (name != null) {
            this.stepStack.splice(0, 0, name);
        }

        setTimeout(this.executeNextStepInternal.bind(this), 0);
    }

    reportCurrentStep() {
        const now = Date.now();
        const totalElapsed = Math.round((now - this.totalTimeFrom) / 1000);
        let message =
            "🕑 " + this.utilFormatTime(totalElapsed) +
            " | ⇑ " + this.utilFormatSize(this.totalUploadSize) +
            " | ⇓ " + this.utilFormatSize(this.totalDownloadSize);

        this.EXECUTING_STEPS_MESSAGES = createSteps.call(this, message);

        if (!!this.currentStep) {
            message = this.EXECUTING_STEPS_MESSAGES.get(this.currentStep)();
            ui.message(message);
        }

        if (this.loopIsRunning) {
            setTimeout(this.reportCurrentStep.bind(this), 500);
        } else {
            console.log(new Date(now).toISOString() + "; STOP");
        }
    }

    executeNextStepInternal() {
        if (!!this.currentStep) {
            const stepDuration = (Date.now() - this.stepTimeFrom);

            console.log("} //" + this.currentStep + "; " + stepDuration + "ms; " + new Date(Date.now()).toISOString());

            if (this.hasError) {
                console.log("ERROR: " + this.errorTitle + "; " + this.errorDescription);
                this.hasError = false;
                ui.alert(this.errorTitle, this.errorDescription);
            }
        }

        if (!this.stepStack.length) {
            this.loopIsRunning = false;
            this.currentStep = null;
            return;
        }

        this.currentStep = this.stepStack.pop();

        try {
            if (this.currentStep === this.EXECUTING_STEPS_KEYS.REPORT_SUCCESS) {
                this.loopIsRunning = false;
                console.log(this.currentStep + " { } // " + new Date(Date.now()).toISOString());
            } else {
                this.loopIsRunning = true;
                console.log(this.currentStep + " { // " + new Date(Date.now()).toISOString());
            }

            const func = this.callableMap.get(this.currentStep);

            this.stepTimeFrom = Date.now();
            func();
        } catch (e) {
            console.log(e.message);
            this.handleRequestError("INTERNAL ERROR", e.message)
            this.loopIsRunning = false
        }
    }

    stepStart() {
        this.enqueueNextStep(EXECUTING_STEPS_KEYS.CHECK_ACCOUNT);
    }

    stepCheckAccount() {
        if (this.settings.shouldShowSettings("account") || !this.settings.isAccountValid()) {
            this.enqueueNextStep(this.EXECUTING_STEPS_KEYS.INPUT_ACCOUNT);
        } else {
            this.enqueueNextStep(this.EXECUTING_STEPS_KEYS.PREPARE_TOKEN);
        }
    }

    stepInputAccount() {
        const settingWindow = settingsWindowFactory
            .create(this.settings, true, false, true, "account", this.projects);

        if (settingWindow.run()) {
            this.enqueueNextStep(this.EXECUTING_STEPS_KEYS.CHECK_ACCOUNT);
        } else {
            this.handleRequestError("(C01) USER INPUT", "Account is required.")
            this.enqueueNextStep(null);
        }
    }

    async stepPrepareToken() {
        const getJsonRpc = await this.getJsonRpc("core/v1");

        this.totalDownloadSize += Number(getJsonRpc.headers.get('Content-Length'));
        try {
            const responseJson = await getJsonRpc.json()
            const result = this.extractJsonRpc(responseJson);
            if (result !== null) {
                this.tokenID = responseJson[".csrf.token"];
                this.enqueueNextStep(EXECUTING_STEPS_KEYS.AUTHENTICATE);
            } else {
                this.enqueueNextStep(null);
            }
        } catch (e) {
            this.handleRequestError("(D01) INVALID JSON", e);
            this.enqueueNextStep(null);
        }
    }

    async stepAuthenticate() {
        const sessionPattern = /sessionid=([A-Za-z0-9]+)/s;
        const postJsonRpc = await this.postJsonRpc("core/v1", "session.init",
            [this.settings.getUsername(), this.settings.getPassword()])

        this.totalDownloadSize += Number(postJsonRpc.headers.get('Content-Length'));

        try {
            const responseJson = await postJsonRpc.json();
            const result = this.extractJsonRpc(responseJson);

            if (result !== null) {
                if (!result["id"]) {
                    this.settings.makeShowSettings("account");
                    this.enqueueNextStep(EXECUTING_STEPS_KEYS.INPUT_ACCOUNT);
                } else {
                    const setCookieHeader = String(postJsonRpc.headers.get('set-cookie'));
                    const sessionMatch = sessionPattern.exec(setCookieHeader);

                    if (!sessionMatch) {
                        const errorDescription = postJsonRpc.status + ": Session cookie is missing."
                        this.handleRequestError("(E04) INVALID RESPONSE", errorDescription)
                        this.enqueueNextStep(null);
                    } else {
                        this.sessionID = sessionMatch[1];
                    }

                    this.enqueueNextStep(EXECUTING_STEPS_KEYS.LIST_PROJECTS);
                }
            } else {
                this.enqueueNextStep(null);
            }
        } catch (e) {
            this.handleRequestError("(E01) INVALID JSON", e);
            this.enqueueNextStep(null);
        }
    }

    async stepListProjects() {
        if (!!this.projects.length) {
            this.enqueueNextStep(EXECUTING_STEPS_KEYS.CHECK_PROJECT);
            return;
        }

        const postJsonRpc = await this.postJsonRpc("sketch/v1", "project.list", null);

        try {
            this.totalDownloadSize += Number(postJsonRpc.headers.get('Content-Length'));
            const responseJson = await postJsonRpc.json();
            const result = this.extractJsonRpc(responseJson);

            if (!!result) {
                this.projects = result;
                this.enqueueNextStep(EXECUTING_STEPS_KEYS.CHECK_PROJECT);
            } else {
                this.enqueueNextStep(null);
            }
        } catch (e) {
            this.handleRequestError("(F01) INVALID JSON", e);
            this.enqueueNextStep(null);
        }
    }

    stepCheckProject() {
        const shouldShowSettings = this.settings.shouldShowSettings("project");
        const isProjectValid = this.settings.isProjectValid();

        if (shouldShowSettings || !isProjectValid) {
            this.enqueueNextStep(EXECUTING_STEPS_KEYS.INPUT_PROJECT);
            return;
        }

        this.projects.forEach(project => {
            if (project.id === this.settings.getProject()) {
                this.project = project;
            }
        })

        this.enqueueNextStep(EXECUTING_STEPS_KEYS.LOAD_DOCUMENT);
    }

    stepInputProject() {
        if (!this.projects || !this.projects || !this.projects.length) {
            this.handleRequestError("(H02) SERVER DATA", "Projects cannot be found.");
            this.enqueueNextStep(null);
        } else {
            const settingWindow = settingsWindowFactory.create(this.settings,
                false, true, true, "project", this.projects);

            if (settingWindow.run()) {
                this.enqueueNextStep(EXECUTING_STEPS_KEYS.CHECK_PROJECT);
            } else {
                this.handleRequestError("(H01) USER INPUT", "Project is required.")
                this.enqueueNextStep(null);
            }
        }
    }

    async stepLoadDocument() {
        const uuid = assignmentBugWorkaround(this.document.id);
        const postJsonRpc = await this.postJsonRpc("sketch/v1", "document.load",
            [uuid, this.settings.getProject()]);

        try {
            this.totalDownloadSize += Number(postJsonRpc.headers.get('Content-Length'));
            const responseJson = await postJsonRpc.json();

            this.extractJsonRpc(responseJson);
            this.enqueueNextStep(EXECUTING_STEPS_KEYS.STAT_DOCUMENT);
        } catch (e) {
            this.handleRequestError("(I01) INVALID JSON", e);
            this.enqueueNextStep(null);
        }
    }

    async stepStatDocument() {
        const uuid = assignmentBugWorkaround(this.document.id);
        const postJsonRpc = await this.postJsonRpc("sketch/v1", "document.stat", [uuid]);
        try {
            this.totalDownloadSize += Number(postJsonRpc.headers.get('Content-Length'));

            const responseJson = await postJsonRpc.json();

            const result = this.extractJsonRpc(responseJson);

            this.imageStats = result['images'];
            this.enqueueNextStep(EXECUTING_STEPS_KEYS.ENUMERATE_DOCUMENT_LAYERS);
        } catch (e) {
            this.handleRequestError("(J01) INVALID JSON", e);
            this.enqueueNextStep(null);
        }
    }

    async stepEditDocument() {
        const uuid = assignmentBugWorkaround(this.document.id);
        const layers = [];
        const images = [];

        if (!!this.layerUploadObject.length) {
            layers.push(this.layerUploadObject.pop());
        } else if (!!this.imageUploadObject.length) {
            let cumulativeSize = 0;

            while (cumulativeSize < 1024 * 1024) {
                const image = this.imageUploadObject.pop();

                if (!image) {
                    break;
                }

                let pngImage = image["png_image"];
                let svgImage = image["svg_image"];

                if (pngImage != null) {
                    cumulativeSize += pngImage.length;
                }

                if (svgImage != null) {
                    cumulativeSize += svgImage.length;
                }

                images.push(image);
            }
        }

        if ((!layers.length) && (!images.length)) {
            this.enqueueNextStep(EXECUTING_STEPS_KEYS.SAVE_DOCUMENT);
        } else {
            const postJsonRpc = await this.postJsonRpc("sketch/v1", "document.edit", [uuid, layers, images])
            try {
                this.totalDownloadSize += Number(postJsonRpc.headers.get('Content-Length'));

                const responseJson = await postJsonRpc.json();
                const result = this.extractJsonRpc(responseJson);

                this.enqueueNextStep(EXECUTING_STEPS_KEYS.EDIT_DOCUMENT);
            } catch (e) {
                this.handleRequestError("(K01) INVALID JSON", e);
                this.enqueueNextStep(null);
            }
        }
    }

    async stepSaveDocument() {
        const uuid = assignmentBugWorkaround(this.document.id);

        const postJsonRpc = await this.postJsonRpc("sketch/v1", "document.save", [uuid])
        try {
            this.totalDownloadSize += Number(postJsonRpc.headers.get('Content-Length'));

            const responseJson = await postJsonRpc.json();
            const result = this.extractJsonRpc(responseJson);

            this.totalCreateCounter = result['created'];
            this.totalUpdateCounter = result['updated'];
            this.totalDeleteCounter = result['deleted'];

            this.enqueueNextStep(EXECUTING_STEPS_KEYS.REPORT_SUCCESS);
        } catch (e) {
            this.handleRequestError("(L01) INVALID JSON", e);
            this.enqueueNextStep(null);
        }
    }

    stepEnumerateDocumentLayers() {
        const uuid = assignmentBugWorkaround(this.document.id);
        const documentLayers = [];

        this.document.pages.forEach(page => this.layerFilterQueue.push([page, documentLayers]));

        this.layerUploadObject = [{
            "id": uuid,
            "type": this.document.type,
            "name": this.document.path === undefined ? "Document Is Not Saved" : this.document.path,
            "master_id": null,
            "master_library_name": null,
            "master_library_type": null,
            "master_library_valid": false,
            "master_library_enabled": false,
            "target_id": null,
            "text": null,
            "rect": null,
            "svg_image": null,
            "layers": documentLayers
        }];
        this.imageUploadObject = [];

        this.enqueueNextStep(EXECUTING_STEPS_KEYS.ENUMERATE_CHILDREN_LAYERS);
    }

    stepEnumerateChildrenLayers() {
        const deadline = Date.now() + 1000;
        const temp = [];
        while ((!!this.layerFilterQueue.length) && (Date.now() < deadline)) {
            const currentItem = this.layerFilterQueue.pop();
            const currentLayer = currentItem[0];
            const parentLayers = currentItem[1];
            let isFilteredOut = currentLayer.hidden;
            if (!isFilteredOut) {
                this.project.filters.forEach(filter => {
                    if ((filter.type === '*') || (filter.type === currentLayer.type)) {
                        if (filter.name.startsWith('/') && filter.name.endsWith('/')) {
                            if (RegExp(filter.name.substring(1, filter.name.length - 1), "u").test(currentLayer.name)) {
                                isFilteredOut = true;
                            }
                        } else {
                            if (filter.name === currentLayer.name) {
                                isFilteredOut = true;
                            }
                        }
                    }
                });
            }

            if (!isFilteredOut) {
                let svgImage = null;
                if ((currentLayer.type === "Page") ||
                    (currentLayer.type === "Artboard") ||
                    (currentLayer.type === "SymbolMaster") ||
                    (currentLayer.type === "SymbolInstance") ||
                    (currentLayer.type === "Group") ||
                    (currentLayer.type === "Text") ||
                    (currentLayer.type === "Shape")) {
                    this.layerCounter++;

                    if (currentLayer.type === "Artboard") {
                        this.artboardCounter++;
                    }

                    const uuid = assignmentBugWorkaround(currentLayer.id);
                    let masterUuid = null;
                    let masterLibraryName = null;
                    let masterLibraryType = null;
                    let masterLibraryValid = false;
                    let masterLibraryEnabled = false;
                    let text = null;
                    let rect = null;
                    if (currentLayer.type === "SymbolInstance") {
                        currentLayer.overrides.forEach(override => {
                            if (override.property === "stringValue") {
                                const node = this.document.getLayerWithID(override.path);
                                node.text = override.value;
                            }
                        });

                        const master = currentLayer.master;

                        if (!!master) {
                            masterUuid = assignmentBugWorkaround(master.id);

                            const library = master.getLibrary();

                            if (library != null) {
                                masterLibraryName = library.name;
                                masterLibraryType = library.type;
                                masterLibraryValid = library.valid;
                                masterLibraryEnabled = library.enabled;
                            }
                        }
                    } else if (currentLayer.type === "SymbolMaster") {
                        const library = currentLayer.getLibrary();

                        if (library !== null) {
                            masterLibraryName = library.name;
                            masterLibraryType = library.type;
                            masterLibraryValid = library.valid;
                            masterLibraryEnabled = library.enabled;
                        } else {
                            masterLibraryType = "Local";
                            masterLibraryValid = true;
                            masterLibraryEnabled = true;
                        }
                    } else if (currentLayer.type === "Text") {
                        text = currentLayer.text;

                        const svgOptions = {formats: "svg", output: false};
                        const svgBuffer = sketch.export(currentLayer, svgOptions);

                        svgImage = base64.encodeBin(svgBuffer);
                    }

                    let targetUuid = null;

                    if (!!currentLayer.flow) {
                        if (currentLayer.flow.targetId === dom.Flow.BackTarget) {
                            targetUuid = "00000000-0000-0000-0000-000000000000";
                        } else {
                            targetUuid = currentLayer.flow.targetId;
                        }
                    }

                    if (!!currentLayer.frame) {
                        rect = {
                            "x": currentLayer.frame.x,
                            "y": currentLayer.frame.y,
                            "w": currentLayer.frame.width,
                            "h": currentLayer.frame.height
                        };
                    }

                    if (!!currentLayer.frame && currentLayer.parent && currentLayer.parent.type !== "Page"
                        && currentLayer.parent.type !== "Artboard") {
                        if (currentLayer.parent && currentLayer.parent.frame) {
                            const tempParent = temp.find(item => item.id === currentLayer.parent.id)
                            if (tempParent) {
                                rect = {
                                    "x": currentLayer.frame.x + tempParent.rect.x,
                                    "y": currentLayer.frame.y + tempParent.rect.y,
                                    "w": currentLayer.frame.width,
                                    "h": currentLayer.frame.height
                                };
                            }
                        }
                    }

                    const childLayers = [];

                    if (!!currentLayer.layers) {
                        currentLayer.layers.forEach(childLayer => {
                                this.layerFilterQueue.push([childLayer, childLayers]);
                            }
                        );
                    }

                    temp.push({
                        id: currentLayer.id,
                        rect: {
                            x: rect.x,
                            y: rect.y
                        }
                    })

                    parentLayers.push({
                        "id": uuid,
                        "type": currentLayer.type === "SymbolInstance" ? "SymbolInstance2" : currentLayer.type,
                        "name": currentLayer.name,
                        "master_id": masterUuid,
                        "master_library_name": masterLibraryName,
                        "master_library_type": masterLibraryType,
                        "master_library_valid": masterLibraryValid,
                        "master_library_enabled": masterLibraryEnabled,
                        "target_id": targetUuid,
                        "text": text,
                        "rect": rect,
                        "svg_image": svgImage,
                        "layers": childLayers
                    });
                }

                if (currentLayer.type === "Artboard") {
                    const uuid = assignmentBugWorkaround(currentLayer.id);
                    let imageStats = this.imageStats[uuid];

                    if (!imageStats === undefined) {
                        imageStats = {"svg_image_size": -1, "png_image_size": -1};
                    }

                    const pngOptions = {formats: "png", output: false};
                    const pngBuffer = sketch.export(currentLayer, pngOptions);

                    let pngImage = base64.encodeBin(pngBuffer);

                    if (pngBuffer.length !== imageStats["png_image_size"]) {
                        this.imageUploadObject.push({
                            "id": uuid,
                            "png_image": pngImage
                        });

                        this.imageCounter++;
                    }
                } else if (currentLayer.type === "Text") {
                    const uuid = assignmentBugWorkaround(currentLayer.id);
                    let imageStats = this.imageStats[uuid];

                    if (imageStats === undefined) {
                        imageStats = {"svg_image_size": -1, "png_image_size": -1};
                    }

                    if (svgImage.length !== imageStats["svg_image_size"]) {
                        const pngOptions = {formats: "png", output: false};
                        const pngBuffer = sketch.export(currentLayer, pngOptions);

                        const pngImage = base64.encodeBin(pngBuffer);

                        if (pngBuffer.length !== imageStats["png_image_size"]) {
                            this.imageUploadObject.push({
                                "id": uuid,
                                "png_image": pngImage
                            });

                            this.imageCounter++;
                        }
                    }
                }
            }
        }

        if (this.layerFilterQueue.length > 0) {
            this.enqueueNextStep(EXECUTING_STEPS_KEYS.ENUMERATE_CHILDREN_LAYERS);
        } else {
            this.enqueueNextStep(EXECUTING_STEPS_KEYS.EDIT_DOCUMENT);
        }
    }

    stepReportSuccess() {
        const totalTime = Date.now() - this.totalTimeFrom;
        const clientTime = Math.round((totalTime - this.serverTime) / 1000);
        const serverTime = Math.round((totalTime - 1000 * clientTime) / 1000);

        ui.alert(
            "SUCCESS",
            "Document successfully uploaded.\n" +
            " * " + this.utilFormatSize(this.totalUploadSize) + " uploaded.\n" +
            " * " + this.utilFormatSize(this.totalDownloadSize) + " downloaded.\n" +
            " * " + this.totalCreateCounter + " objects created.\n" +
            " * " + this.totalUpdateCounter + " objects updated.\n" +
            " * " + this.totalDeleteCounter + " objects deleted.\n" +
            this.utilFormatTime(clientTime) + " seconds spent on client.\n" +
            this.utilFormatTime(serverTime) + " seconds spent on server.");
    }
}


export default function () {
    console.log("----------------------------------------")
    const document = sketch.getSelectedDocument();

    if (document === undefined) {
        ui.alert("FAILURE", "No document selected.");
        return;
    }

    const stateMachine = new StateMachine(document);

    stateMachine.enqueueNextStep(EXECUTING_STEPS_KEYS.START);
    stateMachine.reportCurrentStep();
}
