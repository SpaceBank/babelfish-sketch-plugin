function emptyAction() {}

class TabPage {
  createPopupField(labelTexts) {
    const labelTextNumber = labelTexts.length;
    const boxOuterHeight = 23 + 2 * this.marginPopupTop + labelTextNumber * (this.fieldHeight + this.spacingH);
    const box = NSBox.alloc().initWithFrame(
        NSMakeRect(
            this.marginLabelLeft,
            this.currentY - (boxOuterHeight + this.marginPopupTop),
            this.totalW - (this.marginLabelLeft + this.marginLabelRight) - 6,
            boxOuterHeight
        )
    );

    box.setTitlePosition(0);

    const result = []
    const boxInnerHeight = box.contentView().frame().size.height;
    const boxInnerWidth = box.contentView().frame().size.width;
    const radioField = NSButton.alloc().initWithFrame(
        NSMakeRect(
            this.marginLabelLeft,
            boxInnerHeight - (this.fieldHeight + this.spacingH) + this.marginPopupTop,
            boxInnerWidth - (this.marginLabelLeft + this.marginLabelRight),
            this.labelHeight
        )
    );

    const radioField1 = NSButton.alloc().initWithFrame(
        NSMakeRect(
            this.marginLabelLeft,
            boxInnerHeight - 23 - (this.fieldHeight + this.spacingH) + this.marginPopupTop,
            boxInnerWidth - (this.marginLabelLeft + this.marginLabelRight),
            this.labelHeight
        )
    );

    const textField = NSTextField.alloc().initWithFrame(
        NSMakeRect(
            this.marginLabelLeft + 20,
            boxInnerHeight - 23 - (this.fieldHeight + this.spacingH) + this.marginPopupTop,
            boxInnerWidth - (this.marginLabelLeft + this.marginLabelRight) - 30,
            this.labelHeight
        )
    );

    radioField.setButtonType(4);
    radioField.setState(1);
    radioField.setBezelStyle(1);
    radioField.setTitle(labelTexts[0]);

    radioField1.setButtonType(4);
    radioField1.setState(0);
    radioField1.setBezelStyle(1);
    radioField1.setTitle('');

    let radioTargetFunction = () => {
      textField.setEditable(!!radioField1.state());
    };

    radioField.setCOSJSTargetFunction(sender => radioTargetFunction(sender));
    radioField1.setCOSJSTargetFunction(sender => radioTargetFunction(sender));

    textField.setBezelStyle(1);
    //textField.setEditable(!!radioField1.state());

    box.addSubview(radioField);
    box.addSubview(radioField1);
    box.addSubview(textField);

    result.push(radioField)
    result.push(radioField1)
    result.push(textField)

    this.tabItemView.addSubview(box);

    this.currentY -= (boxOuterHeight + this.spacingH);
    return result;
  }

