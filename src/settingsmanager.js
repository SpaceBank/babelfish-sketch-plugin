import settings from "sketch/settings"


function assignmentBugWorkaround(buggyValue) {return buggyValue; }


class SettingsManager {
  constructor(document, tag) {
    this._document = document;
    this._tag = tag;
    this._endpoint = settings.documentSettingForKey(this._document, "webservice-endpoint");
    this._username = settings.documentSettingForKey(this._document, "webservice-username");
    this._password = settings.documentSettingForKey(this._document, "webservice-password");
    this._syncmode = settings.documentSettingForKey(this._document, "settingsui-syncmode");

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

  setSyncmode(value) {
    this._syncmode = value;
    settings.setDocumentSettingForKey(this._document, "settingsui-syncmode", this._syncmode);
  }

  makeShowSettings() {
    settings.setSessionVariable(fullName, undefined);
  }

  shouldShowSettings() {
    var fullName = "show-settings-" + assignmentBugWorkaround(this._document.id);
    var oldValue = settings.sessionVariable(fullName);

    switch (this._syncmode) {
      case 0:
        return false;
      case 1:
        if (oldValue !== undefined) {
          settings.setSessionVariable(fullName, this._tag);

          return true;
        }

        return false;
      case 2:
        if (oldValue !== this._tag) {
          settings.setSessionVariable(fullName, this._tag);

          return true;
        }

        return false;
    }
  }
}


export function create(document, tag) {
  return new SettingsManager(document, tag);  
}
