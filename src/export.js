import sketch from "sketch"
import dom    from "sketch/dom"
import ui     from "sketch/ui"


const fetch  = require("sketch-polyfill-fetch");
const base64 = require("./base64.js");
const settingsManager = require("./settingsmanager.js");


function assignmentBugWorkaround(buggyValue) {return buggyValue; }


function emptyAction() {}


class TabPage {
  createPopupField(labelText, initialValue, allValues) {
    var popupLabel = NSTextField.alloc().initWithFrame(
      NSMakeRect(
        this.marginLabelLeft,
        this.currentY - (this.labelHeight + this.marginLabelTop),
        this.labelWidth,
        this.labelHeight
      )
    );

    popupLabel.setStringValue(labelText);
    popupLabel.setBezeled(false);
    popupLabel.setDrawsBackground(false);
    popupLabel.setEditable(false);
    popupLabel.setSelectable(false);

    var popupField = NSPopUpButton.alloc().initWithFrame(
      NSMakeRect(
        this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginPopupLeft,
        this.currentY - (this.fieldHeight + this.marginPopupTop),
        this.totalW - (this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginPopupLeft + this.marginPopupRight),
        this.labelHeight
      )
    );

    var isSelected = false;

    for (var index = 0; index < allValues.length; index++) {
      popupField.addItemWithTitle(allValues[index]);

      if (allValues[index] == initialValue) {
        popupField.selectItemAtIndex(index);
        isSelected = true;
      }
    }

    if (!isSelected) {
      popupField.selectItemAtIndex(0);
    }

    this.tabItemView.addSubview(popupLabel);
    this.tabItemView.addSubview(popupField);

    this.currentY -= (this.fieldHeight + this.spacingH);

    return popupField;
  }

  createTextField(labelText, initialValue) {
    var textLabel = NSTextField.alloc().initWithFrame(
      NSMakeRect(
        this.marginLabelLeft,
        this.currentY - (this.labelHeight + this.marginLabelTop),
        this.labelWidth,
        this.labelHeight
      )
    );

    textLabel.setStringValue(labelText);
    textLabel.setBezeled(false);
    textLabel.setDrawsBackground(false);
    textLabel.setEditable(false);
    textLabel.setSelectable(false);
    
    var textField = NSTextField.alloc().initWithFrame(
      NSMakeRect(
        this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginTextLeft,
        this.currentY - (this.fieldHeight + this.marginTextTop),
        this.totalW - (this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginTextLeft + this.marginTextRight),
        this.labelHeight
      )
    );

    textField.setStringValue(initialValue);
    textField.setBezelStyle(1);
    
    this.tabItemView.addSubview(textLabel);
    this.tabItemView.addSubview(textField);

    this.currentY -= (this.fieldHeight + this.spacingH);

    return textField;
  }

  createPasswordField(labelText, initialValue) {
    var passwordLabel = NSTextField.alloc().initWithFrame(
      NSMakeRect(
        this.marginLabelLeft,
        this.currentY - (this.labelHeight + this.marginLabelTop),
        this.labelWidth,
        this.labelHeight
      )
    );

    passwordLabel.setStringValue(labelText);
    passwordLabel.setBezeled(false);
    passwordLabel.setDrawsBackground(false);
    passwordLabel.setEditable(false);
    passwordLabel.setSelectable(false);
    
    var passwordField = NSSecureTextField.alloc().initWithFrame(
      NSMakeRect(
        this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginTextLeft,
        this.currentY - (this.fieldHeight + this.marginPopupTop),
        this.totalW - (this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginTextLeft + this.marginTextRight),
        this.labelHeight
      )
    );

    passwordField.setStringValue(initialValue);
    passwordField.setBezelStyle(1);
    
    this.tabItemView.addSubview(passwordLabel);
    this.tabItemView.addSubview(passwordField);

    this.currentY -= (this.fieldHeight + this.spacingH);

    return passwordField;
  }

  createCheckboxField(labelText, initialValue) {
    var checkboxField = NSButton.alloc().initWithFrame(
      NSMakeRect(
        this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginTextLeft,
        this.currentY - (this.fieldHeight + this.marginPopupTop),
        this.totalW - (this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginTextLeft + this.marginTextRight),
        this.labelHeight
      )
    );

    checkboxField.setButtonType(3);
    checkboxField.setState(initialValue);
    checkboxField.setBezelStyle(1);
    checkboxField.setTitle(labelText);
    
    this.tabItemView.addSubview(checkboxField);

    this.currentY -= (this.fieldHeight + this.spacingH);

    return checkboxField;
  }

