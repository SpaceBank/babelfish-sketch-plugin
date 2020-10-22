import sketch from 'sketch';
import ui from 'sketch/ui';
import { createSteps, EXECUTING_STEPS_KEYS, LAYER_TYPES, stepsMessages } from './constants/constants';

const Buffer = require('buffer/').Buffer;

const fetch = require('sketch-polyfill-fetch');
const settingsManagerFactory = require('./settingsmanager.js');
const settingsWindowFactory = require('./settingswindow.js');
const ENDPOINTS_LIST = {
	getToken: 'api/v2/authnz/refresh-token/',
	createDocument: 'api/v2/snapshots/documents/',
	uploadScreen: 'api/v2/snapshots/screens/',
};

class StateMachine {
	constructor (document) {
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
		this.accessToken = null;
		this.projects = [];
		this.project = null;

		this.pagesList = [];

		this.artboardCounter = 0;
		this.layerCounter = 0;
		this.layerFilterQueue = [];
		this.layerUploadObject = [];
		this.imageCounter = 0;
		this.imageUploadObject = [];

		this.totalDownloadSize = 0;
		this.totalUploadSize = 0;
		this.serverTime = 0;
		this.totalCreateCounter = 0;
		this.totalUpdateCounter = 0;
		this.totalDeleteCounter = 0;

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
			[this.EXECUTING_STEPS_KEYS.ENUMERATE_CHILDREN_LAYERS, this.stepEnumerateChildrenLayers.bind(this)],
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
		} else {
			return String(error);
		}
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

			console.log('} //' + this.currentStep + '; ' + stepDuration + 'ms; ' + new Date(Date.now()).toISOString());

			if (this.hasError) {
				console.log('ERROR: ' + this.errorTitle + '; ' + this.errorDescription);
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
				console.log(this.currentStep + ' { } // ' + new Date(Date.now()).toISOString());
			} else {
				this.loopIsRunning = true;
				console.log(this.currentStep + ' { // ' + new Date(Date.now()).toISOString());
			}

			const func = this.callableMap.get(this.currentStep);

