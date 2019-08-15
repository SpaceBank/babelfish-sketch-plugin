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

    this.totalSize          = 0;
    this.totalCreateCounter = 0;
    this.totalUpdateCounter = 0;
    this.totalDeleteCounter = 0;

    this.prevCallItem           = null;
    this.prevWebServiceEndpoint = undefined;
    this.prevWebServiceUsername = undefined;
    this.prevWebServicePassword = undefined;
    this.prevWebServiceToken    = undefined;

    this.prevArtboardCounter        = 0;
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

    this.totalTimeFrom = Date.now();
    this.stepTimeFrom = null;
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
    } else if (typeof error.nativeException === "object") {
      return String(error) + "\n" + String(error.nativeException);
    } else {
      return String(error);
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

  enqueueNextItem(func, name) {
    this.callStack.splice(0, 0, [func.bind(this), name]);
  }

  enqueueNextCall() {
    setTimeout(this.callNextItem.bind(this), 1);
  }

  callNextItem() {
    var self = this;

    if (self.prevCallItem != null) {
      var stepDuration = (Date.now() - self.stepTimeFrom);

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

      if (self.prevArtboardCounter < self.artboardCounter) {
        ui.message(self.artboardCounter + " artboards found (" + self.layerCounter + " layers).");

        self.prevArtboardCounter = self.artboardCounter;
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

      if ((self.prevCallItem[1] != 'stepEnumerateLayers') && (self.prevCallItem[1] != 'stepEnumerateImages')) {
        console.log('} // ' + self.prevCallItem[1] + "; " + stepDuration + "ms; " + new Date(Date.now()).toISOString());
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
      self.stepTimeFrom = Date.now();

      setTimeout(item[0], 1);

      if ((self.prevCallItem[1] != 'stepEnumerateLayers') && (self.prevCallItem[1] != 'stepEnumerateImages')) {
        if (self.prevCallItem[1] == "stepReportSuccess") {
          console.log(self.prevCallItem[1] + " { } // " + new Date(Date.now()).toISOString());
        } else {
          console.log(self.prevCallItem[1] + " { // " + new Date(Date.now()).toISOString());
        }
      }
    }
  }

  stepStart() {
    var self = this;

    self.enqueueNextItem(self.stepCheckEndpoint, "stepCheckEndpoint");
    self.enqueueNextCall();
  }

  stepCheckEndpoint() {
    var self = this;

    if (self.webServiceEndpoint === undefined) {
      self.webServiceEndpoint = settings.documentSettingForKey(self.document, "webservice-endpoint");
    }

    if (self.isFirstTimeEndpointInput(false) || (self.webServiceEndpoint === undefined) || (self.webServiceEndpoint === null)) {
      self.enqueueNextItem(self.stepInputEndpoint, "stepInputEndpoint");
    } else {
      self.enqueueNextItem(self.stepCheckUsername, "stepCheckUsername");
    }

    self.enqueueNextCall();
  }

  stepCheckUsername() {
    var self = this;

    if (self.webServiceUsername === undefined) {
      self.webServiceUsername = settings.documentSettingForKey(self.document, "webservice-username");
    }

    if (self.isFirstTimeUsernameInput(false) || (self.webServiceUsername === undefined) || (self.webServiceUsername === null)) {
      self.enqueueNextItem(self.stepInputUsername, "stepInputUsername");
    } else {
      self.enqueueNextItem(self.stepCheckPassword, "stepCheckPassword");
    }

    self.enqueueNextCall();
  }

  stepCheckPassword() {
    var self = this;

    if (self.webServicePassword === undefined) {
      self.webServicePassword = settings.documentSettingForKey(self.document, "webservice-password");
    }

    if (self.isFirstTimePasswordInput(false) || (self.webServicePassword === undefined) || (self.webServicePassword === null)) {
      self.enqueueNextItem(self.stepInputPassword, "stepInputPassword");
    } else {
      self.enqueueNextItem(self.stepEnumerateDocumentLayers, "stepEnumerateDocumentLayers");
    }

    self.enqueueNextCall();
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
          self.errorTitle         = "USER INPUT (A01)";
          self.errorDescription   = "Endpoint is required.";
        } else {
          self.webServiceEndpoint = value;
          settings.setDocumentSettingForKey(self.document, "webservice-endpoint", self.webServiceEndpoint);
          self.enqueueNextItem(self.stepCheckEndpoint, "stepCheckEndpoint");
        }

        self.enqueueNextCall();
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
          self.errorTitle         = "USER INPUT (B01)";
          self.errorDescription   = "Username is required.";
        } else {
          self.webServiceUsername = value;
          settings.setDocumentSettingForKey(self.document, "webservice-username", self.webServiceUsername);
          self.enqueueNextItem(self.stepCheckUsername, "stepCheckUsername");
        }

        self.enqueueNextCall();
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
          self.errorTitle         = "USER INPUT (C01)";
          self.errorDescription   = "Password is required.";
        } else {
          self.webServicePassword = value;
          settings.setDocumentSettingForKey(self.document, "webservice-password", self.webServicePassword);
          self.enqueueNextItem(self.stepCheckPassword, "stepCheckPassword");
        }

        self.enqueueNextCall();
      }
    );
  }

  stepReAskEndpoint() {
    var self = this;

    self.isFirstTimeEndpointInput(true);
    self.enqueueNextCall();
  }

  stepReAskUsername() {
    var self = this;

    self.isFirstTimeUsernameInput(true);
    self.enqueueNextCall();
  }

  stepReAskPassword() {
    var self = this;

    self.isFirstTimePasswordInput(true);
    self.enqueueNextCall();
  }

  stepEnumerateLayers() {
    var self = this;
    var item = self.layerFilterQueue.pop();
    var layer = item[0];
    var parentLayers = item[1];

    if ((layer.type != "Page") || (layer.name != "Assets")) {
      if (layer.type == "Artboard") {
        self.artboardCounter++;
      }

      self.layerCounter++;

      if (
        (layer.type == "Page") ||
        (layer.type == "Artboard") ||
        (layer.type == "SymbolMaster") ||
        (layer.type == "SymbolInstance") ||
        (layer.type == "Group") ||
        (layer.type == "Image") ||
        (layer.type == "Text") ||
        (layer.type == "Shape") ||
        (layer.type == "ShapePath") ||
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
      "target_uuid": null,
      "rect": null,
      "png_image": null,
      "svg_image": null,
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
        (layer.type == "Image") ||
        (layer.type == "Text") ||
        (layer.type == "Shape") ||
        (layer.type == "ShapePath") ||
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
        self.enqueueNextItem(self.stepReAskUsername, "stepReAskUsername");
        self.enqueueNextItem(self.stepReAskUsername, "stepReAskPassword");
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP (A03)";
        self.errorDescription   = response.status + ": " + response.statusText;
        self.webServiceToken    = undefined;
        self.enqueueNextItem(self.stepReAskEndpoint, "stepReAskEndpoint");
        self.enqueueNextItem(self.stepReAskUsername, "stepReAskUsername");
        self.enqueueNextItem(self.stepReAskPassword, "stepReAskPassword");
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

              self.totalSize          += Number(responseJson['size']);
              self.totalCreateCounter += Number(responseJson['create_counter']);
              self.totalUpdateCounter += Number(responseJson['update_counter']);
              self.totalDeleteCounter += Number(responseJson['delete_counter']);
              self.imageStats         = responseJson['image_stats'];
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

              self.totalSize          += Number(responseJson['size']);
              self.totalCreateCounter += Number(responseJson['create_counter']);
              self.totalUpdateCounter += Number(responseJson['update_counter']);
              self.totalDeleteCounter += Number(responseJson['delete_counter']);
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

              self.totalSize          += Number(responseJson['size']);
              self.totalCreateCounter += Number(responseJson['create_counter']);
              self.totalUpdateCounter += Number(responseJson['update_counter']);
              self.totalDeleteCounter += Number(responseJson['delete_counter']);
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
    var bytesText = this.formatSize(self.totalSize);

    ui.alert(
      "SUCCESS",
      "Document successfully uploaded.\n" +
      " * " + bytesText + " uploaded.\n" +
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
}