  createRadioFields(labelTexts, initialValue) {
    var labelTextNumber = labelTexts.length;
    var boxOuterHeight = 23 + 2 * this.marginPopupTop + labelTextNumber * (this.fieldHeight + this.spacingH);
    var box = NSBox.alloc().initWithFrame(
      NSMakeRect(
        this.marginLabelLeft,
        this.currentY - (boxOuterHeight + this.marginPopupTop),
        this.totalW - (this.marginLabelLeft + this.marginLabelRight),
        boxOuterHeight
      )
    );

    box.setTitlePosition(0);

    var boxInnerHeight = box.contentView().frame().size.height;
    var boxInnerWidth  = box.contentView().frame().size.width;

    var result = [];

    for (var index = 0; index < labelTexts.length; index++) {
      var radioField = NSButton.alloc().initWithFrame(
        NSMakeRect(
          this.marginLabelLeft,
          boxInnerHeight - ((index + 1) * (this.fieldHeight + this.spacingH) + this.marginPopupTop),
          boxInnerWidth - (this.marginLabelLeft + this.marginLabelRight),
          this.labelHeight
        )
      );

      radioField.setButtonType(4);
      radioField.setState(index == initialValue);
      radioField.setBezelStyle(1);
      radioField.setTitle(labelTexts[index]);
      radioField.setCOSJSTargetFunction(emptyAction);
      
      box.addSubview(radioField);

      result.push(radioField);
    }

    this.tabItemView.addSubview(box);

    this.currentY -= (boxOuterHeight + this.spacingH);

    return result;
  }

  constructor(settingsWindow, labelText) {
    this.tabItem          = NSTabViewItem.alloc().init();
    this.tabItemView      = NSView.alloc().init();
    this.tabItem.label    = labelText;
    this.tabItem.view     = this.tabItemView;
    this.labelWidth       = 80;
    this.labelHeight      = 23;
    this.fieldHeight      = 23;
    this.marginLabelLeft  = 10;
    this.marginLabelRight =  0;
    this.marginLabelTop   =  2;
    this.marginTextLeft   =  2;
    this.marginTextRight  = 10;
    this.marginTextTop    =  0;
    this.marginPopupLeft  =  0;
    this.marginPopupRight =  8;
    this.marginPopupTop   =  0;

    this.spacingH = 5;

    settingsWindow.tabView.addTabViewItem(this.tabItem);

    if (settingsWindow.tabView.numberOfTabViewItems() == 1) {
      settingsWindow.tabW = this.tabItemView.frame().size.width;
      settingsWindow.tabH = this.tabItemView.frame().size.height;
    }

    this.currentY = settingsWindow.tabH - this.spacingH;
    this.totalW = settingsWindow.tabW;
  }
}


class SettingsWindow {
  _createChrome() {
    this.tabView = NSTabView.alloc().initWithFrame(NSMakeRect(0, 0, 640, 480));
    this.contanerView = NSView.alloc().initWithFrame(this.tabView.frame());
    this.contanerView.addSubview(this.tabView);
    this.window = NSAlert.alloc().init();
    this.window.setMessageText("Settings");
    this.window.setInformativeText("Space globalization plug-in settings");
    this.window.setIcon(NSImage.alloc().initByReferencingFile(context.plugin.urlForResourceNamed("logo.png").path()));
    this.window.addButtonWithTitle("Save");
    this.window.addButtonWithTitle("Cancel");
    this.window.accessoryView = this.contanerView;
  }

  _createTabPage(labelText) {
    return new TabPage(this, labelText);
  }

  constructor(settings) {
    this._settings = settings;
    this._possibleEndpoints = [
      "https://globalization.spacebank.xyz/sketch/update",
      "https://roman-akopov.code.spacebank.xyz/sketch/update"
    ];
    this.endpoint = this._settings.getEndpoint();
    this.username = this._settings.getUsername();
    this.password = this._settings.getPassword();
    this.syncmode = this._settings.getSyncmode();

    this._createChrome();
    this._pageAccount = this._createTabPage("Account");
    this._endpointField = this._pageAccount.createPopupField(
      "Endpoint:",
      this.endpoint,
      this._possibleEndpoints
    );
    this._usernameField = this._pageAccount.createTextField(
      "Username:",
      this.username
    );
    this._passwordField = this._pageAccount.createPasswordField(
      "Password:",
      this.password
    );
    
    this._pagePreferences = this._createTabPage("Preferences");
    this._syncmodeFields = this._pagePreferences.createRadioFields(
      [
        "Never show settings dialog",
        "Show settings dialog before first synchronization",
        "Show settings dialog before each synchronization",
      ],
      this.syncmode
    );
  }