  createSelectField(labelText, initialValue, allValues) {
    const popupLabel = NSTextField.alloc().initWithFrame(
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

    const popupField = NSPopUpButton.alloc().initWithFrame(
        NSMakeRect(
            this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginPopupLeft,
            this.currentY - (this.fieldHeight + this.marginPopupTop),
            this.totalW - (this.marginLabelLeft + this.labelWidth + this.marginLabelRight + this.marginPopupLeft + this.marginPopupRight),
            this.labelHeight
        )
    );

    let isSelected = false;

    allValues.forEach((item, index) => {
      popupField.addItemWithTitle(item);

      if (item === initialValue) {
        popupField.selectItemAtIndex(index);
        isSelected = true;
      }
    })

    if (!isSelected) {
      popupField.selectItemAtIndex(0);
    }

    this.tabItemView.addSubview(popupLabel);
    this.tabItemView.addSubview(popupField);

    this.currentY -= (this.fieldHeight + this.spacingH);

    return popupField;
  }

  createTextField(labelText, initialValue) {
    const textLabel = NSTextField.alloc().initWithFrame(
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

    const textField = NSTextField.alloc().initWithFrame(
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
    const passwordLabel = NSTextField.alloc().initWithFrame(
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

    const passwordField = NSSecureTextField.alloc().initWithFrame(
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
    const checkboxField = NSButton.alloc().initWithFrame(
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
    const labelTextNumber = labelTexts.length;
    const boxOuterHeight = 23 + 2 * this.marginPopupTop + labelTextNumber * (this.fieldHeight + this.spacingH);
    const box = NSBox.alloc().initWithFrame(
        NSMakeRect(
            this.marginLabelLeft,
            this.currentY - (boxOuterHeight + this.marginPopupTop),
            this.totalW - (this.marginLabelLeft + this.marginLabelRight),
            boxOuterHeight
        )
    );

    box.setTitlePosition(0);

    const boxInnerHeight = box.contentView().frame().size.height;
    const boxInnerWidth  = box.contentView().frame().size.width;

    const result = labelTexts.map((item, index) => {
      const radioField = NSButton.alloc().initWithFrame(
          NSMakeRect(
              this.marginLabelLeft,
              boxInnerHeight - ((index + 1) * (this.fieldHeight + this.spacingH) + this.marginPopupTop),
              boxInnerWidth - (this.marginLabelLeft + this.marginLabelRight),
              this.labelHeight
          )
      );

      radioField.setButtonType(4);
      radioField.setState(index === initialValue);
      radioField.setBezelStyle(1);
      radioField.setTitle(labelTexts[index]);
      radioField.setCOSJSTargetFunction(emptyAction);

      box.addSubview(radioField);

      return radioField;
    })

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

    if (settingsWindow.tabView.numberOfTabViewItems() === 1) {
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

  constructor(settings, showAccountTab, showProjectTab, showPreferencesTab, activeTab, projects) {
    this._settings = settings;
    this.endpoint  = this._settings.getEndpoint();
    this.username  = this._settings.getUsername();
    this.password  = this._settings.getPassword();
    this.syncmode  = this._settings.getSyncmode();
    this.projectID = this._settings.getProject();
    this.projects  = projects;

    this.possibleEndpoints = [
      'https://dws.babelfish.default.test.xx.spacebank.xyz/',
      ''
    ];
    this._possibleProjects = [];

    let projectName = null;

    this.projects.forEach(project => {
      if (project.id === this.projectID) {
        projectName = project.name;
      }

      this._possibleProjects.push(project.name);
    })

    this._createChrome();

    if (showAccountTab) {
      this._pageAccount = this._createTabPage("Account");
      this._endpointField = this._pageAccount.createPopupField(
          this.possibleEndpoints,
          1,
          "Endpoint:",
      );
      this._usernameField = this._pageAccount.createTextField(
          "Username:",
          this.username
      );
      this._passwordField = this._pageAccount.createPasswordField(
          "Password:",
          this.password
      );
    }

    if (showProjectTab) {
      this._pageProject = this._createTabPage("Project");
      this._projectField = this._pageProject.createSelectField(
          "Project:",
          projectName,
          this._possibleProjects
      );
    } else {
      this._pageProject = null;
    }

    if (showPreferencesTab) {
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

    if ((activeTab === "account") && !!this._pageAccount) {

      this.tabView.selectTabViewItem(this._pageAccount.tabItem);
    } else if ((activeTab === "project") && !!this._pageProject) {

      this.tabView.selectTabViewItem(this._pageProject.tabItem);
    }
  }

  run() {
    const window = this.window;
    const result = window.runModal();

    if (result === 1000) {
      if (!!this._pageAccount) {
        this.endpoint = this._endpointField[0].state()
            ? this.possibleEndpoints[0]
            : this._endpointField[2].stringValue()
        this.username = this._usernameField.stringValue();
        this.password = this._passwordField.stringValue();
        this._settings.setEndpoint(this.endpoint);
        this._settings.setUsername(this.username);
        this._settings.setPassword(this.password);
      }

      if (!!this._pageProject) {
        this.projectID = this.projects[this._projectField.indexOfSelectedItem()].id;
        this._settings.setProject(this.projectID);
      }

      if (!!this._pagePreferences) {
        this.syncmode = 2;

        this._syncmodeFields.forEach((item, index) => {
          if (item.state() === 1) {
            this.syncmode = index;
          }
        })

        this._settings.setSyncmode(this.syncmode);
      }

      return true;
    }

    return false;
  }
}


export function create(settings, showAccountTab, showProjectTab, showPreferencesTab, activeTab, projects) {
  return new SettingsWindow(settings, showAccountTab, showProjectTab, showPreferencesTab, activeTab, projects);
}
