import sketch from 'sketch';
import ui from 'sketch/ui';
import { createSteps, EXECUTING_STEPS_KEYS, LAYER_TYPES, stepsMessages } from './constants/constants';

const Buffer = require('buffer/').Buffer;

const fetch = require('sketch-polyfill-fetch');
const settingsManagerFactory = require('./settingsmanager.js');
const settingsWindowFactory = require('./settingswindow.js');
const ENDPOINTS_LIST = {
	getToken: 'api/v2/authnz/refresh-token/',
	createAccessTokenByRefresh: 'api/v2/authnz/access-token/',
	createDocument: 'api/v2/snapshots/documents/',
	uploadScreen: 'api/v2/snapshots/screens/',
	markDocumentAsCompleted: (documentId) => `api/v2/snapshots/documents/${documentId}/`,
	saveTransition: 'api/v2/snapshots/transitions/',
};

class StateMachine {
	errorTitle = 'Default Error';
	errorDescription = 'Something went wrong';

	constructor (document) {
		this.totalTimeFrom = Date.now();
		this.document = document;
		this.settings = settingsManagerFactory.create(this.document, this.totalTimeFrom);
		this.stepStack = [];
		this.stepTimeFrom = 0;
		this.currentStep = null;
		this.loopIsRunning = false;
		this.hasError = false;

		this.accessToken = null;
		this.refreshToken = null;
		this.projects = [];
		this.project = null;
		this.tokenExpirationDate = null;

		this.pagesList = [];
		this.artboardList = [];

		this.transitions = [];
		this.artboardCounter = 0;
		this.layerCounter = 0;
		this.layerFilterQueue = [];
		this.layerUploadObject = [];
		this.imageCounter = 0;

		this.serverTime = 0;

		this.LAYER_TYPES = LAYER_TYPES;
		this.STEPS_MASSAGES = stepsMessages.call(this);
		this.EXECUTING_STEPS_KEYS = EXECUTING_STEPS_KEYS;
		this.callableMap = new Map([
			[this.EXECUTING_STEPS_KEYS.START, this.stepStart.bind(this)],
			[this.EXECUTING_STEPS_KEYS.CHECK_ACCOUNT, this.stepCheckAccount.bind(this)],
			[this.EXECUTING_STEPS_KEYS.INPUT_ACCOUNT, this.stepInputAccount.bind(this)],
			[this.EXECUTING_STEPS_KEYS.PREPARE_TOKEN, this.stepPrepareToken.bind(this)],
			[this.EXECUTING_STEPS_KEYS.UPLOAD_DOCUMENT, this.stepUploadDocument.bind(this)],
			[this.EXECUTING_STEPS_KEYS.SAVE_SCREENS, this.stepSaveScreens.bind(this)],
			[this.EXECUTING_STEPS_KEYS.ENUMERATE_DOCUMENT_LAYERS, this.stepEnumerateDocumentLayers.bind(this)],
			[this.EXECUTING_STEPS_KEYS.SAVE_TRANSITIONS, this.stepSaveTransitions.bind(this)],
			[this.EXECUTING_STEPS_KEYS.MARK_DOCUMENT_AS_COMPLETED, this.markDocumentAsCompleted.bind(this)],
			[this.EXECUTING_STEPS_KEYS.REPORT_SUCCESS, this.stepReportSuccess.bind(this)],
		]);
	}

	utilFormatTime (secondNumber) {
		const minutes = Math.floor(secondNumber / 60);
		const seconds = secondNumber % 60;

		return ('00' + minutes.toFixed(0)).slice(-2) + ':' + ('00' + seconds.toFixed(0)).slice(-2);
	}

	utilFormatError (error) {
		if (typeof error.localizedDescription === 'function') {
			return error.localizedDescription();
		} else if (typeof error.nativeException === 'object') {
			return String(error) + '\n' + String(error.nativeException);
		}

		return String(error);
	}

	handleRequestError (title, error) {
		this.hasError = true;
		this.errorTitle = title;
		this.errorDescription = (typeof error === 'string') ? error : this.utilFormatError(error);
	}

	enqueueNextStep (name) {
		this.loopIsRunning = true;

		if (name !== null) {
			this.stepStack.splice(0, 0, name);
		}

		setTimeout(this.executeNextStepInternal.bind(this), 0);
	}

