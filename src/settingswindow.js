
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
    this.tabView = NSTabView.alloc().initWithFrame(NSMakeRect(0, 0, 640, 240));
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

  constructor(settings, activeTab, projects) {
    this._settings = settings;
    this.endpoint  = this._settings.getEndpoint();
    this.username  = this._settings.getUsername();
    this.password  = this._settings.getPassword();
    this.syncmode  = this._settings.getSyncmode();
    this.projectID = this._settings.getProject();
    this.projects  = projects;

    this._possibleEndpoints = [
      "https://globalization.spacebank.xyz/api/sketch/v1",
      "https://roman-akopov.code.spacebank.xyz/api/sketch/v1"
    ];
    this._possibleProjects = [];

    var projectName = null;

    for (var index = 0; index < this.projects.length; index++) {
      var project = this.projects[index];

      if (project.id == this.projectID) {
        projectName = project.name;
      }

      this._possibleProjects.push(project.name);
    }

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

    if ((this._possibleProjects !== undefined) && (this._possibleProjects !== null) && (this._possibleProjects.length > 0)) {
      this._pageProject = this._createTabPage("Project");
      this._projectField = this._pageProject.createPopupField(
        "Project:",
        projectName,
        this._possibleProjects
      ); 
    } else {
      this._pageProject = null;
    }

    this._pagePreferences = this._createTabPage("Preferences");
    this._syncmodeFields = this._pagePreferences.createRadioFields(
      [
        "Never show settings dialog",
        "Show settings dialog before first synchronization",
        "Show settings dialog before each synchronization",
      ],
      this.syncmode
    );

    if ((activeTab == "account") && (this._pageAccount != null)) {
      this.tabView.selectTabViewItem(this._pageAccount.tabItem);
    } else if ((activeTab == "project") && (this._pageProject != null)) {
      this.tabView.selectTabViewItem(this._pageProject.tabItem);
    }
  }

  run() {
    var window = this.window;
    var result = window.runModal();

    if (result == 1000) {
      if (this._pageAccount != null) {
        this.endpoint = this._possibleEndpoints[this._endpointField.indexOfSelectedItem()];
        this.username = this._usernameField.stringValue();
        this.password = this._passwordField.stringValue();
        this._settings.setEndpoint(this.endpoint);
        this._settings.setUsername(this.username);
        this._settings.setPassword(this.password);   
      }

      if (this._pageProject != null) {
        this.projectID = this.projects[this._projectField.indexOfSelectedItem()].id;
        this._settings.setProject(this.projectID);
      }

      if (this._pagePreferences != null) {
        this.syncmode = 2;

        for (var index = 0; index < this._syncmodeFields.length; index++) {
          if (this._syncmodeFields[index].state() == 1) {
            this.syncmode = index;
          }
        }

        this._settings.setSyncmode(this.syncmode);
      }

      return true;
    }

    return false;
  }
}


export function create(settings, activeTab, projects) {
  return new SettingsWindow(settings, activeTab, projects);
}