  run() {
    var window = this.window;
    var result = window.runModal();

    if (result == 1000) {
      this.endpoint = this._possibleEndpoints[this._endpointField.indexOfSelectedItem()];
      this.username = this._usernameField.stringValue();
      this.password = this._passwordField.stringValue();
      this.syncmode = 2;

      for (var index = 0; index < this._syncmodeFields.length; index++) {
        if (this._syncmodeFields[index].state() == 1) {
          this.syncmode = index;
        }
      }

      this._settings.setEndpoint(this.endpoint);
      this._settings.setUsername(this.username);
      this._settings.setPassword(this.password);
      this._settings.setSyncmode(this.syncmode);

      return true;
    }

    return false;
  }
}


class StateMachine {
  constructor(document) {
    this.totalTimeFrom    = Date.now();

    this.document         = document;
    this.settings         = settingsManager.create(this.document, this.totalTimeFrom);
    this.callStack        = [];
    this.hasError         = false;
    this.errorTitle       = undefined;
    this.errorDescription = undefined;

    this.callItem        = null;
    this.webServiceToken = undefined;

    this.artboardCounter           = 0;
    this.layerCounter              = 0;
    this.layerFilterQueue          = [];
    this.layerUploadQueue          = [];
    this.imageCounter              = 0;
    this.imageFilterQueue          = [];
    this.imageUploadQueue          = [];
    this.cumulativeImageUpload     = [];
    this.cumulativeImageUploadSize = 1024 * 1024 * 1024;
    this.imageStats                = {};

    this.totalDownloadSize  = 0;
    this.totalUploadSize    = 0;
    this.totalCreateCounter = 0;
    this.totalUpdateCounter = 0;
    this.totalDeleteCounter = 0;

    this.prevWebServiceToken = undefined;

    this.stepTimeFrom = null;

    this.showIsRunning = false;
  }

  formatSize(byteNumber) {
    if        (byteNumber <               1024) {
      return byteNumber + " bytes";
    } else if (byteNumber <        1024 * 1024) {
      return (Math.round(100.0 * byteNumber / (                  1024.0)) / 100.0) + " Kb";
    } else if (byteNumber < 1024 * 1024 * 1024) {
      return (Math.round(100.0 * byteNumber / (         1024.0 * 1024.0)) / 100.0) + " Mb";
    } else {
      return (Math.round(100.0 * byteNumber / (1024.0 * 1024.0 * 1024.0)) / 100.0) + " Gb";
    }
  }

  formatTime(secondNumber) {
    var minutes = Math.floor(secondNumber / 60);
    var seconds = secondNumber % 60;

    return ("00" + minutes.toFixed(0)).slice(-2) + ":" + ("00" + seconds.toFixed(0)).slice(-2);
  }

  formatError(error) {
    if (typeof error.localizedDescription === "function") {
      return error.localizedDescription();
    } else if (typeof error.nativeException === "object") {
      return String(error) + "\n" + String(error.nativeException);
    } else {
      return String(error);
    }
  }

  enqueueNextItem(func, name) {
    this.callStack.splice(0, 0, [func.bind(this), name]);
  }

  enqueueNextCall() {
    setTimeout(this.callNextItem.bind(this), 0);
  }

  showNextItem() {
    var self = this;
    var now = Date.now();
    var totalElapsed = Math.round((now - this.totalTimeFrom) / 1000);
    var message = "";

    message += self.formatTime(totalElapsed) + " 🕑";
    message += " " + this.formatSize(self.totalUploadSize) + " ⇑ " + this.formatSize(self.totalDownloadSize) + " ⇓ |";

    if (self.callItem != null) {
      switch (self.callItem[1]) {
        case "stepCheckSettings":
          message += " Checking settings.";
          break;
        case "stepEnumerateDocumentImages":
        case "stepEnumerateImages":
          message += " Enumerating images. " + self.imageCounter + " changed images found so far.";
          break;
        case "stepEnumerateDocumentLayers":
        case "stepEnumerateLayers":
          message += " Enumerating layers. " + self.artboardCounter + " artboards and " + self.layerCounter + " layers found so far.";
          break;
        case "stepGetActionCsrfToken":
        case "stepUploadAction":
          message += " Postprocessing uploaded data.";
          break;
        case "stepGetImageCsrfToken":
        case "stepUploadImage":
          message += " Uploading images. " + self.imageUploadQueue.length + " batches left.";
          break;
        case "stepGetLayerCsrfToken":
        case "stepUploadLayer":
          message += " Uploading layers.";
          break;
        case "stepInputSettings":
          message += " Waiting for settings.";
          break;
        case "stepReAskSettings":
          break;
        case "stepReportSuccess":
          message += " Success.";
          break;
        case "stepStart":
          message += " Start.";
          break;
      }

      ui.message(message);
    }

    if (self.showIsRunning) {
      setTimeout(self.showNextItem.bind(self), 500);
    } else {
      console.log(new Date(now).toISOString() + "; STOP");
    }
  }

