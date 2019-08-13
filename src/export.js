import settings from "sketch/settings"
import sketch   from "sketch"
import ui       from "sketch/ui"


const fetch      = require("sketch-polyfill-fetch");
const base64     = require("./base64.js");


function assignmentBugWorkaround(buggyValue) {
  return buggyValue;
}


function getAuthorizationHeader(username, password) {
    return "Basic " + base64.encodeStr(username + ":" + password);
}


class StateMachine {
  constructor(document) {
    this.document                 = document;
    this.callStack                = [];
    this.hasError                 = false;
    this.errorTitle               = undefined;
    this.errorDescription         = undefined;

    this.webServiceEndpoint = undefined;
    this.webServiceUsername = undefined;
    this.webServicePassword = undefined;
    this.webServiceToken    = undefined;

    this.layerCounter              = 0;
    this.layerFilterQueue          = [];
    this.layerUploadQueue          = [];
    this.imageCounter              = 0;
    this.imageFilterQueue          = [];
    this.imageUploadQueue          = [];
    this.cumulativeImageUpload     = [];
    this.cumulativeImageUploadSize = 1024 * 1024 * 1024;
    this.imageStats                = {};

    this.totalSize          = 0;
    this.totalCreateCounter = 0;
    this.totalUpdateCounter = 0;
    this.totalDeleteCounter = 0;

    this.prevCallItem           = null;
    this.prevWebServiceEndpoint = undefined;
    this.prevWebServiceUsername = undefined;
    this.prevWebServicePassword = undefined;
    this.prevWebServiceToken    = undefined;

    this.prevLayerCounter           = 0;
    this.prevLayerFilterQueueLength = 0;
    this.prevLayerUploadQueueLength = 0;
    this.prevImageCounter           = 0;
    this.prevImageFilterQueueLength = 0;
    this.prevImageUploadQueueLength = 0;

    this.prevTotalSize          = 0;
    this.prevTotalCreateCounter = 0;
    this.prevTotalUpdateCounter = 0;
    this.prevTotalDeleteCounter = 0;

    this.timeFrom = Date.now()
  }

  formatSize(byteNumber) {
    if (byteNumber < 1024) {
      return byteNumber + " bytes";
    } else if (byteNumber < 2 * 1024 * 1024) {
      return (Math.round(10 * byteNumber / 1024.0) / 10.0) + " Kb";
    } else if (byteNumber < 2 * 1024 * 1024 * 1024) {
      return (Math.round(10 * byteNumber / (1024.0 * 1024.0)) / 10.0) + " Mb";
    } else {
      return (Math.round(10 * byteNumber / (1024.0 * 1024.0 * 1024.0)) / 10.0) + " Gb";
    }
  }

  formatError(error) {
    if (typeof error.localizedDescription === "function") {
      return error.localizedDescription();
    } else {
      return String(errror);
    }
  }

  documentSessionBoolean(prefix, defaultValue, newValue) {
    var fullName = prefix + assignmentBugWorkaround(this.document.id);
    var oldValue = settings.sessionVariable(fullName);

    if (newValue !== undefined) {
      settings.setSessionVariable(fullName, Boolean(newValue));
    }

    if (oldValue === undefined) {
      return Boolean(defaultValue);
    }

    return Boolean(oldValue);
  }

  isFirstTimeEndpointInput(newValue) {
    return this.documentSessionBoolean("is-first-time-endpoint-input-", true, newValue);
  }

  isFirstTimeUsernameInput(newValue) {
    return this.documentSessionBoolean("is-first-time-username-input-", true, newValue);
  }

  isFirstTimePasswordInput(newValue) {
    return this.documentSessionBoolean("is-first-time-password-input-", true, newValue);
  }