	reportCurrentStep () {
		const now = Date.now();
		const totalElapsed = Math.round((now - this.totalTimeFrom) / 1000);
		let message =
			'🕑 ' + this.utilFormatTime(totalElapsed);

		this.EXECUTING_STEPS_MESSAGES = createSteps.call(this, message);

		if (!!this.currentStep) {
			message = this.EXECUTING_STEPS_MESSAGES.get(this.currentStep)();
			ui.message(message);
		}

		if (this.loopIsRunning) {
			setTimeout(this.reportCurrentStep.bind(this), 500);
		} else {
			console.log(new Date(now).toISOString() + '; STOP');
		}
	}

	executeNextStepInternal () {
		if (!!this.currentStep) {
			const stepDuration = (Date.now() - this.stepTimeFrom);

			console.log(`} // ${this.currentStep}; ${stepDuration}ms; ${new Date(Date.now()).toISOString()}`);

			if (this.hasError) {
				console.log(`ERROR: ${this.errorTitle}; ${this.errorDescription}`);
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
			this.checkExecutionSteps();

			const func = this.callableMap.get(this.currentStep);
			this.stepTimeFrom = Date.now();

			func();
		} catch (e) {
			console.log(e.message);
			this.handleRequestError('INTERNAL ERROR', e.message);
			this.loopIsRunning = false;
		}
	}

	checkExecutionSteps () {
		if (this.currentStep === this.EXECUTING_STEPS_KEYS.REPORT_SUCCESS) {
			this.loopIsRunning = false;
			console.log(`${this.currentStep} { } // ${new Date(Date.now()).toISOString()}`);
		} else {
			this.loopIsRunning = true;
			console.log(`${this.currentStep} { // ${new Date(Date.now()).toISOString()}`);
		}
	}

	stepStart () {
		this.enqueueNextStep(EXECUTING_STEPS_KEYS.CHECK_ACCOUNT);
	}

	stepCheckAccount () {
		if (this.settings.shouldShowSettings('account') || !this.settings.isAccountValid()) {
			this.enqueueNextStep(this.EXECUTING_STEPS_KEYS.INPUT_ACCOUNT);
		} else {
			this.enqueueNextStep(this.EXECUTING_STEPS_KEYS.PREPARE_TOKEN);
		}
	}

	stepInputAccount () {
		const settingWindow = settingsWindowFactory
			.create(this.settings, true, false, true, 'account', this.projects);

		if (settingWindow.run()) {
			this.enqueueNextStep(this.EXECUTING_STEPS_KEYS.CHECK_ACCOUNT);
		} else {
			this.handleRequestError('(C01) USER INPUT', 'Account is required.');
			this.enqueueNextStep(null);
		}
	}

	async getToken (endpoint) {
		try {
			return await fetch(`${this.settings.getEndpoint()}${endpoint}`, {
				method: 'POST',
				body: {
					username: this.settings.getUsername(),
					password: this.settings.getPassword(),
				},
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} catch (e) {
			this.handleRequestError('Authorization failed. Invalid username or password. Please try again with valid data.', e);
			this.enqueueNextStep(null);
		}
	}

	async checkToken () {
		try {
			const updatingTokenDate = +(new Date()) + 1000;
			if ((Number(updatingTokenDate) + 10 * 1000) >= this.tokenExpirationDate * 1000) {
				const updatedToken = await fetch(`${this.settings.getEndpoint()}${ENDPOINTS_LIST.createAccessTokenByRefresh}`, {
					method: 'POST',
					body: {
						refresh: this.refreshToken,
					},
					headers: {
						'Content-Type': 'application/json',
					},
				});
				const parsedToken = await updatedToken.json();
				const { access } = parsedToken;
				this.accessToken = access;
			}
		} catch (e) {
			console.log(e);
		}
	}

	async postJsonRpc (endpoint, params) {
		try {
			this.checkToken();
			return await fetch(
				`${this.settings.getEndpoint()}${endpoint}`,
				{
					method: 'POST',
					body: JSON.stringify(params),
					headers: {
						'Authorization': `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
				});
		} catch (e) {
			this.handleRequestError('(F01) INVALID JSON', e);
			this.enqueueNextStep(null);
		}
	}

	async stepPrepareToken () {
		const token = await this.getToken(ENDPOINTS_LIST.getToken);
		try {
			const responseJson = await token.json();
			const { access, refresh } = responseJson;
			this.accessToken = access;
			this.refreshToken = refresh;

			const tokenParts = access.split('.');
			const buff = new Buffer.from(tokenParts[1], 'base64').toString('ascii');
			const tokenInfo = JSON.parse(buff);

			this.tokenExpirationDate = tokenInfo.exp;

			this.enqueueNextStep(EXECUTING_STEPS_KEYS.UPLOAD_DOCUMENT);
		} catch (e) {
			this.handleRequestError('(D01) INVALID JSON', e);
			this.enqueueNextStep(null);
		}
	}

	async stepUploadDocument () {
		const documentName = !this.document.path
			? 'Document Is Not Saved'
			: this.document.path.slice(this.document.path.lastIndexOf('/') + 1);
		const document = {
			kind: 'sketch',
			name: documentName,
			code: this.document.id,
			pages: this.document.pages.map(page => {
				return {
					code: page.id,
					name: page.name,
				};
			}),
		};
		try {
			const response = await this.postJsonRpc(ENDPOINTS_LIST.createDocument, document);
			const responseJson = await response.json();
			this.createdDocumentId = responseJson.id;
			this.pagesList = responseJson.pages;
			this.enqueueNextStep(EXECUTING_STEPS_KEYS.ENUMERATE_DOCUMENT_LAYERS);
		} catch (e) {
			this.handleRequestError('(E01) INVALID JSON', e);
			this.enqueueNextStep(null);
		}
	}

	async stepSaveScreens () {
		this.checkToken();
		try {
			const artboards = [];
			this.layerUploadObject = this.layerUploadObject.filter(screen => !!screen.png_image_data);
			for await (let screen of this.layerUploadObject) {
				const response = await this.postJsonRpc(ENDPOINTS_LIST.uploadScreen, screen);
				artboards.push(response);
			}

			for await (let screen of artboards) {
				const response = await screen.json();
				this.artboardList.push(response);
			}

			(this.transitions.length)
				? this.enqueueNextStep(EXECUTING_STEPS_KEYS.SAVE_TRANSITIONS)
				: this.enqueueNextStep(EXECUTING_STEPS_KEYS.MARK_DOCUMENT_AS_COMPLETED);
		} catch (e) {
			this.enqueueNextStep(null);
			console.log(e);
		}
	}

	async stepSaveTransitions () {
		try {
			const response = await Promise.all(this.transitions.map(item => {
				return {
					source_screen: this.artboardList.find(artboard => artboard.code === item.source_screen).id,
					target_screen: this.artboardList.find(artboard => artboard.code === item.target_screen).id,
				};
			}).map(async (item) => {
				const savedTransition = await this.postJsonRpc(ENDPOINTS_LIST.saveTransition, item);
			}));

			this.enqueueNextStep(EXECUTING_STEPS_KEYS.MARK_DOCUMENT_AS_COMPLETED);
		} catch (e) {
			this.enqueueNextStep(null);
			console.log(e);
		}
	}

	async markDocumentAsCompleted () {
		try {
			const test = await fetch(`${this.settings.getEndpoint()}${ENDPOINTS_LIST.markDocumentAsCompleted(this.createdDocumentId)}`,
				{
					method: 'PATCH',
					body: {
						is_complete: true,
					},
					headers: {
						'Authorization': `Bearer ${this.accessToken}`,
						'Content-Type': 'application/json',
						Accept: 'application/json',
					},
				});
			this.enqueueNextStep(this.EXECUTING_STEPS_KEYS.REPORT_SUCCESS);
		} catch (e) {
			console.log(e);
			this.enqueueNextStep(null);
		}
	}

	stepEnumerateDocumentLayers () {
		const documentLayers = [];

		this.document.pages.forEach(page => {
			page.layers.forEach(layer => {
				this.layerFilterQueue.push([layer, documentLayers]);
				this.enumerateArtboard();
			});
		});

		this.layerUploadObject = documentLayers;
		this.enqueueNextStep(EXECUTING_STEPS_KEYS.SAVE_SCREENS);
	}

	enumerateArtboard () {
		const supportedLayerTypes = Object.values(this.LAYER_TYPES);
		const tempAbsoluteCoordinates = [];
		let tempOverrides = [];
		const symbolInstancePosition = [];

		while (!!this.layerFilterQueue.length) {
			const currentItem = this.layerFilterQueue.pop();
			const currentLayer = currentItem[0];
			const parentLayers = currentItem[1];
			let isTextFormatted = false;
			let text = null;

			let isFilteredOut = currentLayer.hidden;

			if (!isFilteredOut) {
				if (supportedLayerTypes.includes(currentLayer.type)) {
					this.layerCounter++;

					let rect = (!!currentLayer.frame) ? this.initRectangle(currentLayer) : null;

					let childLayers = [];

					if (!!currentLayer.layers) {
						currentLayer.layers.forEach(childLayer => {
							if (childLayer.type === 'SymbolInstance') {
								symbolInstancePosition.push(childLayer);
								const master = this.getSymbolMasterBySymbolInstance(childLayer, tempOverrides);
								this.layerFilterQueue.push([master, childLayers]);
							} else {
								this.layerFilterQueue.push([childLayer, childLayers]);
							}
						});
					}

					rect = this.calculateAbsCoordinates(currentLayer, tempAbsoluteCoordinates, rect);

					if (currentLayer.type === this.LAYER_TYPES.TEXT) {
						tempOverrides.forEach(override => {
							if (currentLayer.id === override.path) {
								isTextFormatted = true;
								text = this.getFormattedText(currentLayer, override.value).join('');
								rect = {
									...this.recalculateSymbolMasterFrame(override,
										symbolInstancePosition,
										tempAbsoluteCoordinates,
										rect),
								};
							}
						});
					}

					if (currentLayer.type === this.LAYER_TYPES.TEXT && !!currentLayer.text && !isTextFormatted) {
						text = this.getFormattedText(currentLayer).join('');
					}

					tempAbsoluteCoordinates.push({
						id: currentLayer.id,
						rect,
						type: currentLayer.type,
					});

					if (currentLayer.flow) {
						this.processLayerFlow(currentLayer);
					}

					let defaultExportedLayer = this.createDefaultExportedLayer(currentLayer, childLayers, rect);

					let exportedLayer = this.getExportedLayer(currentLayer, defaultExportedLayer, childLayers, text);

					parentLayers.push(exportedLayer);
				}
			}
		}

		if (this.layerFilterQueue.length) {
			this.enumerateArtboard();
		}

		return;
	}

	getLayerId (layers, layerId) {
		return layers.find(layer => {
			if (layer.code === layerId) {
				return layer.id;
			} else {
				this.getLayerId(layers.children, layerId);
			}
		});
	}

	recalculateSymbolMasterFrame (override, symbolInstancePosition, tempAbsoluteCoordinates, rect) {
		const rectPosition = override.getFrame();
		let currentSI = null;
		symbolInstancePosition.map(SI => {
			SI.overrides.map(over => {
				if (over.path === override.path) {
					currentSI = SI;
				}
			});
		});

		const tempPar = tempAbsoluteCoordinates.find(item => item.id === currentSI.parent.id);

		return {
			...rect,
			x: tempPar.type !== this.LAYER_TYPES.ARTBOARD ? rect.x + tempPar.rect.x : rect.x,
			y: tempPar.type !== this.LAYER_TYPES.ARTBOARD ? rect.y + tempPar.rect.y : rect.y,
			w: rectPosition.width,
			h: rectPosition.height,
		};
	}

	getSymbolMasterBySymbolInstance (childLayer, tempOverrides) {
		const overrideValue = childLayer.overrides.filter(item => item.property === 'stringValue');
		if (overrideValue) {
			overrideValue.forEach(override => {
				tempOverrides.push(override);
			});
		}

		const childFrame = childLayer.frame;
		const master = childLayer.master;
		master.frame = childFrame;

		return master;
	}

	getExportedLayer (currentLayer, defaultExportedLayer, childLayers, text) {
		return (currentLayer.type === this.LAYER_TYPES.ARTBOARD)
			? this.processArtboardLayer(currentLayer, childLayers)
			: (currentLayer.type === this.LAYER_TYPES.TEXT)
				? {
					...defaultExportedLayer,
					text: text,
				}
				: defaultExportedLayer;
	}

	processLayerFlow (currentLayer) {
		const target = this.document.getLayerWithID(currentLayer.flow.targetId);
		const target_screen = target.type === this.LAYER_TYPES.ARTBOARD
			? target.id
			: target.getParentArtboard().id;

		const source_screen = (currentLayer.type === this.LAYER_TYPES.ARTBOARD)
			? currentLayer.id
			: currentLayer.getParentArtboard().id;

		const flowItem = {
			source_screen: source_screen,
			source_layer: currentLayer.id,
			target_screen,
			target_layer: target.id,
		};

		this.transitions.push(flowItem);
	}

	processArtboardLayer (currentLayer, childLayers) {
		const pngOptions = { formats: 'png', output: false };
		const pngBuffer = sketch.export(currentLayer, pngOptions);

		this.artboardCounter++;
		this.imageCounter++;

		return {
			png_image_data: new Buffer.from(pngBuffer).toString('base64'),
			page: this.pagesList.find(item => currentLayer.parent.id === item.code).id,
			name: currentLayer.name ? currentLayer.name : 'Unnamed artboard',
			code: currentLayer.id,
			layers: childLayers,
			rect_x: Math.round(currentLayer.frame.x),
			rect_y: Math.round(currentLayer.frame.y),
			rect_w: Math.round(currentLayer.frame.width),
			rect_h: Math.round(currentLayer.frame.height),
		};
	}

	createDefaultExportedLayer (currentLayer, childLayers, rect) {
		return {
			kind: currentLayer.type,
			code: currentLayer.id,
			rect_x: Math.round(rect.x),
			rect_y: Math.round(rect.y),
			rect_w: Math.round(rect.w),
			rect_h: Math.round(rect.h),
			children: childLayers,
		};
	}

	calculateAbsCoordinates (currentLayer, temp, rect) {
		if (!!currentLayer.frame && currentLayer.parent) {
			if (currentLayer.parent.frame && currentLayer.parent.type !== this.LAYER_TYPES.PAGE
				&& currentLayer.parent.type !== this.LAYER_TYPES.ARTBOARD && currentLayer.type !== this.LAYER_TYPES.SYMBOL_MASTER) {
				const tempParent = temp.find(item => item.id === currentLayer.parent.id);
				if (tempParent) {
					return {
						'x': currentLayer.frame.x + tempParent.rect.x,
						'y': currentLayer.frame.y + tempParent.rect.y,
						'w': currentLayer.frame.width,
						'h': currentLayer.frame.height,
					};
				}
			}
		}

		return rect;
	}

	initRectangle (currentLayer) {
		return {
			'x': currentLayer.frame.x,
			'y': currentLayer.frame.y,
			'w': currentLayer.frame.width,
			'h': currentLayer.frame.height,
		};
	}

	getFormattedText (currentLayer, text) {
		const nsStringArray = currentLayer.sketchObject.attributedString().treeAsDictionary().value.attributes;
		const formattedTextArray = [];

		nsStringArray.forEach(textLayer => {
			formattedTextArray.push(this.processTextFormatting(textLayer, text));
		});

		return formattedTextArray;
	}

	processTextFormatting (nsText, text) {
		if (nsText.text === ' ') {
			return ' ';
		}

		let formattedText = (text) ? text : nsText.text;

		if (!!Number(nsText.NSStrikethrough)) {
			formattedText = `{-${formattedText}-}`;
		}

		if (!!Number(nsText.NSUnderline)) {
			formattedText = `{_${formattedText}_}`;
		}

		if (!!nsText.NSFont.name.includes('Bold')) {
			formattedText = `{*${formattedText}*}`;
		}

		if (!!nsText.NSFont.name.includes('Italic')) {
			formattedText = `{/${formattedText}/}`;
		}

		return formattedText;
	}

	stepReportSuccess () {
		const totalTime = Date.now() - this.totalTimeFrom;
		const clientTime = Math.round((totalTime - this.serverTime) / 1000);

		ui.alert(
			'SUCCESS',
			'Document successfully uploaded.\n' +
			this.utilFormatTime(clientTime) + ' seconds spent on client.\n');
		this.enqueueNextStep(null);
	}
}


export default function () {
	console.log('----------------------------------------');
	const document = sketch.getSelectedDocument();

	if (document === undefined) {
		ui.alert('FAILURE', 'No document selected.');
		return;
	}

	const stateMachine = new StateMachine(document);

	stateMachine.enqueueNextStep(EXECUTING_STEPS_KEYS.START);
	stateMachine.reportCurrentStep();
}