  callNextItem() {
    var self = this;

    if (self.callItem != null) {
      var stepDuration = (Date.now() - self.stepTimeFrom);

      if (self.prevWebServiceToken != self.webServiceToken) {
        console.log("    Token = \"" + self.webServiceToken + "\"; // was \"" + self.prevWebServiceToken + "\".");
        self.prevWebServiceToken = self.webServiceToken;
      }

      if ((self.callItem[1] != "stepEnumerateLayers") && (self.callItem[1] != "stepEnumerateImages")) {
        console.log("} //"  + self.callItem[1] + "; " + stepDuration + "ms; " + new Date(Date.now()).toISOString());
      }
    }

    if (self.hasError) {
      console.log("ERROR: " + self.errorTitle + "; " + self.errorDescription);
      self.hasError = false;
      ui.alert(self.errorTitle, self.errorDescription);
    }

    if (self.callStack.length > 0) {
      self.callItem = self.callStack.pop();
      self.stepTimeFrom = Date.now();

      setTimeout(self.callItem[0], 0);

      if ((self.callItem[1] != "stepEnumerateLayers") && (self.callItem[1] != "stepEnumerateImages")) {
        if (self.callItem[1] == "stepReportSuccess") {
          self.showIsRunning = false;
          console.log(self.callItem[1] + " { } // " + new Date(Date.now()).toISOString());
        } else {
          self.showIsRunning = true;
          console.log(self.callItem[1] + " { // " + new Date(Date.now()).toISOString());
        }
      }
    } else {
      self.showIsRunning = false;
      self.callItem = null;
    }
  }

  getAuthorizationHeader() {
    return "Basic " + base64.encodeStr(this.settings.getUsername() + ":" + this.settings.getPassword());
  }

  stepStart() {
    var self = this;

    self.enqueueNextItem(self.stepCheckSettings, "stepCheckSettings");
    self.enqueueNextCall();
  }

  stepCheckSettings() {
    var self = this;

    if (self.settings.shouldShowSettings()) {
      self.enqueueNextItem(self.stepInputSettings, "stepInputSettings");
    } else {
      self.enqueueNextItem(self.stepEnumerateDocumentLayers, "stepEnumerateDocumentLayers");
    }

    self.enqueueNextCall();
  }

  stepInputSettings() {
    var self = this;
    var settingWindow = new SettingsWindow(self.settings);

    if (settingWindow.run()) {
      self.enqueueNextItem(self.stepCheckSettings, "stepCheckSettings");
    } else {
      self.hasError           = true;
      self.errorTitle         = "USER INPUT (A01)";
      self.errorDescription   = "Settings are required.";
    }

    self.enqueueNextCall();
  }

  stepReAskSettings() {
    var self = this;

    self.settings.makeShowSettings();
    self.enqueueNextCall();
  }

