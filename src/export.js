import settings from 'sketch/settings'
import sketch from 'sketch'
import ui from 'sketch/ui'


const fetch = require("sketch-polyfill-fetch");


function assignmentBugWorkaround(buggyValue) {
  return buggyValue;
}


function base64Encode(buffer) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const wholeBlockNumber = ~~(buffer.length / 3);
    const extraBytesNumber = buffer.length - 3 * wholeBlockNumber;
    var result = "";

    for (var blockIndex = 0; blockIndex < wholeBlockNumber; blockIndex++) {
        var offset = 3 * blockIndex;
        var value = (buffer[offset + 0] << 16) | (buffer[offset + 1] << 8) | buffer[offset + 2];
        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            alphabet[(value >>  6) & 63] +
            alphabet[(value >>  0) & 63];
    }

    var offset = 3 * wholeBlockNumber;

    if (extraBytesNumber == 1) {
        var value = (buffer[offset + 0] << 16);

        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            "==";

    } else if (extraBytesNumber == 2) {
        var value = (buffer[offset + 0] << 16) | (buffer[offset + 1] << 8);

        result +=
            alphabet[(value >> 18) & 63] +
            alphabet[(value >> 12) & 63] +
            alphabet[(value >>  6) & 63] +
            "=";
    }

    return result;
}


function processLayer(layer, layerIndex, layerLevel) {
  if (
    (layer.type != "Page") &&
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

  var masterUuid = null;
  var targetUuid = null;
  var rect = null;
  var image = null;
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

  if ((layer.type == "Artboard") || (layer.type == "SymbolInstance")) {
    const options = { formats: 'png', output: false };
    const buffer = sketch.export(layer, options);
    image = base64Encode(buffer);
  }

  if (layer.layers !== undefined) {
    layer.layers.forEach(
      function(l, i) {
        var childLayer = processLayer(l, i, layerLevel + 1);

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
    "image": image,
    "layers": childLayers,
    "overrides": overrides
  };
}


function processPage(documentLayers, page, pageIndex) {
  return processLayer(documentLayers, page, pageIndex, 2);
}

export default function() {
  var username = settings.sessionVariable('globalization-username');
  var password = settings.sessionVariable('globalization-password');

  if (username === undefined) {
    ui.getInputFromUser(
      "Username:",
      {},
      (err, value) => {
        if (err) {
          username = undefined;
        } else {
          username = value;  
        }
      }
    );
  }

  if (username === undefined) {
    ui.alert("FAILURE", "Authentication failure.\r\nUsername required.");
    return;
  }

  console.log("INFO: Username is valid. Value is '" + username + "'.");

  if (password === undefined) {
    ui.getInputFromUser(
      "Password for '" + username + "':",
      {},
      (err, value) => {
        if (err) {
          password = undefined;
        } else {
          password = value;  
        }
      }
    );
  }

  if (password === undefined) {
    ui.alert("FAILURE", "Authentication failure.\r\nPassword required.");
    return;
  }

  console.log("INFO: Password is valid.");

  settings.setSessionVariable('globalization-username', username);
  settings.setSessionVariable('globalization-password', password);
  
  var document = sketch.getSelectedDocument();
  var documentLayers = [];

  document.pages.forEach(
    function(page, pageIndex) {
      documentLayers.push(
        processPage(page, pageIndex));
    }
  );

  var result = {
    "uuid": assignmentBugWorkaround(document.id),
    "type": document.type,
    "name": document.path,
    "master_uuid": null,
    "target_uuid": null,
    "rect": null,
    "image": null,
    "layers": documentLayers,
    "overrides": []
  };

  fetch("https://internationalization.spacebank.xyz/api/upload",
  {
    method: "POST",
    body: result
  })
  .then(function(response) {
    var responseText = "NO MESSAGE RETURNED";

    response.text().then(
      function(responseText) {
        if ((response.status >= 200) && (response.status < 300)) {
          console.log("SUCCESS: Export completed.");
          ui.alert("SUCCESS", responseText);
        } else {
          console.log("FAILURE: " + responseText + ".");
          ui.alert("FAILURE", responseText);
        }
      }
    )
    .catch(function(e) {
      console.log("FAILURE: Error Code is '" + e.code() + "'. Description is '" + e.localizedDescription() + "'.");
      ui.alert("FAILURE", "Error: " + e.code() + "\r\n" + e.localizedDescription());
    });
  })
  .catch(function(e) {
    console.log("FAILURE: Error Code is '" + e.code() + "'. Description is '" + e.localizedDescription() + "'.");
    ui.alert("FAILURE", "Error: " + e.code() + "\r\n" + e.localizedDescription());
  });
}
