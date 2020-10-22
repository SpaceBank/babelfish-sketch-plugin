export const EXECUTING_STEPS_KEYS = {
	START: 'Start',
	CHECK_ACCOUNT: 'CheckAccount',
	INPUT_ACCOUNT: 'InputAccount',
	PREPARE_TOKEN: 'PrepareToken',
	UPLOAD_DOCUMENT: 'UploadDocument',
	SAVE_SCREENS: 'SaveScreens',
	ENUMERATE_DOCUMENT_LAYERS: 'EnumerateDocumentLayers',
	ENUMERATE_CHILDREN_LAYERS: 'EnumerateChildrenLayers',
	REPORT_SUCCESS: 'ReportSuccess',
};

export function stepsMessages () {
	return {
		START: ' | Start.',
		CHECK_ACCOUNT: ' | Checking account.',
		INPUT_ACCOUNT: ' | Waiting for account user input.',
		PREPARE_TOKEN: ' | Waiting for server.',
		UPLOAD_DOCUMENT: ' | Waiting for server.',
		SAVE_SCREENS: () => (!!this.layerUploadObject.length)
			? ' | Uploading data. ' + this.layerUploadObject.length + ' layers and ' + this.imageUploadObject.length + ' images left.'
			: ' | Uploading data. ' + this.imageUploadObject.length + ' images left.',
		ENUMERATE_DOCUMENT_LAYERS: () => ' | Enumerating layers. ' + this.artboardCounter + ' artboards and ' + this.layerCounter + ' layers found so far.',
		ENUMERATE_CHILDREN_LAYERS: () => ' | Enumerating layers. ' + this.artboardCounter + ' artboards and ' + this.layerCounter + ' layers found so far.',
		REPORT_SUCCESS: ' | Success.',
	};
}

export function createSteps (message = '') {
	return new Map([
		[EXECUTING_STEPS_KEYS, () => message += this.STEPS_MASSAGES.START],
		[EXECUTING_STEPS_KEYS.CHECK_ACCOUNT, () => message += this.STEPS_MASSAGES.CHECK_ACCOUNT],
		[EXECUTING_STEPS_KEYS.INPUT_ACCOUNT, () => message += this.STEPS_MASSAGES.INPUT_ACCOUNT],
		[EXECUTING_STEPS_KEYS.PREPARE_TOKEN, () => message += this.STEPS_MASSAGES.PREPARE_TOKEN],
		[EXECUTING_STEPS_KEYS.UPLOAD_DOCUMENT, () => message += this.STEPS_MASSAGES.UPLOAD_DOCUMENT],
		[EXECUTING_STEPS_KEYS.SAVE_SCREENS, () => message += this.STEPS_MASSAGES.SAVE_SCREENS()],
		[EXECUTING_STEPS_KEYS.ENUMERATE_DOCUMENT_LAYERS, () => message += this.STEPS_MASSAGES.ENUMERATE_DOCUMENT_LAYERS()],
		[EXECUTING_STEPS_KEYS.ENUMERATE_CHILDREN_LAYERS, () => message += this.STEPS_MASSAGES.ENUMERATE_CHILDREN_LAYERS()],
		[EXECUTING_STEPS_KEYS.REPORT_SUCCESS, () => message += this.STEPS_MASSAGES.REPORT_SUCCESS],
	]);
}

export const LAYER_TYPES = {
	DOCUMENT: 'Document',
	PAGE: 'Page',
	ARTBOARD: 'Artboard',
	SYMBOL_MASTER: 'SymbolMaster',
	SYMBOL_INSTANCE: 'SymbolInstance',
	GROUP: 'Group',
	TEXT: 'Text',
	SHAPE: 'Shape',
};