  stepEnumerateLayers() {
    var self = this;
    var item = self.layerFilterQueue.pop();
    var layer = item[0];
    var parentLayers = item[1];

    if ((layer.type != "Page") || (layer.name != "Assets")) {
      if (
        (layer.type == "Page") ||
        (layer.type == "Artboard") ||
        (layer.type == "SymbolMaster") ||
        (layer.type == "SymbolInstance") ||
        (layer.type == "Group") ||
        // (layer.type == "Image") ||
        (layer.type == "Text") ||
        (layer.type == "Shape") ||
        // (layer.type == "ShapePath") ||
        false) {
        self.layerCounter++;

        if (layer.type == "Artboard") {
          self.artboardCounter++;
        }

        var uuid = assignmentBugWorkaround(layer.id);
        var masterUuid = null;
        var masterLibraryName = null;
        var masterLibraryType = null;
        var masterLibraryValid = false;
        var masterLibraryEnabled = false;
        var overrides = [];

        if (layer.type == "SymbolInstance") {
          layer.overrides.forEach(function(o, i) {
            if (o.property == "stringValue") {
              overrides.push({
                "path": o.path,
                "value": o.value
              });
            }
          });

          var master = layer.master;

          if (master != null) {
            masterUuid = assignmentBugWorkaround(master.id);

            var library = master.getLibrary();

            if (library != null) {
              masterLibraryName    = library.name;
              masterLibraryType    = library.type;
              masterLibraryValid   = library.valid;
              masterLibraryEnabled = library.enabled;
            }
          }
        }

        if (layer.type == "SymbolMaster") {
          var library = layer.getLibrary();

          if (library != null) {
            masterLibraryName    = library.name;
            masterLibraryType    = library.type;
            masterLibraryValid   = library.valid;
            masterLibraryEnabled = library.enabled;
          } else {
            masterLibraryType    = "Local";
            masterLibraryValid   = true;
            masterLibraryEnabled = true;
          }
        }

        var targetUuid = null;

        if (layer.flow !== undefined) {
          if (layer.flow.targetId == dom.Flow.BackTarget) {
            targetUuid = "00000000-0000-0000-0000-000000000000";
          } else {
            targetUuid = layer.flow.targetId;
          }
        }

        var text = null;

        if (layer.type == "Text") {
          text = layer.text;
        }

        var rect = null;

        if (layer.frame !== undefined) {
          rect = { "x": layer.frame.x, "y": layer.frame.y, "w": layer.frame.width, "h": layer.frame.height };
        }

        var childLayers = [];

        if (layer.layers !== undefined) {
          layer.layers.forEach(
            function(l, i) {
              self.layerFilterQueue.push([l, childLayers]);
            }
          );
        }

        parentLayers.push({
          "uuid": uuid,
          "type": layer.type,
          "name": layer.name,
          "master_uuid": masterUuid,
          "master_library_name":    masterLibraryName,
          "master_library_type":    masterLibraryType,
          "master_library_valid":   masterLibraryValid,
          "master_library_enabled": masterLibraryEnabled,
          "target_uuid": targetUuid,
          "text": text,
          "rect": rect,
          "layers": childLayers,
          "overrides": overrides
        });
      }
    }

    if (self.layerFilterQueue.length > 0) {
      self.enqueueNextItem(self.stepEnumerateLayers, "stepEnumerateLayers");
      self.enqueueNextCall();
    } else if (self.layerUploadQueue.length > 0) {
      self.enqueueNextItem(self.stepGetLayerCsrfToken, "stepGetLayerCsrfToken");
      self.enqueueNextCall();
    } else {
      self.enqueueNextItem(self.stepReportSuccess, "stepReportSuccess");
      self.enqueueNextCall();
    }
  }

  stepEnumerateDocumentLayers() {
    var self = this;
    var documentLayers = [];

    self.document.pages.forEach(
      function(page, pageIndex) {
        self.layerFilterQueue.push([page, documentLayers]);
      }
    );

    var uuid = assignmentBugWorkaround(self.document.id);

    self.layerUploadQueue.push({
      "uuid": uuid,
      "type": self.document.type,
      "name": self.document.path === undefined ? "Document Is Not Saved" : self.document.path,
      "master_uuid": null,
      "master_library_name": null,
      "master_library_type": null,
      "master_library_valid": false,
      "master_library_enabled": false,
      "target_uuid": null,
      "text": null,
      "rect": null,
      "layers": documentLayers,
      "overrides": []
    });

    self.enqueueNextItem(self.stepEnumerateLayers, "stepEnumerateLayers");
    self.enqueueNextCall();
  }

  stepEnumerateImages() {
    var self = this;
    var layer = self.imageFilterQueue.pop();

    if ((layer.type != "Page") || (layer.name != "Assets")) {
      if (
        (layer.type == "Page") ||
        (layer.type == "Artboard") ||
        (layer.type == "SymbolMaster") ||
        (layer.type == "SymbolInstance") ||
        (layer.type == "Group") ||
        // (layer.type == "Image") ||
        (layer.type == "Text") ||
        (layer.type == "Shape") ||
        // (layer.type == "ShapePath") ||
        false) {
        if (layer.layers !== undefined) {
          layer.layers.forEach(
            function(l, i) {
              self.imageFilterQueue.push(l);
            }
          );
        }

        if (layer.type == "Artboard") {
          var uuid = assignmentBugWorkaround(layer.id);
          var imageStats = self.imageStats[uuid];

          if (imageStats === undefined) {
            imageStats = {"png_image_size": -1};
          }

          const pngOptions = { formats: "png", output: false };
          const pngBuffer = sketch.export(layer, pngOptions);

          var pngImage = base64.encodeBin(pngBuffer);

          if (pngBuffer.length != imageStats["png_image_size"]) {
            if (self.cumulativeImageUploadSize > 1024 * 1024) {
              self.cumulativeImageUpload = [];
              self.cumulativeImageUploadSize = 0;
              self.imageUploadQueue.push({"images": self.cumulativeImageUpload});
            }

            self.cumulativeImageUpload.push({
              "uuid": uuid,
              "png_image": pngImage,
              "svg_image": null
            });

            self.imageCounter++;
            self.cumulativeImageUploadSize += pngImage.length;
          }
        }

        if (layer.type == "Text") {
          var uuid = assignmentBugWorkaround(layer.id);
          var imageStats = self.imageStats[uuid];

          if (imageStats === undefined) {
            imageStats = {"svg_image_size": -1, "png_image_size": -1};
          }

          const svgOptions = { formats: "svg", output: false };
          const svgBuffer = sketch.export(layer, svgOptions);

          var svgImage = base64.encodeBin(svgBuffer);

          if (svgBuffer.length != imageStats["svg_image_size"]) {
            const pngOptions = { formats: "png", output: false };
            const pngBuffer = sketch.export(layer, pngOptions);

            var pngImage = base64.encodeBin(pngBuffer);

            if (pngBuffer.length != imageStats["png_image_size"]) {
              if (self.cumulativeImageUploadSize > 1024 * 1024) {
                self.cumulativeImageUpload = [];
                self.cumulativeImageUploadSize = 0;
                self.imageUploadQueue.push({"images": self.cumulativeImageUpload});
              }

              self.cumulativeImageUpload.push({
                "uuid": uuid,
                "png_image": pngImage,
                "svg_image": svgImage
              });

              self.imageCounter++;
              self.cumulativeImageUploadSize += pngImage.length;
              self.cumulativeImageUploadSize += svgImage.length;
            }
          }
        }
      }
    }

    if (self.imageFilterQueue.length > 0) {
      self.enqueueNextItem(self.stepEnumerateImages, "stepEnumerateImages");
      self.enqueueNextCall();
    } else {
      self.cumulativeImageUpload = [];
      self.cumulativeImageUploadSize = 0;
      self.imageUploadQueue.push({"images": self.cumulativeImageUpload});

      if (self.imageUploadQueue.length > 0) {
        self.enqueueNextItem(self.stepGetImageCsrfToken, "stepGetImageCsrfToken");
        self.enqueueNextCall();
      } else {
        self.enqueueNextItem(self.stepGetActionCsrfToken, "stepGetActionCsrfToken");
        self.enqueueNextCall();
      }
    }
  }

