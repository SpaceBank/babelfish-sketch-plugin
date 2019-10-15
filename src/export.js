import sketch from "sketch"
import dom    from "sketch/dom"
import ui     from "sketch/ui"


const fetch  = require("sketch-polyfill-fetch");
const base64 = require("./base64.js");
const settingsManagerFactory = require("./settingsmanager.js");
const settingsWindowFactory  = require("./settingswindow.js");


function assignmentBugWorkaround(buggyValue) {return buggyValue; }


class StateMachine {
  constructor(document) {
    this.totalTimeFrom    = Date.now();

    this.document         = document;
    this.settings         = settingsManagerFactory.create(this.document, this.totalTimeFrom);
    this.stepStack        = [];
    this.stepTimeFrom     = 0;
    this.currentStep      = null;
    this.loopIsRunning    = false;
    this.hasError         = false;
    this.errorTitle       = undefined;
    this.errorDescription = undefined;

    this.tokenID   = null;
    this.sessionID = null;

    this.projects = [];
    this.project = null;

    this.imageStats         = {};

    this.artboardCounter    = 0;
    this.layerCounter       = 0;
    this.layerFilterQueue   = [];
    this.layerUploadObject  = [];
    this.imageCounter       = 0;
    this.imageFilterQueue   = [];
    this.imageUploadObject  = [];

    this.totalDownloadSize  = 0;
    this.totalUploadSize    = 0;
    this.serverTime         = 0;
    this.totalCreateCounter = 0;
    this.totalUpdateCounter = 0;
    this.totalDeleteCounter = 0;

    this.callableMap = new Map();
    this.callableMap.set("Start",        this.stepStart.bind(this));
    this.callableMap.set("CheckAccount", this.stepCheckAccount.bind(this));
    this.callableMap.set("InputAccount", this.stepInputAccount.bind(this));

    this.callableMap.set("PrepareToken", this.stepPrepareToken.bind(this));
    this.callableMap.set("Authenticate", this.stepAuthenticate.bind(this));

    this.callableMap.set("ListProjects", this.stepListProjects.bind(this));
    this.callableMap.set("CheckProject", this.stepCheckProject.bind(this));
    this.callableMap.set("InputProject", this.stepInputProject.bind(this));

    this.callableMap.set("LoadDocument", this.stepLoadDocument.bind(this));
    this.callableMap.set("StatDocument", this.stepStatDocument.bind(this));
    this.callableMap.set("EditDocument", this.stepEditDocument.bind(this));
    this.callableMap.set("SaveDocument", this.stepSaveDocument.bind(this));

    this.callableMap.set("EnumerateDocumentLayers", this.stepEnumerateDocumentLayers.bind(this));
    this.callableMap.set("EnumerateChildrenLayers", this.stepEnumerateChildrenLayers.bind(this));

    this.callableMap.set("ReportSuccess",           this.stepReportSuccess.bind(this));
  }