  callNextItem() {
    var self = this;

    if (self.prevCallItem != null) {
      if (self.prevWebServiceEndpoint != self.webServiceEndpoint) {
        console.log("    Endpoint = \"" + self.webServiceEndpoint + "\"; // was \"" + self.prevWebServiceEndpoint + "\".");
        self.prevWebServiceEndpoint = self.webServiceEndpoint;
      }

      if (self.prevWebServiceUsername != self.webServiceUsername) {
        console.log("    Username = \"" + self.webServiceUsername + "\"; // was \"" + self.prevWebServiceUsername + "\".");
        self.prevWebServiceUsername = self.webServiceUsername;
      }

      if (self.prevWebServicePassword != self.webServicePassword) {
        console.log("    Password = \"" + self.webServicePassword + "\"; // was \"" + self.prevWebServicePassword + "\".");
        self.prevWebServicePassword = self.webServicePassword;
      }

      if (self.prevWebServiceToken != self.webServiceToken) {
        console.log("    Token = \"" + self.webServiceToken + "\"; // was \"" + self.prevWebServiceToken + "\".");
        self.prevWebServiceToken = self.webServiceToken;
      }

      if (self.prevLayerCounter < self.layerCounter) {
        if (self.layerCounter % 10 == 0) {
          ui.message(self.layerCounter + " layers found.");
        }

        self.prevLayerCounter = self.layerCounter;
      }

      if (self.prevImageCounter < self.imageCounter) {
        if (self.imageCounter % 10 == 0) {
          ui.message(self.imageCounter + " images found.");
        }

        self.prevImageCounter = self.imageCounter;
      }

      if (self.prevLayerUploadQueueLength != self.layerUploadQueue.length) {
        console.log("    LayerUploadQueueLength = " + self.layerUploadQueue.length + "; // was " + self.prevLayerUploadQueueLength + ".");
        self.prevLayerUploadQueueLength = self.layerUploadQueue.length;
      }

      if (self.prevImageUploadQueueLength != self.imageUploadQueue.length) {
        console.log("    ImageUploadQueueLength = " + self.imageUploadQueue.length + "; // was " + self.prevImageUploadQueueLength + ".");
        self.prevImageUploadQueueLength = self.imageUploadQueue.length;
      }

      if (self.prevTotalSize != self.totalSize) {
        console.log("    TotalSize = " + self.totalSize + "; // was " + self.prevTotalSize + ".");

        ui.message(this.formatSize(self.totalSize - self.prevTotalSize) + " chunk uploaded (" + this.formatSize(self.totalSize) + " total).");

        self.prevTotalSize = self.totalSize;
      }

      if (self.prevTotalCreateCounter != self.totalCreateCounter) {
        console.log("    TotalCreateCounter = " + self.totalCreateCounter + "; // was " + self.prevTotalCreateCounter + ".");
        self.prevTotalCreateCounter = self.totalCreateCounter;
      }

      if (self.prevTotalUpdateCounter != self.totalUpdateCounter) {
        console.log("    TotalUpdateCounter = " + self.totalUpdateCounter + "; // was " + self.prevTotalUpdateCounter + ".");
        self.prevTotalUpdateCounter = self.totalUpdateCounter;
      }

      if (self.prevTotalDeleteCounter != self.totalDeleteCounter) {
        console.log("    TotalDeleteCounter = " + self.totalDeleteCounter + "; // was " + self.prevTotalDeleteCounter + ".");
        self.prevTotalDeleteCounter = self.totalDeleteCounter;
      }

      if ((self.prevCallItem.name != 'stepEnumerateLayers') && (self.prevCallItem.name != 'stepEnumerateImages')) {
        console.log('} // ' + self.prevCallItem.name + "; " + new Date(Date.now()).toISOString());
      }
    }

    if (self.hasError) {
      console.log("ERROR: " + self.errorTitle + "; " + self.errorDescription);
      self.hasError = false;
      ui.alert(self.errorTitle, self.errorDescription);
    }

    if (self.callStack.length > 0) {
      var item = self.callStack.pop();

      self.prevCallItem = item;

      setTimeout(item.bind(self), 1);

      if ((self.prevCallItem.name != 'stepEnumerateLayers') && (self.prevCallItem.name != 'stepEnumerateImages')) {
        if (self.prevCallItem.name == "stepReportSuccess") {
          console.log(self.prevCallItem.name + " { } // " + new Date(Date.now()).toISOString());
        } else {
          console.log(self.prevCallItem.name + " { // " + new Date(Date.now()).toISOString());
        }
      }
    }
  }