  stepEnumerateDocumentImages() {
    var self = this;

    self.document.pages.forEach(
      function(page, pageIndex) {
        self.imageFilterQueue.push(page);
      }
    );

    self.enqueueNextItem(self.stepEnumerateImages, "stepEnumerateImages");
    self.enqueueNextCall();
  }

  utilGetCsrfToken(nextItem, nextName) {
    var self = this;
    var csrfTokenPattern = /csrftoken=([A-Za-z0-9]+)/s;

    fetch(self.settings.getEndpoint(),
    {
      method: "GET",
      headers: {
          "Authorization": self.getAuthorizationHeader()
      }
    })
    .then(function(response) {
      if (response.status == 200) {
        var setCookieHeader = String(response.headers.get("set-cookie"));

        if (setCookieHeader !== undefined) {
          self.webServiceToken  = csrfTokenPattern.exec(setCookieHeader)[1];
          self.enqueueNextItem(nextItem, nextName);
        } else {
          self.hasError         = true;
          self.errorTitle       = "HTTP (A01)";
          self.errorDescription = "Server returned no CSRF token cookie.";
          self.webServiceToken  = undefined;
        }
      } else if (response.status == 403) {
        self.hasError           = true;
        self.errorTitle         = "HTTP (A02)";
        self.errorDescription   = "Authentication failed.\n" + response.status + ": " + response.statusText;
        self.webServiceToken    = undefined;
        self.enqueueNextItem(self.stepReAskSettings, "stepReAskSettings");
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP (A03)";
        self.errorDescription   = response.status + ": " + response.statusText;
        self.webServiceToken    = undefined;
        self.enqueueNextItem(self.stepReAskSettings, "stepReAskSettings");
      }

      self.enqueueNextCall();
    })
    .catch(function(error) {
      self.hasError           = true;
      self.errorTitle         = "HTTP (A04)";
      self.errorDescription   = self.formatError(error);
      self.webServiceToken    = undefined;
      self.enqueueNextCall();
    });
  }

  stepGetLayerCsrfToken() {
    this.utilGetCsrfToken(this.stepUploadLayer, "stepUploadLayer");
  }

  stepGetImageCsrfToken() {
    this.utilGetCsrfToken(this.stepUploadImage, "stepUploadImage");
  }

  stepGetActionCsrfToken() {
    this.utilGetCsrfToken(this.stepUploadAction, "stepUploadAction");
  }