			this.stepTimeFrom = Date.now();
			func();
		} catch (e) {
			console.log(e.message);
			this.handleRequestError('INTERNAL ERROR', e.message);
			this.loopIsRunning = false;
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
				body: JSON.stringify({
					username: 'al.bilous@andersenlab.com',
					password: 'y4&nx$YX',
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			});
		} catch (e) {
			this.handleRequestError('Authorization failed. Invalid username or password. Please try again with valid data.', e);
			this.enqueueNextStep(null);
		}
	}

	async postJsonRpc (endpoint, params) {
		try {
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
			const { access } = responseJson;
			this.accessToken = access;
			this.enqueueNextStep(EXECUTING_STEPS_KEYS.UPLOAD_DOCUMENT);
		} catch (e) {
			this.handleRequestError('(D01) INVALID JSON', e);
			this.enqueueNextStep(null);
		}
	}

	async stepUploadDocument () {
		const document = {
			kind: 'sketch',
			name: !this.document.path ? 'Document Is Not Saved' : this.document.path,
			code: this.document.id,
			pages: this.document.pages.map(page => {
				return {
					code: page.id,
					name: page.name,
				};
			}),
		};
		const response = await this.postJsonRpc(ENDPOINTS_LIST.createDocument, document);
		try {
			const responseJson = await response.json();
			this.pagesList = responseJson.pages;
			this.enqueueNextStep(EXECUTING_STEPS_KEYS.ENUMERATE_DOCUMENT_LAYERS);
		} catch (e) {
			this.handleRequestError('(E01) INVALID JSON', e);
			this.enqueueNextStep(null);
		}
	}

	async stepSaveScreens () {
		const layers = [];
		let screensArray;

		if (!!this.layerUploadObject.length) {
			layers.push(this.layerUploadObject.pop());
			screensArray = layers[0].children.map(page => {
				return page.children.map(artboard => {
					return {
						...artboard,
						page: this.pagesList.find(item => item.code === page.code).id,
					};
				});
			}).flat();
		}

		screensArray.map(async (item) => {
			const test = await this.postJsonRpc(ENDPOINTS_LIST.uploadScreen, item);
		});

		this.enqueueNextStep(null);
	}

	stepEnumerateDocumentLayers () {
		const documentLayers = [];

		this.document.pages.forEach(page => this.layerFilterQueue.push([page, documentLayers]));

		this.layerUploadObject = [{
			'kind': this.document.type,
			'name': !this.document.path ? 'Document Is Not Saved' : this.document.path,
			'text': null,
			'rect': null,
			'children': documentLayers,
		}];
		this.imageUploadObject = [];

		this.enqueueNextStep(EXECUTING_STEPS_KEYS.ENUMERATE_CHILDREN_LAYERS);
	}

	stepEnumerateChildrenLayers () {
		const deadline = Date.now() + 1000;
		const temp = [];
		const supportedLayerTypes = Object.values(this.LAYER_TYPES);

		while ((!!this.layerFilterQueue.length) && (Date.now() < deadline)) {
			const currentItem = this.layerFilterQueue.pop();
			const currentLayer = currentItem[0];
			const parentLayers = currentItem[1];
			let isFilteredOut = currentLayer.hidden;
			if (!isFilteredOut) {
				if (supportedLayerTypes.includes(currentLayer.type)) {
					this.layerCounter++;

					let rect = null;

					if (!!currentLayer.frame) {
						rect = {
							'x': currentLayer.frame.x,
							'y': currentLayer.frame.y,
							'w': currentLayer.frame.width,
							'h': currentLayer.frame.height,
						};
					}

					if (!!currentLayer.frame && currentLayer.parent && currentLayer.parent.type !== this.LAYER_TYPES.PAGE
						&& currentLayer.parent.type !== this.LAYER_TYPES.ARTBOARD) {
						if (currentLayer.parent && currentLayer.parent.frame) {
							const tempParent = temp.find(item => item.id === currentLayer.parent.id);
							if (tempParent) {
								rect = {
									'x': currentLayer.frame.x + tempParent.rect.x,
									'y': currentLayer.frame.y + tempParent.rect.y,
									'w': currentLayer.frame.width,
									'h': currentLayer.frame.height,
								};
							}
						}
					}

					const childLayers = [];

					if (!!currentLayer.layers) {
						currentLayer.layers.forEach(childLayer => {
								this.layerFilterQueue.push([childLayer, childLayers]);
							},
						);
					}
					temp.push({
						id: currentLayer.id,
						rect: {
							x: rect.x,
							y: rect.y,
						},
					});
					let defaultExportedLayer = {
						kind: currentLayer.type === this.LAYER_TYPES.TEXT ? 'text' : 'group',
						code: currentLayer.id,
						rect_x: Math.round(rect.x),
						rect_y: Math.round(rect.y),
						rect_w: Math.round(rect.w),
						rect_h: Math.round(rect.h),
						children: childLayers,
					};

					if (currentLayer.type === this.LAYER_TYPES.TEXT && currentLayer.text) {
						defaultExportedLayer = {
							...defaultExportedLayer,
							text: currentLayer.text,
						};
					}

					let artboard = null;
					if (currentLayer.type === this.LAYER_TYPES.ARTBOARD) {
						const pngOptions = { formats: 'png', output: false };
						const pngBuffer = sketch.export(currentLayer, pngOptions);
						this.artboardCounter++;
						this.imageCounter++;

						artboard = {
							png_image_data: new Buffer.from(pngBuffer).toString('base64'),
							page: currentLayer.parent.id,
							name: currentLayer.name,
							code: currentLayer.id,
							layers: childLayers,
						};
					}

					let exportedLayer = (currentLayer.type === this.LAYER_TYPES.ARTBOARD)
						? artboard
						: defaultExportedLayer;

					parentLayers.push(exportedLayer);
				}
			}
		}

		if (this.layerFilterQueue.length) {
			this.enqueueNextStep(EXECUTING_STEPS_KEYS.ENUMERATE_CHILDREN_LAYERS);
		} else {
			this.enqueueNextStep(EXECUTING_STEPS_KEYS.SAVE_SCREENS);
		}
	}

	stepReportSuccess () {
		const totalTime = Date.now() - this.totalTimeFrom;
		const clientTime = Math.round((totalTime - this.serverTime) / 1000);
		const serverTime = Math.round((totalTime - 1000 * clientTime) / 1000);

		ui.alert(
			'SUCCESS',
			'Document successfully uploaded.\n' +
			' * ' + this.totalCreateCounter + ' objects created.\n' +
			' * ' + this.totalUpdateCounter + ' objects updated.\n' +
			' * ' + this.totalDeleteCounter + ' objects deleted.\n' +
			this.utilFormatTime(clientTime) + ' seconds spent on client.\n' +
			this.utilFormatTime(serverTime) + ' seconds spent on server.');
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