  utilFormatSize(byteNumber) {
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

  utilFormatTime(secondNumber) {
    var minutes = Math.floor(secondNumber / 60);
    var seconds = secondNumber % 60;

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
    var self = this;

    return fetch(
      self.settings.getEndpoint() + suffix,
      {
        method: "GET",
        body: {
          "jsonrpc": "2.0",
          "method": "session.auth",
          "id": 0,
          "params": null
        }
      });
  }

  postJsonRpc(suffix, methodName, params) {
    var self = this;
    var headers = {};

    if (self.tokenID) {
      if (self.sessionID) {
        headers["Cookie"] = "sessionid=" + self.sessionID + "; csrftoken=" + self.tokenID;
        headers["X-CSRFToken"] = self.tokenID;
      } else {
        headers["Cookie"] = "csrftoken=" + self.tokenID;
        headers["X-CSRFToken"] = self.tokenID;
      }
    }

    return fetch(
      self.settings.getEndpoint() + suffix,
      {
        method: "POST",
        body: {
          "jsonrpc": "2.0",
          "method": methodName,
          "id": Date.now(),
          "params": params
        },
        headers: headers
      });
  }

  extractJsonRpc(json) {
    var self = this;
    var version = json["jsonrpc"];

    if (version !== "2.0") {
      self.hasError          = true;
      self.errorTitle        = "JSON RPC ERROR";
      self.errorDescription  = "Invalid version. Expected 2.0, got '" + version + "'";
      self.loopIsRunning     = false

      return null;
    }

    var error = json["error"];

    if (error !== undefined) {
      self.hasError          = true;
      self.errorTitle        = "JSON RPC ERROR";
      self.errorDescription  = error;
      self.loopIsRunning     = false

      return null;
    }

    self.totalUploadSize += json[".request.size"];
    self.serverTime      += json[".request.time"];

    return json["result"];
  }

  enqueueNextStep(name) {
    var self = this;

    self.loopIsRunning = true;

    if (name != null) {
      self.stepStack.splice(0, 0, name);
    }

    setTimeout(self.executeNextStepInternal.bind(self), 0);
  }

  reportCurrentStep() {
    var self = this;
    var now = Date.now();
    var totalElapsed = Math.round((now - this.totalTimeFrom) / 1000);
    var message =
      "🕑 " + self.utilFormatTime(totalElapsed) +
      ",⇑ " + self.utilFormatSize(self.totalUploadSize) +
      ",⇓ " + self.utilFormatSize(self.totalDownloadSize);

    if (self.currentStep != null) {
      switch (self.currentStep) {
        case "Start":
          message += " | Start.";
          break;
        case "CheckAccount":
          message += " | Checking account.";
          break;
        case "InputAccount":
          message += " | Waiting for account user input.";
          break;
        case "PrepareToken":
        case "Authenticate":
          message += " | Waiting for server.";
          break;
        case "ListProjects":
          message += " | Downloading project list.";
          break;
        case "CheckProject":
          message += " | Checking account.";
          break;
        case "InputProject":
          message += " | Waiting for account user input.";
          break;
        case "LoadDocument":
        case "StatDocument":
          message += " | Waiting for server.";
          break;
        case "EditDocument":
          if (self.layerUploadObject.length > 0) {
            message += " | Uploading data. " + self.layerUploadObject.length + " layers and " + self.imageUploadObject.length + " images left.";
          } else {
            message += " | Uploading data. " + self.imageUploadObject.length + " images left.";
          }
          break;
        case "SaveDocument":
          message += " | Waiting for server.";
          break;
        case "EnumerateDocumentLayers":
        case "EnumerateChildrenLayers":
          message += " | Enumerating layers. " + self.artboardCounter + " artboards and " + self.layerCounter + " layers found so far.";
          break;
        case "ReportSuccess":
          message += " | Success.";
          break;
        default:
          break;
      }

      ui.message(message);
    }

    if (self.loopIsRunning) {
      setTimeout(self.reportCurrentStep.bind(self), 500);
    } else {
      console.log(new Date(now).toISOString() + "; STOP");
    }
  }

  executeNextStepInternal() {
    var self = this;

    if (self.currentStep != null) {
      var stepDuration = (Date.now() - self.stepTimeFrom);

      console.log("} //"  + self.currentStep + "; " + stepDuration + "ms; " + new Date(Date.now()).toISOString());

      if (self.hasError) {
        console.log("ERROR: " + self.errorTitle + "; " + self.errorDescription);
        self.hasError = false;
        ui.alert(self.errorTitle, self.errorDescription);
      }
    }

    if (self.stepStack.length == 0) {
      self.loopIsRunning = false;
      self.currentStep = null;
      return;
    }

    self.currentStep = self.stepStack.pop();

    try {
      if (self.currentStep == "ReportSuccess") {
        self.loopIsRunning = false;
        console.log(self.currentStep + " { } // " + new Date(Date.now()).toISOString());
      } else {
        self.loopIsRunning = true;
        console.log(self.currentStep + " { // " + new Date(Date.now()).toISOString());
      }

      var func = self.callableMap.get(self.currentStep);

      self.stepTimeFrom = Date.now();
      func();
    } catch (e) {
      console.log(e.message);
      self.hasError         = true;
      self.errorTitle       = "INTERNAL ERROR";
      self.errorDescription = e.message;
      self.loopIsRunning    = false
    }
  }

  stepStart() {
    var self = this;

    self.enqueueNextStep("CheckAccount");
  }

  stepCheckAccount() {
    var self = this;

    if (self.settings.shouldShowSettings("account") || !self.settings.isAccountValid()) {
      self.enqueueNextStep("InputAccount");
    } else {
      self.enqueueNextStep("PrepareToken");
    }
  }

  stepInputAccount() {
    var self = this;
    var settingWindow = settingsWindowFactory.create(self.settings, true, false, true, "account", self.projects);

    if (settingWindow.run()) {
      self.enqueueNextStep("CheckAccount");
    } else {
      self.hasError           = true;
      self.errorTitle         = "(C01) USER INPUT";
      self.errorDescription   = "Account is required.";
      self.enqueueNextStep(null);
    }
  }

  stepPrepareToken() {
    var self = this;

    self
      .getJsonRpc("core/v1")
      .then(function(response) {
        if (response.status == 200) {
          self.totalDownloadSize += Number(response.headers.get('Content-Length'));

          response.json()
            .then(function(responseJson) {
              var result = self.extractJsonRpc(responseJson);

              if (result !== null) {
                self.tokenID = result["token"];
                self.enqueueNextStep("Authenticate");
              } else {
                self.enqueueNextStep(null);
              }
            })
            .catch(function(error) {
              self.hasError         = true;
              self.errorTitle       = "(D01) INVALID JSON";
              self.errorDescription = self.utilFormatError(error);
              self.enqueueNextStep(null);
            });
        } else if (response.status == 403) {
          self.settings.makeShowSettings("account");
          self.enqueueNextStep("InputAccount");
        } else {
          self.hasError           = true;
          self.errorTitle         = "(D02) INVALID RESPONSE";
          self.errorDescription   = response.status + ": " + response.statusText;
          self.enqueueNextStep(null);
        }
      })
      .catch(function(error) {
        self.hasError           = true;
        self.errorTitle         = "(D03) HTTP";
        self.errorDescription   = self.utilFormatError(error);
        self.enqueueNextStep(null);
      });
  }

  stepAuthenticate() {
    var self = this;
    var sessionPattern = /sessionid=([A-Za-z0-9]+)/s;

    self
      .postJsonRpc("core/v1", "session.auth", [self.settings.getUsername(), self.settings.getPassword()])
      .then(function(response) {
        if (response.status == 200) {
          self.totalDownloadSize += Number(response.headers.get('Content-Length'));

          response.json()
            .then(function(responseJson) {
              var result = self.extractJsonRpc(responseJson);

              if (result !== null) {
                if (result["id"] == undefined) {
                  self.settings.makeShowSettings("account");
                  self.enqueueNextStep("InputAccount");
                } else {
                  var setCookieHeader = String(response.headers.get('set-cookie'));
                  var sessionMatch = sessionPattern.exec(setCookieHeader);

                  if (sessionMatch == null) {
                    self.hasError           = true;
                    self.errorTitle         = "(E04) INVALID RESPONSE";
                    self.errorDescription   = response.status + ": Session cookie is missing.";
                    self.enqueueNextStep(null);
                  } else {
                    self.sessionID = sessionMatch[1];
                  }

                  self.enqueueNextStep("ListProjects");
                }
              } else {
                self.enqueueNextStep(null);
              }
            })
            .catch(function(error) {
              self.hasError         = true;
              self.errorTitle       = "(E01) INVALID JSON";
              self.errorDescription = self.utilFormatError(error);
              self.enqueueNextStep(null);
            });
        } else if (response.status == 403) {
          self.settings.makeShowSettings("account");
          self.enqueueNextStep("InputAccount");
        } else {
          self.hasError           = true;
          self.errorTitle         = "(E02) INVALID RESPONSE";
          self.errorDescription   = response.status + ": " + response.statusText;
          self.enqueueNextStep(null);
        }
      })
      .catch(function(error) {
        self.hasError           = true;
        self.errorTitle         = "(E03) HTTP";
        self.errorDescription   = self.utilFormatError(error);
        self.enqueueNextStep(null);
      });
  }

  stepListProjects() {
    var self = this;

    if (self.projects.length > 0) {
      self.enqueueNextStep("CheckProject");
      return;
    }

    self
      .postJsonRpc("sketch/v1", "project.list", null)
      .then(function(response) {
        if (response.status == 200) {
          self.totalDownloadSize += Number(response.headers.get('Content-Length'));

          response.json()
            .then(function(responseJson) {
              var result = self.extractJsonRpc(responseJson);

              if (result !== null) {
                self.projects = result;
                self.enqueueNextStep("CheckProject");
              } else {
                self.enqueueNextStep(null);
              }
            })
            .catch(function(error) {
              self.hasError         = true;
              self.errorTitle       = "(F01) INVALID JSON";
              self.errorDescription = self.utilFormatError(error);
              self.enqueueNextStep(null);
            });
        } else if (response.status == 403) {
          self.settings.makeShowSettings("account");
          self.enqueueNextStep("InputAccount");
        } else {
          self.hasError           = true;
          self.errorTitle         = "(F02) INVALID RESPONSE";
          self.errorDescription   = response.status + ": " + response.statusText;
          self.enqueueNextStep(null);
        }
      })
      .catch(function(error) {
        self.hasError           = true;
        self.errorTitle         = "(F03) HTTP";
        self.errorDescription   = self.utilFormatError(error);
        self.enqueueNextStep(null);
      });
  }

  stepCheckProject() {
    var self = this;
    var shouldShowSettings = self.settings.shouldShowSettings("project");
    var isProjectValid = self.settings.isProjectValid();

    if (shouldShowSettings || !isProjectValid) {
      self.enqueueNextStep("InputProject");
      return;
    }

    for (var index = 0; index < self.projects.length; index++) {
      var project = self.projects[index];

      if (project.id == self.settings.getProject()) {
        self.project = project;
      }
    }

    self.enqueueNextStep("LoadDocument");
  }

  stepInputProject() {
    var self = this;

    if ((self.projects === undefined) || (self.projects === null) || (self.projects.length == 0)) {
      self.hasError         = true;
      self.errorTitle       = "(H02) SERVER DATA";
      self.errorDescription = "Projects cannot be found.";
      self.enqueueNextStep(null);
    } else {
      var settingWindow = settingsWindowFactory.create(self.settings, false, true, true, "project", self.projects);

      if (settingWindow.run()) {
        self.enqueueNextStep("CheckProject");
      } else {
        self.hasError         = true;
        self.errorTitle       = "(H01) USER INPUT";
        self.errorDescription = "Project is required.";
        self.enqueueNextStep(null);
      }
    }
  }

  stepLoadDocument() {
    var self = this;
    var uuid = assignmentBugWorkaround(self.document.id);

    self
      .postJsonRpc("sketch/v1", "document.load", [uuid, self.settings.getProject()])
      .then(function(response) {
        if (response.status == 200) {
          self.totalDownloadSize += Number(response.headers.get('Content-Length'));

          response.json()
            .then(function(responseJson) {
              var result = self.extractJsonRpc(responseJson);

              self.enqueueNextStep("StatDocument");
            })
            .catch(function(error) {
              self.hasError         = true;
              self.errorTitle       = "(I01) INVALID JSON";
              self.errorDescription = self.utilFormatError(error);
              self.enqueueNextStep(null);
            });
        } else {
          self.hasError           = true;
          self.errorTitle         = "(I02) INVALID RESPONSE";
          self.errorDescription   = response.status + ": " + response.statusText;
          self.enqueueNextStep(null);
        }
      })
      .catch(function(error) {
        self.hasError           = true;
        self.errorTitle         = "(I03) HTTP)";
        self.errorDescription   = self.utilFormatError(error);
        self.enqueueNextStep(null);
      });
  }

  stepStatDocument() {
    var self = this;
    var uuid = assignmentBugWorkaround(self.document.id);

    self
      .postJsonRpc("sketch/v1", "document.stat", [uuid])
      .then(function(response) {
        if (response.status == 200) {
          self.totalDownloadSize += Number(response.headers.get('Content-Length'));

          response.json()
            .then(function(responseJson) {
              var result = self.extractJsonRpc(responseJson);

              self.imageStats = result['images'];
              self.enqueueNextStep("EnumerateDocumentLayers");
            })
            .catch(function(error) {
              self.hasError         = true;
              self.errorTitle       = "(J01) INVALID JSON";
              self.errorDescription = self.utilFormatError(error);
              self.enqueueNextStep(null);
            });
        } else {
          self.hasError           = true;
          self.errorTitle         = "(J02) INVALID RESPONSE";
          self.errorDescription   = response.status + ": " + response.statusText;
          self.enqueueNextStep(null);
        }
      })
      .catch(function(error) {
        self.hasError           = true;
        self.errorTitle         = "(J03) HTTP";
        self.errorDescription   = self.utilFormatError(error);
        self.enqueueNextStep(null);
      });
  }

  stepEditDocument() {
    var self = this;
    var uuid = assignmentBugWorkaround(self.document.id);
    var layers = [];
    var images = [];

    if (self.layerUploadObject.length > 0) {
      layers.push(self.layerUploadObject.pop());
    } else if (self.imageUploadObject.length > 0) {
      var cumulativeSize = 0;

      while (cumulativeSize < 1024 * 1024) {
        var image = self.imageUploadObject.pop();

        if (image == undefined) {
          break;
        }

        var pngImage = image["png_image"];
        var svgImage = image["svg_image"];

        if (pngImage != null) {
          cumulativeSize += pngImage.length;
        }

        if (svgImage != null) {
          cumulativeSize += svgImage.length;
        }

        images.push(image);
      }
    }

    if ((layers.length == 0) && (images.length == 0)) {
      self.enqueueNextStep("SaveDocument");
    } else {
      self
        .postJsonRpc("sketch/v1", "document.edit", [uuid, layers, images])
        .then(function(response) {
          if (response.status == 200) {
            self.totalDownloadSize += Number(response.headers.get('Content-Length'));

            response.json()
              .then(function(responseJson) {
                var result = self.extractJsonRpc(responseJson);

                self.enqueueNextStep("EditDocument");
              })
              .catch(function(error) {
                self.hasError         = true;
                self.errorTitle       = "(K01) INVALID JSON";
                self.errorDescription = self.utilFormatError(error);
                self.enqueueNextStep(null);
              });
          } else {
            self.hasError           = true;
            self.errorTitle         = "(K02) INVALID RESPONSE";
            self.errorDescription   = response.status + ": " + response.statusText;
            self.enqueueNextStep(null);
          }
        })
        .catch(function(error) {
          self.hasError           = true;
          self.errorTitle         = "(K03) HTTP";
          self.errorDescription   = self.utilFormatError(error);
          self.enqueueNextStep(null);
        });
    }
  }

  stepSaveDocument() {
    var self = this;
    var uuid = assignmentBugWorkaround(self.document.id);

    self
      .postJsonRpc("sketch/v1", "document.save", [uuid])
      .then(function(response) {
        if (response.status == 200) {
          self.totalDownloadSize += Number(response.headers.get('Content-Length'));

          response.json()
            .then(function(responseJson) {
              var result = self.extractJsonRpc(responseJson);

              self.totalCreateCounter = result['created'];
              self.totalUpdateCounter = result['updated'];
              self.totalDeleteCounter = result['deleted'];

              self.enqueueNextStep("ReportSuccess");
            })
            .catch(function(error) {
              self.hasError         = true;
              self.errorTitle       = "(L01) INVALID JSON";
              self.errorDescription = self.utilFormatError(error);
              self.enqueueNextStep(null);
            });
        } else {
          self.hasError           = true;
          self.errorTitle         = "(L02) INVALID RESPONSE";
          self.errorDescription   = response.status + ": " + response.statusText;
          self.enqueueNextStep(null);
        }
      })
      .catch(function(error) {
        self.hasError           = true;
        self.errorTitle         = "(L03) HTTP";
        self.errorDescription   = self.utilFormatError(error);
        self.enqueueNextStep(null);
      });
  }

  stepEnumerateDocumentLayers() {
    var self = this;
    var uuid = assignmentBugWorkaround(self.document.id);
    var documentLayers = [];

    self.document.pages.forEach(
      function(page, pageIndex) {
        if (page.name === "Symbols") {
          self.layerFilterQueue.push([page, documentLayers]);
        }
      }
    );

    self.document.pages.forEach(
      function(page, pageIndex) {
        if (page.name !== "Symbols") {
          self.layerFilterQueue.push([page, documentLayers]);
        }
      }
    );

    self.layerUploadObject = [{
      "id": uuid,
      "type": self.document.type,
      "name": self.document.path === undefined ? "Document Is Not Saved" : self.document.path,
      "master_id": null,
      "master_library_name": null,
      "master_library_type": null,
      "master_library_valid": false,
      "master_library_enabled": false,
      "target_id": null,
      "text": null,
      "rect": null,
      "svg_image": null,
      "layers": documentLayers,
      "overrides": []
    }];
    self.imageUploadObject = [];

    self.enqueueNextStep("EnumerateChildrenLayers");
  }

  stepEnumerateChildrenLayers() {
    var self = this;
    var deadline = Date.now() + 1000;

    while ((self.layerFilterQueue.length > 0) && (Date.now() < deadline)) {
      var currentItem = self.layerFilterQueue.pop();
      var currentLayer = currentItem[0];
      var parentLayers = currentItem[1];
      var isFilteredOut = currentLayer.hidden;

      if (!isFilteredOut) {
        self.project.filters.forEach(function(filter, i) {
          if ((filter.type == '*') || (filter.type == currentLayer.type)) {
            if (filter.name.startsWith('/') && filter.name.endsWith('/')) {
              if (RegExp(filter.name.substring(1, filter.name.length - 1), "u").test(currentLayer.name)) {
                isFilteredOut = true;
              }
            } else {
              if (filter.name == currentLayer.name) {
                isFilteredOut = true;
              }
            }
          }
        });
      }

      if (!isFilteredOut) {
        if (
          (currentLayer.type == "Page") ||
          (currentLayer.type == "Artboard") ||
          (currentLayer.type == "SymbolMaster") ||
          (currentLayer.type == "SymbolInstance") ||
          (currentLayer.type == "Group") ||
          // (currentLayer.type == "Image") ||
          (currentLayer.type == "Text") ||
          (currentLayer.type == "Shape") ||
          // (currentLayer.type == "ShapePath") ||
          false) {
          self.layerCounter++;

          if (currentLayer.type == "Artboard") {
            self.artboardCounter++;
          }

          var uuid = assignmentBugWorkaround(currentLayer.id);
          var masterUuid = null;
          var masterLibraryName = null;
          var masterLibraryType = null;
          var masterLibraryValid = false;
          var masterLibraryEnabled = false;
          var text = null;
          var rect = null;
          var svgImage = null;
          var overrides = [];

          if (currentLayer.type == "SymbolInstance") {
            currentLayer.overrides.forEach(function(override, i) {
              if (override.property == "stringValue") {
                overrides.push({
                  "path":  override.path,
                  "value": override.value
                });
              }
            });

            var master = currentLayer.master;

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
          } else if (currentLayer.type == "SymbolMaster") {
            var library = currentLayer.getLibrary();

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
          } else if (currentLayer.type == "Text") {
            text = currentLayer.text;

            const svgOptions = { formats: "svg", output: false };
            const svgBuffer = sketch.export(currentLayer, svgOptions);

            svgImage = base64.encodeBin(svgBuffer);
          }

          var targetUuid = null;

          if (currentLayer.flow !== undefined) {
            if (currentLayer.flow.targetId == dom.Flow.BackTarget) {
              targetUuid = "00000000-0000-0000-0000-000000000000";
            } else {
              targetUuid = currentLayer.flow.targetId;
            }
          }

          if (currentLayer.frame !== undefined) {
            rect = {
              "x": currentLayer.frame.x,
              "y": currentLayer.frame.y,
              "w": currentLayer.frame.width,
              "h": currentLayer.frame.height
            };
          }

          var childLayers = [];

          if (currentLayer.layers !== undefined) {
            currentLayer.layers.forEach(
              function(childLayer, i) {
                self.layerFilterQueue.push([childLayer, childLayers]);
              }
            );
          }

          parentLayers.push({
            "id":                     uuid,
            "type":                   currentLayer.type,
            "name":                   currentLayer.name,
            "master_id":              masterUuid,
            "master_library_name":    masterLibraryName,
            "master_library_type":    masterLibraryType,
            "master_library_valid":   masterLibraryValid,
            "master_library_enabled": masterLibraryEnabled,
            "target_id":              targetUuid,
            "text":                   text,
            "rect":                   rect,
            "svg_image":              svgImage,
            "layers":                 childLayers,
            "overrides":              overrides
          });
        }

        if (currentLayer.type == "Artboard") {
          var uuid = assignmentBugWorkaround(currentLayer.id);
          var imageStats = self.imageStats[uuid];

          if (imageStats === undefined) {
            imageStats = {"svg_image_size": -1, "png_image_size": -1};
          }

          const pngOptions = { formats: "png", output: false };
          const pngBuffer = sketch.export(currentLayer, pngOptions);

          var pngImage = base64.encodeBin(pngBuffer);

          if (pngBuffer.length != imageStats["png_image_size"]) {
            self.imageUploadObject.push({
              "id": uuid,
              "png_image": pngImage
            });

            self.imageCounter++;
          }
        } else if (currentLayer.type == "Text") {
          var uuid = assignmentBugWorkaround(currentLayer.id);
          var imageStats = self.imageStats[uuid];

          if (imageStats === undefined) {
            imageStats = {"svg_image_size": -1, "png_image_size": -1};
          }

          if (svgImage.length != imageStats["svg_image_size"]) {
            const pngOptions = { formats: "png", output: false };
            const pngBuffer = sketch.export(currentLayer, pngOptions);

            var pngImage = base64.encodeBin(pngBuffer);

            if (pngBuffer.length != imageStats["png_image_size"]) {
              self.imageUploadObject.push({
                "id": uuid,
                "png_image": pngImage
              });

              self.imageCounter++;
            }
          }
        }
      }
    }

    if (self.layerFilterQueue.length > 0) {
      self.enqueueNextStep("EnumerateChildrenLayers");
    } else {
      self.enqueueNextStep("EditDocument");
    }
  }

  stepReportSuccess() {
    var self = this;
    var totalTime = Date.now() - self.totalTimeFrom;
    var clientTime = Math.round((totalTime - this.serverTime) / 1000);
    var serverTime = Math.round((totalTime - 1000 * clientTime) / 1000);

    ui.alert(
      "SUCCESS",
      "Document successfully uploaded.\n" +
      " * " + self.utilFormatSize(self.totalUploadSize) + " uploaded.\n" +
      " * " + self.utilFormatSize(self.totalDownloadSize) + " downloaded.\n" +
      " * " + self.totalCreateCounter + " objects created.\n" +
      " * " + self.totalUpdateCounter + " objects updated.\n" +
      " * " + self.totalDeleteCounter + " objects deleted.\n" +
      self.utilFormatTime(clientTime) + " seconds spent on client.\n" +
      self.utilFormatTime(serverTime) + " seconds spent on server.");
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

  stateMachine.enqueueNextStep("Start");
  stateMachine.reportCurrentStep();
}