  stepUploadLayer() {
    var self = this;
    var json = self.layerUploadQueue.pop();

    fetch(self.settings.getEndpoint(),
    {
      method: "PATCH",
      body: json,
      headers: {
          "Cookie": "csrftoken=" + self.webServiceToken,
          "Authorization": self.getAuthorizationHeader(),
          "Content-Type": "application/json+layers",
          "X-CSRFToken": self.webServiceToken
      }
    })
    .then(function(response) {
      var contentType = response.headers.get("content-type");

      if (contentType.startsWith("text/html")) {
        response.text()
          .then(function(responseText) {
            var titlePattern   = /<title>(.*)<\/title>/s;
            var titleMatch     = titlePattern.exec(responseText);
            var summaryPattern = /<div id="summary">(.*?)<\/div>/s;
            var summaryMatch   = summaryPattern.exec(responseText);

            self.hasError           = true;
            self.errorTitle         = "HTTP (B01)";
            self.errorDescription   = response.status + ": " + response.statusText;

            if (titleMatch != null) {
              self.errorDescription += "\n" + titleMatch[1];
            }

            if (summaryMatch != null) {
              self.errorDescription += "\n" + summaryMatch[1].replace(/<\/?[a-z0-1]+>/sg, "").replace(/\n[ ]+/sg, "");
            }

            self.enqueueNextCall();
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP (B02)";
            self.errorDescription   = self.formatError(error);

            self.enqueueNextCall();
          });
      } else if (contentType.startsWith("application/json") || contentType.startsWith("text/json")) {
        response.json()
          .then(function(responseJson) {
            if ((response.status >= 200) && (response.status < 300)) {
              if (self.layerUploadQueue.length > 0) {
                self.enqueueNextItem(self.stepGetLayerCsrfToken, "stepGetLayerCsrfToken");
              } else {
                self.enqueueNextItem(self.stepEnumerateDocumentImages, "stepEnumerateDocumentImages");
              }

              self.totalUploadSize    += Number(responseJson["size"]);
              self.totalDownloadSize  += Number(response.headers.get('Content-Length'));
              self.totalCreateCounter += Number(responseJson["create_counter"]);
              self.totalUpdateCounter += Number(responseJson["update_counter"]);
              self.totalDeleteCounter += Number(responseJson["delete_counter"]);
              self.imageStats         = responseJson["image_stats"];
            } else {
              self.hasError           = true;
              self.errorTitle         = "HTTP (B03)";
              self.errorDescription   = response.status + ": " + response.statusText;
            }

            self.enqueueNextCall();
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP (B04)";
            self.errorDescription   = self.formatError(error);

            self.enqueueNextCall();
          });
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP (B05)";
        self.errorDescription   = response.status + ": " + response.statusText;
      }
    })
    .catch(function(error) {
      self.hasError           = true;
      self.errorTitle         = "HTTP (B06)";
      self.errorDescription   = self.formatError(error);

      self.enqueueNextCall();
    });
  }

  stepUploadImage() {
    var self = this;
    var json = self.imageUploadQueue.pop();

    fetch(self.settings.getEndpoint(),
    {
      method: "PATCH",
      body: json,
      headers: {
          "Cookie": "csrftoken=" + self.webServiceToken,
          "Authorization": self.getAuthorizationHeader(),
          "Content-Type": "application/json+images",
          "X-CSRFToken": self.webServiceToken
      }
    })
    .then(function(response) {
      var contentType = response.headers.get("content-type");

      if (contentType.startsWith("text/html")) { 
        response.text()
          .then(function(responseText) {
            var titlePattern   = /<title>(.*)<\/title>/s;
            var titleMatch     = titlePattern.exec(responseText);
            var summaryPattern = /<div id="summary">(.*?)<\/div>/s;
            var summaryMatch   = summaryPattern.exec(responseText);

            self.hasError           = true;
            self.errorTitle         = "HTTP (C01)";
            self.errorDescription   = response.status + ": " + response.statusText;

            if (titleMatch != null) {
              self.errorDescription += "\n" + titleMatch[1];
            }

            if (summaryMatch != null) {
              self.errorDescription += "\n" + summaryMatch[1].replace(/<\/?[a-z0-1]+>/sg, "").replace(/\n[ ]+/sg, "");
            }

            self.enqueueNextCall();
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP (C02)";
            self.errorDescription   = self.formatError(error);

            self.enqueueNextCall();
          });
      } else if (contentType.startsWith("application/json") || contentType.startsWith("text/json")) {
        response.json()
          .then(function(responseJson) {
            if ((response.status >= 200) && (response.status < 300)) {
              if (self.imageUploadQueue.length > 0) {
                self.enqueueNextItem(self.stepGetImageCsrfToken, "stepGetImageCsrfToken");
              } else {
                self.enqueueNextItem(self.stepGetActionCsrfToken, "stepGetActionCsrfToken");
              }

              self.totalUploadSize    += Number(responseJson["size"]);
              self.totalDownloadSize  += Number(response.headers.get('Content-Length'));
              self.totalCreateCounter += Number(responseJson["create_counter"]);
              self.totalUpdateCounter += Number(responseJson["update_counter"]);
              self.totalDeleteCounter += Number(responseJson["delete_counter"]);
            } else {
              self.hasError           = true;
              self.errorTitle         = "HTTP (C03)";
              self.errorDescription   = response.status + ": " + response.statusText;
            }

            self.enqueueNextCall();
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP (C04)";
            self.errorDescription   = self.formatError(error);

            self.enqueueNextCall();
          });
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP (C05)";
        self.errorDescription   = response.status + ": " + response.statusText;
      }
    })
    .catch(function(error) {
      self.hasError           = true;
      self.errorTitle         = "HTTP (C06)";
      self.errorDescription   = self.formatError(error);

      self.enqueueNextCall();
    });
  }

