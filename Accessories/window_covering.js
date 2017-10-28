const IndigoPositionAccessory = require('./position');
//
// Indigo Window Covering Accessory
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoWindowCoveringAccessory extends IndigoPositionAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.WindowCovering, deviceURL, json);
    }
}

module.exports = IndigoWindowCoveringAccessory;
