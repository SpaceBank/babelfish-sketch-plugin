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
    this.isFirstTimeEndpointInput = settings.sessionVariable("is-first-time-endpoint-input") != "true";
    this.isFirstTimeUsernameInput = settings.sessionVariable("is-first-time-username-input") != "true";
    this.isFirstTimePasswordInput = settings.sessionVariable("is-first-time-password-input") != "true";

    this.webServiceEndpoint       = undefined;
    this.webServiceUsername       = undefined;
    this.webServicePassword       = undefined;
    this.webServiceToken          = undefined;
    this.jsonQueue                = [];
    this.totalSize                = 0;
    this.totalCreateCounter       = 0;
    this.totalUpdateCounter       = 0;
    this.totalDeleteCounter       = 0;

    this.prevCallItem             = null;
    this.prevWebServiceEndpoint   = undefined;
    this.prevWebServiceUsername   = undefined;
    this.prevWebServicePassword   = undefined;
    this.prevWebServiceToken      = undefined;
    this.prevJsonQueueLength      = 0;
    this.prevTotalSize            = 0;
    this.prevTotalCreateCounter   = 0;
    this.prevTotalUpdateCounter   = 0;
    this.prevTotalDeleteCounter   = 0;

    settings.setSessionVariable("is-first-time-endpoint-input", "true");
    settings.setSessionVariable("is-first-time-username-input", "true");
    settings.setSessionVariable("is-first-time-password-input", "true");
  }

  callNextItem() {
    var self = this;

    if (self.prevCallItem != null) {
      console.log(self.prevCallItem.name);

      if (self.prevWebServiceEndpoint != self.webServiceEndpoint) {
        console.log("    Endpoint became \"" + self.webServiceEndpoint + "\"; was \"" + self.prevWebServiceEndpoint + "\".");
        self.prevWebServiceEndpoint = self.webServiceEndpoint;
      }

      if (self.prevWebServiceUsername != self.webServiceUsername) {
        console.log("    Username became \"" + self.webServiceUsername + "\"; was \"" + self.prevWebServiceUsername + "\".");
        self.prevWebServiceUsername = self.webServiceUsername;
      }

      if (self.prevWebServicePassword != self.webServicePassword) {
        console.log("    Password became \"" + self.webServicePassword + "\"; was \"" + self.prevWebServicePassword + "\".");
        self.prevWebServicePassword = self.webServicePassword;
      }

      if (self.prevWebServiceToken != self.webServiceToken) {
        console.log("    Token became \"" + self.webServiceToken + "\"; was \"" + self.prevWebServiceToken + "\".");
        self.prevWebServiceToken = self.webServiceToken;
      }

      if (self.prevJsonQueueLength != self.jsonQueue.length) {
        console.log("    JsonQueueLength became " + self.jsonQueue.length + "; was " + self.prevJsonQueueLength + ".");
        self.prevJsonQueueLength = self.jsonQueue.length;
      }

      if (self.prevTotalSize != self.totalSize) {
        console.log("    TotalSize became " + self.totalSize + "; was " + self.prevTotalSize + ".");
        self.prevTotalSize = self.totalSize;
      }

      if (self.prevTotalCreateCounter != self.totalCreateCounter) {
        console.log("    TotalCreateCounter became " + self.totalCreateCounter + "; was " + self.prevTotalCreateCounter + ".");
        self.prevTotalCreateCounter = self.totalCreateCounter;
      }

      if (self.prevTotalUpdateCounter != self.totalUpdateCounter) {
        console.log("    TotalUpdateCounter became " + self.totalUpdateCounter + "; was " + self.prevTotalUpdateCounter + ".");
        self.prevTotalUpdateCounter = self.totalUpdateCounter;
      }

      if (self.prevTotalDeleteCounter != self.totalDeleteCounter) {
        console.log("    TotalDeleteCounter became " + self.totalDeleteCounter + "; was " + self.prevTotalDeleteCounter + ".");
        self.prevTotalDeleteCounter = self.totalDeleteCounter;
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

      setTimeout(item.bind(self), 0);
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

    if (self.isFirstTimeEndpointInput || (self.webServiceEndpoint === undefined) || (self.webServiceEndpoint === null)) {
      self.isFirstTimeEndpointInput = false;
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

    if (self.isFirstTimeUsernameInput || (self.webServiceUsername === undefined) || (self.webServiceUsername === null)) {
      self.isFirstTimeUsernameInput = false;
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

    if (self.isFirstTimePasswordInput || (self.webServicePassword === undefined) || (self.webServicePassword === null)) {
      self.isFirstTimePasswordInput = false;
      self.callStack.splice(0, 0, self.stepInputPassword);
    } else {
      self.callStack.splice(0, 0, self.stepEnumerateDocument);
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

    self.isFirstTimeEndpointInput = true;
    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepReAskUsername() {
    var self = this;

    self.isFirstTimeUsernameInput = true;
    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepClearPassword() {
    var self = this;

    self.webServicePassword = undefined;
    settings.setSessionVariable("webservice-password", undefined);
    //self.callStack.splice(0, 0, self.stepInputUsername);
    setTimeout(self.callNextItem.bind(self), 0);
  }

  utilEnumerateArtboardLayers(layer, layerIndex, layerLevel) {
    if (
      //(layer.type != "Page") &&
      (layer.type != "Artboard") &&
      (layer.type != "SymbolMaster") &&
      (layer.type != "SymbolInstance") &&
      (layer.type != "Group") &&
      //(layer.type != "Image") &&
      (layer.type != "Text") &&
      (layer.type != "Shape") &&
      (layer.type != "ShapePath") &&
      true) {
      return false;
    }

    var self = this;
    var masterUuid = null;
    var targetUuid = null;
    var rect = null;
    var pngImage = null;
    var svgImage = null;
    var childLayers = [];
    var overrides = [];

    if (layer.type == "SymbolInstance") {
      masterUuid = assignmentBugWorkaround(layer.master.id);
    }

    if (layer.flow !== undefined) {
      targetUuid = assignmentBugWorkaround(layer.flow.targetId);
    }

    if (layer.frame !== undefined) {
      rect = { "x": layer.frame.x, "y": layer.frame.y, "w": layer.frame.width, "h": layer.frame.height };
    }

    if ((layer.type == "Artboard") || (layer.type == "SymbolInstance") || (layer.type == "Text")) {
      const pngOptions = { formats: "png", output: false };
      const pngBuffer = sketch.export(layer, pngOptions);

      pngImage = base64.encodeBin(pngBuffer);

      const svgOptions = { formats: "svg", output: false };
      const svgBuffer = sketch.export(layer, svgOptions);

      svgImage = base64.encodeBin(svgBuffer);
    }

    if (layer.layers !== undefined) {
      layer.layers.forEach(
        function(l, i) {
          var childLayer = self.utilEnumerateArtboardLayers(l, i, layerLevel + 1);

          if (childLayer) {
            childLayers.push(childLayer);
          }
        }
      );
    }

    if (layer.type == "SymbolInstance") {
      layer.overrides.forEach(function(o, i) {
        if (o.property == "stringValue") {
          overrides.push({
            "path": o.path,
            "value": o.value
          });
        }
      });
    }

    return {
      "uuid": assignmentBugWorkaround(layer.id),
      "type": layer.type,
      "name": layer.name,
      "master_uuid": masterUuid,
      "target_uuid": targetUuid,
      "rect": rect,
      "png_image": pngImage,
      "svg_image": svgImage,
      "layers": childLayers,
      "overrides": overrides
    };
  }

  utilEnumerateDocumentLayersUpToArtboard(layer, layerIndex, layerLevel) {
    if (
      (layer.type != "Page") &&
      (layer.type != "Artboard") &&
      (layer.type != "SymbolMaster") &&
      (layer.type != "SymbolInstance") &&
      (layer.type != "Group") &&
      //(layer.type != "Image") &&
      (layer.type != "Text") &&
      (layer.type != "Shape") &&
      //(layer.type != "ShapePath") &&
      true) {
      //console.log(layer.type);
      return false;
    }

    var self = this;
    var rect = null;
    var pngImage = null;
    var svgImage = null;
    var childLayers = [];

    if (layer.frame !== undefined) {
      rect = { "x": layer.frame.x, "y": layer.frame.y, "w": layer.frame.width, "h": layer.frame.height };
    }

    if (/*(layer.type == "Artboard") || */(layer.type == "SymbolInstance") || (layer.type == "Text")) {
      const pngOptions = { formats: "png", output: false };
      const pngBuffer = sketch.export(layer, pngOptions);

      pngImage = base64.encodeBin(pngBuffer);

      const svgOptions = { formats: "svg", output: false };
      const svgBuffer = sketch.export(layer, svgOptions);

      svgImage = base64.encodeBin(svgBuffer);
    }

    if (layer.layers !== undefined) {
      layer.layers.forEach(
        function(l, i) {
          if (l.type == "Artboard") {
            var artboardLayer = self.utilEnumerateArtboardLayers(l, i, layerLevel + 1);
            artboardLayer["parent_uuid"] = assignmentBugWorkaround(layer.id);
            artboardLayer["level"] = layerLevel + 1;

            self.jsonQueue.push(artboardLayer);
          } else {
            var childLayer = self.utilEnumerateDocumentLayersUpToArtboard(l, i, layerLevel + 1);

            if (childLayer) {
              childLayers.push(childLayer);
            }
          }
        }
      );
    }

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
    }

    return {
      "uuid": assignmentBugWorkaround(layer.id),
      "type": layer.type,
      "name": layer.name,
      "master_uuid": null,
      "target_uuid": null,
      "rect": rect,
      "png_image": pngImage,
      "svg_image": svgImage,
      "layers": childLayers,
      "overrides": overrides
    };
  }

  stepEnumerateDocument() {
    var self = this;
    var documentLayers = [];

    self.document.pages.forEach(
      function(page, pageIndex) {
        documentLayers.push(
          self.utilEnumerateDocumentLayersUpToArtboard(page, pageIndex, 1));
      }
    );

    self.jsonQueue.push({
      "uuid": assignmentBugWorkaround(self.document.id),
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

    self.callStack.splice(0, 0, self.stepGetCsrfToken);
    setTimeout(self.callNextItem.bind(self), 0);
  }

  stepGetCsrfToken() {
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

          if (self.jsonQueue.length > 0) {
            self.callStack.splice(0, 0, self.stepUploadJson);
          } else {
            self.callStack.splice(0, 0, self.stepEnumerateDocument);
          }
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
      self.errorDescription   = error.localizedDescription();
      self.webServiceToken    = undefined;
      setTimeout(self.callNextItem.bind(self), 0);
    });
  }

  stepUploadJson() {
    var self = this;
    var json = self.jsonQueue.pop();

    fetch(self.webServiceEndpoint,
    {
      method: "PATCH",
      body: json,
      headers: {
          "Cookie": "csrftoken=" + self.webServiceToken,
          "Authorization": getAuthorizationHeader(self.webServiceUsername, self.webServicePassword),
          "Content-Type": "application/json",
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
            console.log(error);
            self.hasError           = true;
            self.errorTitle         = "HTTP";
            self.errorDescription   = error.localizedDescription();

            setTimeout(self.callNextItem.bind(self), 0);
          });
      } else if (contentType.startsWith("application/json") || contentType.startsWith("text/json")) {
        response.json()
          .then(function(responseJson) {
            if ((response.status >= 200) && (response.status < 300)) {
              if (self.jsonQueue.length > 0) {
                self.callStack.splice(0, 0, self.stepGetCsrfToken);
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
            console.log(error);
            self.hasError           = true;
            self.errorTitle         = "HTTP";
            self.errorDescription   = error.localizedDescription();

            setTimeout(self.callNextItem.bind(self), 0);
          });
      } else {
        self.hasError           = true;
        self.errorTitle         = "HTTP";
        self.errorDescription   = response.status + ": " + response.statusText;
      }
    })
    .catch(function(error) {
      console.log(error);
      self.hasError           = true;
      self.errorTitle         = "HTTP";
      self.errorDescription   = error.localizedDescription();

      setTimeout(self.callNextItem.bind(self), 0);
    });
  }

  stepReportSuccess() {
    var self = this;
    var bytesText = null;

    if (self.totalSize < 1024) {
      bytesText = self.totalSize + " bytes";
    } else if (self.totalSize < 1024 * 1024) {
      bytesText = Math.round(self.totalSize / 1024.0) + " Kb";
    } else if (self.totalSize < 1024 * 1024 * 1024) {
      bytesText = Math.round(self.totalSize / (1024.0 * 1024.0)) + " Mb";
    } else {
      bytesText = Math.round(self.totalSize / (1024.0 * 1024.0 * 1024.0)) + " Gb";
    }

    ui.alert(
      "SUCCESS",
      "Document successfully uploaded.\n" +
      " * " + bytesText + " uploaded.\n" +
      " * " + self.totalCreateCounter + " objects created.\n" +
      " * " + self.totalUpdateCounter + " objects updated.\n" +
      " * " + self.totalDeleteCounter + " objects deleted.\n");
  }
}


export default function() {
  console.log("----------------------------------------")
  var document = sketch.getSelectedDocument();

  if (document === undefined) {
    ui.alert("FAILURE", "No document selected.");
    return;
  }

  //var url = "https://roman-akopov.code.spacebank.xyz/sketch/upload";
  var stateMachine = new StateMachine(document);

  setTimeout(stateMachine.stepStart.bind(stateMachine), 0);
}