  stepUploadAction() {
    var self = this;
    var json = {
      "uuid": assignmentBugWorkaround(self.document.id),
      "action": "convert"
    };

    fetch(self.settings.getEndpoint(),
    {
      method: "PATCH",
      body: json,
      headers: {
          "Cookie": "csrftoken=" + self.webServiceToken,
          "Authorization": self.getAuthorizationHeader(),
          "Content-Type": "application/json+action",
          "X-CSRFToken": self.webServiceToken
      }
    })
    .then(function(response) {
      var contentType = response.headers.get("content-type");

      if (contentType.startsWith("text/html")) { 
        response.text()
          .then(function(responseText) {
            var titlePattern   = /<title>(.*)<\/title>/s;
            var titleMatch     = titlePattern.exec(responseText);
            var summaryPattern = /<div id="summary">(.*?)<\/div>/s;
            var summaryMatch   = summaryPattern.exec(responseText);

            self.hasError           = true;
            self.errorTitle         = "HTTP (D01)";
            self.errorDescription   = response.status + ": " + response.statusText;

            if (titleMatch != null) {
              self.errorDescription += "\n" + titleMatch[1];
            }

            if (summaryMatch != null) {
              self.errorDescription += "\n" + summaryMatch[1].replace(/<\/?[a-z0-1]+>/sg, "").replace(/\n[ ]+/sg, "");
            }

            self.enqueueNextCall();
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP (D02)";
            self.errorDescription   = self.formatError(error);

            self.enqueueNextCall();
          });
      } else if (contentType.startsWith("application/json") || contentType.startsWith("text/json")) {
        response.json()
          .then(function(responseJson) {
            if ((response.status >= 200) && (response.status < 300)) {
              if (self.imageUploadQueue.length > 0) {
                self.enqueueNextItem(self.stepGetImageCsrfToken, "stepGetImageCsrfToken");
              } else {
                self.enqueueNextItem(self.stepReportSuccess, "stepReportSuccess");
              }

              self.totalUploadSize    += Number(responseJson["size"]);
              self.totalDownloadSize  += Number(response.headers.get('Content-Length'));
              self.totalCreateCounter += Number(responseJson["create_counter"]);
              self.totalUpdateCounter += Number(responseJson["update_counter"]);
              self.totalDeleteCounter += Number(responseJson["delete_counter"]);
            } else {
              self.hasError           = true;
              self.errorTitle         = "HTTP (D03)";
              self.errorDescription   = response.status + ": " + response.statusText;
            }

            self.enqueueNextCall();
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP (D04)";
            self.errorDescription   = self.formatError(error);

            self.enqueueNextCall();
          });
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP (D05)";
        self.errorDescription   = response.status + ": " + response.statusText;
      }
    })
    .catch(function(error) {
      self.hasError           = true;
      self.errorTitle         = "HTTP (D06)";
      self.errorDescription   = self.formatError(error);

      self.enqueueNextCall();
    });
  }

  stepReportSuccess() {
    var self = this;

    ui.alert(
      "SUCCESS",
      "Document successfully uploaded.\n" +
      " * " + this.formatSize(self.totalUploadSize) + " uploaded.\n" +
      " * " + this.formatSize(self.totalDownloadSize) + " downloaded.\n" +
      " * " + self.totalCreateCounter + " objects created.\n" +
      " * " + self.totalUpdateCounter + " objects updated.\n" +
      " * " + self.totalDeleteCounter + " objects deleted.\n" +
      Math.round((Date.now() - self.totalTimeFrom) / 1000) + " seconds spent.");
  }
}


export default function() {
  console.log("----------------------------------------")
  var document = sketch.getSelectedDocument();

  if (document === undefined) {
    ui.alert("FAILURE", "No document selected.");
    return;
  }

  var stateMachine = new StateMachine(document);

  stateMachine.enqueueNextItem(stateMachine.stepStart, "stepStart");
  stateMachine.enqueueNextCall();
  stateMachine.showIsRunning = true;
  stateMachine.showNextItem();
}