  stepStart() {
    var self = this;

    self.callStack.splice(0, 0, self.stepCheckEndpoint);
    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepCheckEndpoint() {
    var self = this;

    if (self.webServiceEndpoint === undefined) {
      self.webServiceEndpoint = settings.documentSettingForKey(self.document, "webservice-endpoint");
    }

    if (self.isFirstTimeEndpointInput(false) || (self.webServiceEndpoint === undefined) || (self.webServiceEndpoint === null)) {
      self.callStack.splice(0, 0, self.stepInputEndpoint);
    } else {
      self.callStack.splice(0, 0, self.stepCheckUsername);
    }

    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepCheckUsername() {
    var self = this;

    if (self.webServiceUsername === undefined) {
      self.webServiceUsername = settings.documentSettingForKey(self.document, "webservice-username");
    }

    if (self.isFirstTimeUsernameInput(false) || (self.webServiceUsername === undefined) || (self.webServiceUsername === null)) {
      self.callStack.splice(0, 0, self.stepInputUsername);
    } else {
      self.callStack.splice(0, 0, self.stepCheckPassword);
    }

    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepCheckPassword() {
    var self = this;

    if (self.webServicePassword === undefined) {
      self.webServicePassword = settings.documentSettingForKey(self.document, "webservice-password");
    }

    if (self.isFirstTimePasswordInput(false) || (self.webServicePassword === undefined) || (self.webServicePassword === null)) {
      self.callStack.splice(0, 0, self.stepInputPassword);
    } else {
      self.callStack.splice(0, 0, self.stepEnumerateDocumentLayers);
    }

    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepInputEndpoint() {
    var self = this;

    ui.getInputFromUser(
      "Endpoint:",
      { initialValue: self.webServiceEndpoint, numberOfLines: 3 },
      (err, value) => {
        if (err) {
          self.webServiceEndpoint = undefined;
          self.hasError           = true;
          self.errorTitle         = "USER INPUT";
          self.errorDescription   = "Endpoint is required.";
        } else {
          self.webServiceEndpoint = value;
          settings.setDocumentSettingForKey(self.document, "webservice-endpoint", self.webServiceEndpoint);
          self.callStack.splice(0, 0, self.stepCheckEndpoint);
        }

        setTimeout(self.callNextItem.bind(self), 0);
      }
    );
  }

  stepInputUsername() {
    var self = this;

    ui.getInputFromUser(
      "Username:",
      { initialValue: self.webServiceUsername },
      (err, value) => {
        if (err) {
          self.webServiceUsername = undefined;
          self.hasError           = true;
          self.errorTitle         = "USER INPUT";
          self.errorDescription   = "Username is required.";
        } else {
          self.webServiceUsername = value;
          settings.setDocumentSettingForKey(self.document, "webservice-username", self.webServiceUsername);
          self.callStack.splice(0, 0, self.stepCheckUsername);
        }

        setTimeout(self.callNextItem.bind(self), 0);
      }
    );
  }

  stepInputPassword() {
    var self = this;

    ui.getInputFromUser(
      "Password:",
      { initialValue: self.webServicePassword },
      (err, value) => {
        if (err) {
          self.webServicePassword = undefined;
          self.hasError           = true;
          self.errorTitle         = "USER INPUT";
          self.errorDescription   = "Password is required.";
        } else {
          self.webServicePassword = value;
          settings.setDocumentSettingForKey(self.document, "webservice-password", self.webServicePassword);
          self.callStack.splice(0, 0, self.stepCheckPassword);
        }

        setTimeout(self.callNextItem.bind(self), 0);
      }
    );
  }

  stepReAskEndpoint() {
    var self = this;

    self.isFirstTimeEndpointInput(true);
    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepReAskUsername() {
    var self = this;

    self.isFirstTimeUsernameInput(true);
    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepClearPassword() {
    var self = this;

    self.webServicePassword = undefined;
    settings.setSessionVariable("webservice-password", undefined);
    //self.callStack.splice(0, 0, self.stepInputUsername);
    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepEnumerateLayers() {
    var self = this;
    var item = self.layerFilterQueue.pop();
    var layer = item[0];
    var parentLayers = item[1];

    if ((layer.type == "Page") && (layer.name == "Assets")) {
      return;
    }

    if (
      (layer.type == "Page") ||
      (layer.type == "Artboard") ||
      (layer.type == "SymbolMaster") ||
      (layer.type == "SymbolInstance") ||
      (layer.type == "Group") ||
      (layer.type == "Image") ||
      (layer.type == "Text") ||
      (layer.type == "Shape") ||
      // (layer.type == "ShapePath") ||
      false) {
      self.objectCounter++;

      var rect = null;
      var masterUuid = null;
      var childLayers = [];

      if (layer.frame !== undefined) {
        rect = { "x": layer.frame.x, "y": layer.frame.y, "w": layer.frame.width, "h": layer.frame.height };
      }

      if (layer.layers !== undefined) {
        layer.layers.forEach(
          function(l, i) {
            self.layerFilterQueue.push([l, childLayers]);
          }
        );
      }

      var overrides = [];
      var text = null;

      if (layer.type == "SymbolInstance") {
        layer.overrides.forEach(function(o, i) {
          if (o.property == "stringValue") {
            overrides.push({
              "path": o.path,
              "value": o.value
            });
          }
        });

        masterUuid = assignmentBugWorkaround(layer.master.id);
      }

      if (layer.type == "Text") {
        text = layer.text;
      }

      var uuid = assignmentBugWorkaround(layer.id); 

      parentLayers.push({
        "uuid": uuid,
        "type": layer.type,
        "name": layer.name,
        "master_uuid": masterUuid,
        "target_uuid": null,
        "text": text,
        "rect": rect,
        "png_image": null,
        "svg_image": null,
        "layers": childLayers,
        "overrides": overrides
      });
    }

    if (self.layerFilterQueue.length > 0) {
      self.callStack.splice(0, 0, self.stepEnumerateLayers);
      setTimeout(self.callNextItem.bind(self), 0);
    } else if (self.layerUploadQueue.length > 0) {
      self.callStack.splice(0, 0, self.stepGetLayerCsrfToken);
      setTimeout(self.callNextItem.bind(self), 0);
    } else {
      self.callStack.splice(0, 0, self.stepReportSuccess);
      setTimeout(self.callNextItem.bind(self), 0);
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
      "name": self.document.path,
      "master_uuid": null,
      "target_uuid": null,
      //"parent_uuid": null,
      //"level": 0,
      "rect": null,
      "png_image": null,
      "svg_image": null,
      "layers": documentLayers,
      "overrides": []
    });

    self.callStack.splice(0, 0, self.stepEnumerateLayers);
    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepEnumerateImages() {
    var self = this;
    var layer = self.imageFilterQueue.pop();

    if ((layer.type == "Page") && (layer.name == "Assets")) {
      return;
    }

    if (
      (layer.type == "Page") ||
      (layer.type == "Artboard") ||
      (layer.type == "SymbolMaster") ||
      (layer.type == "SymbolInstance") ||
      (layer.type == "Group") ||
      (layer.type == "Image") ||
      (layer.type == "Text") ||
      (layer.type == "Shape") ||
      // (layer.type == "ShapePath") ||
      false) {
      self.objectCounter++;

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
          imageStats = {'png_image_size': -1};
        }

        const pngOptions = { formats: "png", output: false };
        const pngBuffer = sketch.export(layer, pngOptions);

        var pngImage = base64.encodeBin(pngBuffer);

        if (pngBuffer.length != imageStats['png_image_size']) {
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
          imageStats = {'svg_image_size': -1, 'png_image_size': -1};
        }

        const svgOptions = { formats: "svg", output: false };
        const svgBuffer = sketch.export(layer, svgOptions);

        var svgImage = base64.encodeBin(svgBuffer);

        if (svgBuffer.length != imageStats['svg_image_size']) {
          const pngOptions = { formats: "png", output: false };
          const pngBuffer = sketch.export(layer, pngOptions);

          var pngImage = base64.encodeBin(pngBuffer);

          if (pngBuffer.length != imageStats['png_image_size']) {
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

    if (self.imageFilterQueue.length > 0) {
      self.callStack.splice(0, 0, self.stepEnumerateImages);
      setTimeout(self.callNextItem.bind(self), 0);
    } else {
      self.cumulativeImageUpload = [];
      self.cumulativeImageUploadSize = 0;
      self.imageUploadQueue.push({"images": self.cumulativeImageUpload});

      if (self.imageUploadQueue.length > 0) {
        self.callStack.splice(0, 0, self.stepGetImageCsrfToken);
        setTimeout(self.callNextItem.bind(self), 0);
      } else {
        self.callStack.splice(0, 0, self.stepGetActionCsrfToken);
        setTimeout(self.callNextItem.bind(self), 0);
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

    self.callStack.splice(0, 0, self.stepEnumerateImages);
    setTimeout(self.callNextItem.bind(self), 0);
  }

  utilGetCsrfToken(nextItem) {
    var self = this;
    var csrfTokenPattern = /csrftoken=([A-Za-z0-9]+)/s;

    fetch(self.webServiceEndpoint,
    {
      method: "GET",
      headers: {
          "Authorization": getAuthorizationHeader(self.webServiceUsername, self.webServicePassword)
      }
    })
    .then(function(response) {
      if (response.status == 200) {
        var setCookieHeader = String(response.headers.get("set-cookie"));

        if (setCookieHeader !== undefined) {
          self.webServiceToken  = csrfTokenPattern.exec(setCookieHeader)[1];
          self.callStack.splice(0, 0, nextItem);
        } else {
          self.hasError         = true;
          self.errorTitle       = "HTTP";
          self.errorDescription = "Server returned no CSRF token cookie.";
          self.webServiceToken  = undefined;
        }
      } else if (response.status == 403) {
        self.hasError           = true;
        self.errorTitle         = "HTTP";
        self.errorDescription   = "Authentication failed.\n" + response.status + ": " + response.statusText;
        self.webServiceToken    = undefined;
        self.callStack.splice(0, 0, self.stepReAskUsername);
        self.callStack.splice(0, 0, self.stepClearPassword);
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP";
        self.errorDescription   = response.status + ": " + response.statusText;
        self.webServiceToken    = undefined;
        self.callStack.splice(0, 0, self.stepReAskEndpoint);
        self.callStack.splice(0, 0, self.stepReAskUsername);
        self.callStack.splice(0, 0, self.stepClearPassword);
      }

      setTimeout(self.callNextItem.bind(self), 0);
    })
    .catch(function(error) {
      self.hasError           = true;
      self.errorTitle         = "HTTP";
      self.errorDescription   = self.formatError(error);
      self.webServiceToken    = undefined;
      setTimeout(self.callNextItem.bind(self), 0);
    });
  }

  stepGetLayerCsrfToken() {
    this.utilGetCsrfToken(this.stepUploadLayer);
  }

  stepGetImageCsrfToken() {
    this.utilGetCsrfToken(this.stepUploadImage);
  }

  stepGetActionCsrfToken() {
    this.utilGetCsrfToken(this.stepUploadAction);
  }

  stepUploadLayer() {
    var self = this;
    var json = self.layerUploadQueue.pop();

    fetch(self.webServiceEndpoint,
    {
      method: "PATCH",
      body: json,
      headers: {
          "Cookie": "csrftoken=" + self.webServiceToken,
          "Authorization": getAuthorizationHeader(self.webServiceUsername, self.webServicePassword),
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
            self.errorTitle         = "HTTP";
            self.errorDescription   = response.status + ": " + response.statusText;

            if (titleMatch != null) {
              self.errorDescription += "\n" + titleMatch[1];
            }

            if (summaryMatch != null) {
              self.errorDescription += "\n" + summaryMatch[1].replace(/<\/?[a-z0-1]+>/sg, "").replace(/\n[ ]+/sg, "");
            }

            setTimeout(self.callNextItem.bind(self), 0);
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP";
            self.errorDescription   = self.formatError(error);

            setTimeout(self.callNextItem.bind(self), 0);
          });
      } else if (contentType.startsWith("application/json") || contentType.startsWith("text/json")) {
        response.json()
          .then(function(responseJson) {
            if ((response.status >= 200) && (response.status < 300)) {
              if (self.layerUploadQueue.length > 0) {
                self.callStack.splice(0, 0, self.stepGetLayerCsrfToken);
              } else {
                self.callStack.splice(0, 0, self.stepEnumerateDocumentImages);
              }

              self.totalSize          += Number(responseJson['size']);
              self.totalCreateCounter += Number(responseJson['create_counter']);
              self.totalUpdateCounter += Number(responseJson['update_counter']);
              self.totalDeleteCounter += Number(responseJson['delete_counter']);
              self.imageStats         = responseJson['image_stats'];
            } else {
              self.hasError           = true;
              self.errorTitle         = "HTTP";
              self.errorDescription   = response.status + ": " + response.statusText;
            }

            setTimeout(self.callNextItem.bind(self), 0);
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP";
            self.errorDescription   = self.formatError(error);

            setTimeout(self.callNextItem.bind(self), 0);
          });
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP";
        self.errorDescription   = response.status + ": " + response.statusText;
      }
    })
    .catch(function(error) {
      self.hasError           = true;
      self.errorTitle         = "HTTP";
      self.errorDescription   = self.formatError(error);

      setTimeout(self.callNextItem.bind(self), 0);
    });
  }

  stepUploadImage() {
    var self = this;
    var json = self.imageUploadQueue.pop();

    fetch(self.webServiceEndpoint,
    {
      method: "PATCH",
      body: json,
      headers: {
          "Cookie": "csrftoken=" + self.webServiceToken,
          "Authorization": getAuthorizationHeader(self.webServiceUsername, self.webServicePassword),
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
            self.errorTitle         = "HTTP";
            self.errorDescription   = response.status + ": " + response.statusText;

            if (titleMatch != null) {
              self.errorDescription += "\n" + titleMatch[1];
            }

            if (summaryMatch != null) {
              self.errorDescription += "\n" + summaryMatch[1].replace(/<\/?[a-z0-1]+>/sg, "").replace(/\n[ ]+/sg, "");
            }

            setTimeout(self.callNextItem.bind(self), 0);
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP";
            self.errorDescription   = self.formatError(error);

            setTimeout(self.callNextItem.bind(self), 0);
          });
      } else if (contentType.startsWith("application/json") || contentType.startsWith("text/json")) {
        response.json()
          .then(function(responseJson) {
            if ((response.status >= 200) && (response.status < 300)) {
              if (self.imageUploadQueue.length > 0) {
                self.callStack.splice(0, 0, self.stepGetImageCsrfToken);
              } else {
                self.callStack.splice(0, 0, self.stepGetActionCsrfToken);
              }

              self.totalSize          += Number(responseJson['size']);
              self.totalCreateCounter += Number(responseJson['create_counter']);
              self.totalUpdateCounter += Number(responseJson['update_counter']);
              self.totalDeleteCounter += Number(responseJson['delete_counter']);
            } else {
              self.hasError           = true;
              self.errorTitle         = "HTTP";
              self.errorDescription   = response.status + ": " + response.statusText;
            }

            setTimeout(self.callNextItem.bind(self), 0);
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP";
            self.errorDescription   = self.formatError(error);

            setTimeout(self.callNextItem.bind(self), 0);
          });
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP";
        self.errorDescription   = response.status + ": " + response.statusText;
      }
    })
    .catch(function(error) {
      self.hasError           = true;
      self.errorTitle         = "HTTP";
      self.errorDescription   = self.formatError(error);

      setTimeout(self.callNextItem.bind(self), 0);
    });
  }

  stepUploadAction() {
    var self = this;
    var json = {
      "uuid": assignmentBugWorkaround(self.document.id),
      "action": "convert"
    };

    fetch(self.webServiceEndpoint,
    {
      method: "PATCH",
      body: json,
      headers: {
          "Cookie": "csrftoken=" + self.webServiceToken,
          "Authorization": getAuthorizationHeader(self.webServiceUsername, self.webServicePassword),
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
            self.errorTitle         = "HTTP";
            self.errorDescription   = response.status + ": " + response.statusText;

            if (titleMatch != null) {
              self.errorDescription += "\n" + titleMatch[1];
            }

            if (summaryMatch != null) {
              self.errorDescription += "\n" + summaryMatch[1].replace(/<\/?[a-z0-1]+>/sg, "").replace(/\n[ ]+/sg, "");
            }

            setTimeout(self.callNextItem.bind(self), 0);
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP";
            self.errorDescription   = self.formatError(error);

            setTimeout(self.callNextItem.bind(self), 0);
          });
      } else if (contentType.startsWith("application/json") || contentType.startsWith("text/json")) {
        response.json()
          .then(function(responseJson) {
            if ((response.status >= 200) && (response.status < 300)) {
              if (self.imageUploadQueue.length > 0) {
                self.callStack.splice(0, 0, self.stepGetImageCsrfToken);
              } else {
                self.callStack.splice(0, 0, self.stepReportSuccess);
              }

              self.totalSize          += Number(responseJson['size']);
              self.totalCreateCounter += Number(responseJson['create_counter']);
              self.totalUpdateCounter += Number(responseJson['update_counter']);
              self.totalDeleteCounter += Number(responseJson['delete_counter']);
            } else {
              self.hasError           = true;
              self.errorTitle         = "HTTP";
              self.errorDescription   = response.status + ": " + response.statusText;
            }

            setTimeout(self.callNextItem.bind(self), 0);
          })
          .catch(function(error) {
            self.hasError           = true;
            self.errorTitle         = "HTTP";
            self.errorDescription   = self.formatError(error);

            setTimeout(self.callNextItem.bind(self), 0);
          });
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP";
        self.errorDescription   = response.status + ": " + response.statusText;
      }
    })
    .catch(function(error) {
      self.hasError           = true;
      self.errorTitle         = "HTTP";
      self.errorDescription   = self.formatError(error);

      setTimeout(self.callNextItem.bind(self), 0);
    });
  }

  stepReportSuccess() {
    var self = this;
    var bytesText = this.formatSize(self.totalSize);

    ui.alert(
      "SUCCESS",
      "Document successfully uploaded.\n" +
      " * " + bytesText + " uploaded.\n" +
      " * " + self.totalCreateCounter + " objects created.\n" +
      " * " + self.totalUpdateCounter + " objects updated.\n" +
      " * " + self.totalDeleteCounter + " objects deleted.\n" +
      Math.round((Date.now() - self.timeFrom) / 1000) + " seconds spent.");
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

  setTimeout(stateMachine.stepStart.bind(stateMachine), 0);
}
