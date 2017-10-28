var IndigoAccessory = require('./accessory').IndigoAccessory;

//
// Indigo Light Accessory
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoLightAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.Lightbulb, deviceURL, json);

        if (this.brightness) {
            this.previousBrightness = this.brightness;
        }

        this.service.getCharacteristic(this.characteristic.On)
            .on('get', this.getOnState.bind(this))
            .on('set', this.setLightOnState.bind(this));

        if (this.typeSupportsDim || this.typeIsDimmer) {
            this.service.getCharacteristic(this.characteristic.Brightness)
                .on('get', this.getBrightness.bind(this))
                .on('set', this.setBrightness.bind(this));
        }
    }

    // Set the on state of the light
    // onState: true if on, false otherwise
    //          if true, sets the brightness to the previous brightness level, unless it is undefined or zero, in which case sends an ON command
    //          this hackery is because HomeKit sends both ON and BRIGHTNESS when adjusting a light's brightness
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setLightOnState(onState, callback, context) {
        this.log("%s: setLightOnState(%d)", this.name, onState);
        if ((this.typeSupportsDim || this.typeIsDimmer) && onState && this.previousBrightness) {
            this.setBrightness(this.previousBrightness, callback, context);
        } else {
            this.setOnState(onState, callback, context)
        }
    }

    // Get the brightness of the accessory
    // callback: invokes callback(error, brightness)
    //           error: error message or undefined if no error
    //           brightness: if device supports brightness, will return the brightness value
    getBrightness(callback) {
        if (this.typeSupportsDim || this.typeIsDimmer) {
            this.query("brightness",
                (error, brightness) => {
                    if (!error && brightness > 0) {
                        this.previousBrightness = brightness;
                    }
                    if (callback) {
                        callback(error, brightness);
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support brightness");
        }
    }

    // Set the current brightness of the accessory
    // brightness: the brightness, from 0 (off) to 100 (full on)
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setBrightness(brightness, callback, context) {
        this.log("%s: setBrightness(%d)", this.name, brightness);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        }
        else if (this.typeSupportsDim || this.typeIsDimmer) {
            if (brightness >= 0 && brightness <= 100) {
                if (brightness > 0) {
                    this.previousBrightness = brightness;
                }
                this.updateStatus({ brightness: brightness }, callback);
            }
        }
        else if (callback) {
            callback("Accessory does not support brightness");
        }
    }

    // Update HomeKit state to match state of Indigo's isOn property
    // isOn: new value of isOn property
    update_isOn(isOn) {
        var onState = (isOn) ? true : false;
        this.service.getCharacteristic(this.characteristic.On)
            .setValue(onState, undefined, IndigoAccessory.REFRESH_CONTEXT);
    }

    // Update HomeKit state to match state of Indigo's brightness property
    // brightness: new value of brightness property
    update_brightness(brightness) {
        if (brightness > 0) {
            this.previousBrightness = brightness;
        }
        this.service.getCharacteristic(this.characteristic.Brightness)
            .setValue(brightness, undefined, IndigoAccessory.REFRESH_CONTEXT);
    }
}

module.exports = IndigoLightAccessory;