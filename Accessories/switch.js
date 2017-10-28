var IndigoAccessory = require('./accessory').IndigoAccessory;

//
// Indigo Switch Accessory - Represents an on/off switch
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoSwitchAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.Switch, deviceURL, json);

        this.service.getCharacteristic(this.characteristic.On)
            .on('get', this.getOnState.bind(this))
            .on('set', this.setOnState.bind(this));
    }

    // Update HomeKit state to match state of Indigo's isOn property
    // isOn: new value of isOn property
    update_isOn(isOn) {
        var onState = (isOn) ? true : false;
        this.service.getCharacteristic(this.characteristic.On)
            .setValue(onState, undefined, IndigoAccessory.REFRESH_CONTEXT);
    }
}

module.exports = IndigoSwitchAccessory;