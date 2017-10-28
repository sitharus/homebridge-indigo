const IndigoPositionAccessory = require('./position');
//
// Indigo Window Accessory
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoWindowAccessory extends IndigoPositionAccessory {
    constructor(services, platform, deviceURL, json) {
        super(service, platform, services.Service.Window, deviceURL, json);
    }
}

module.exports = IndigoWindowAccessory;
