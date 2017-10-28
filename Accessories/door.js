const IndigoPositionAccessory = require('./position');
//
// Indigo Door Accessory
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoDoorAccessory extends IndigoPositionAccessory {
    constructor(services, platform, deviceURL, json) {
        super(service, platform, services.Service.Door, deviceURL, json);
    }
}

module.exports = IndigoDoorAccessory;
