import settings from "sketch/settings"


function assignmentBugWorkaround(buggyValue) {return buggyValue; }


class SettingsManager {
  constructor(document, sessionID) {
    this._document = document;
    this._sessionID = sessionID;
    this._endpoint = settings.documentSettingForKey(this._document, "webservice-endpoint");
    this._username = settings.documentSettingForKey(this._document, "webservice-username");
    this._password = settings.documentSettingForKey(this._document, "webservice-password");
    this._project  = settings.documentSettingForKey(this._document, "webservice-project");
    this._syncmode = settings.documentSettingForKey(this._document, "settingsui-syncmode");

    if (this._endpoint == undefined) {
      this._endpoint = '';
    }

    if (this._username == undefined) {
      this._username = '';
    }

    if (this._password == undefined) {
      this._password = '';
    }

    if (this._project == undefined) {
      this._project = '';
    }

    if (this._syncmode == undefined) {
      this._syncmode = 2;
    }
  }

  getEndpoint() {
    return this._endpoint;
  }

  getUsername() {
    return this._username;
  }

  getPassword() {
    return this._password;
  }

  getProject() {
    return this._project;
  }

  getSyncmode() {
    return this._syncmode;
  }

  setEndpoint(value) {
    this._endpoint = value;
    settings.setDocumentSettingForKey(this._document, "webservice-endpoint", this._endpoint);
  }

  setUsername(value) {
    this._username = value;
    settings.setDocumentSettingForKey(this._document, "webservice-username", this._username);
  }

  setPassword(value) {
    this._password = value;
    settings.setDocumentSettingForKey(this._document, "webservice-password", this._password);
  }

  setProject(value) {
    this._project = value;
    settings.setDocumentSettingForKey(this._document, "webservice-project", this._project);
  }

  setSyncmode(value) {
    this._syncmode = value;
    settings.setDocumentSettingForKey(this._document, "settingsui-syncmode", this._syncmode);
  }

  makeShowSettings(page) {
    var fullName = "show-settings-" + page + "-" + assignmentBugWorkaround(this._document.id);

    settings.setSessionVariable(fullName, -1);
  }

  shouldShowSettings(page) {
    var fullName = "show-settings-" + page + "-" + assignmentBugWorkaround(this._document.id);
    var oldValue = settings.sessionVariable(fullName);

    if (oldValue == -1) {
      settings.setSessionVariable(fullName, this._sessionID);

      return true;
    }

    switch (this._syncmode) {
      case 0:
        return false;
      case 1:
        if (oldValue !== undefined) {
          settings.setSessionVariable(fullName, this._sessionID);

          return true;
        }

        return false;
      case 2:
        if (oldValue !== this._sessionID) {
          settings.setSessionVariable(fullName, this._sessionID);

          return true;
        }

        return false;
    }
  }

  isAccountValid() {
    var result = (this._endpoint !== undefined) && (this._endpoint !== null) && (this._endpoint !== "") &&
      (this._username !== undefined) && (this._username !== null) && (this._username !== "") &&
      (this._password !== undefined) && (this._password !== null) && (this._password !== "");

    return result;
  }

  isProjectValid() {
    var result =
      (this._project !== undefined) && (this._project !== null) && (this._project !== 0);

    return result;
  }
}


export function create(document, sessionID) {
  return new SettingsManager(document, sessionID);
}
