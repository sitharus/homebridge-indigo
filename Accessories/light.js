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

        if (this.supportsDim || this.isDimmer) {
            this.service.getCharacteristic(this.characteristic.Brightness)
                .on('get', this.getBrightness.bind(this))
                .on('set', this.setBrightness.bind(this));
        }

        if (this.supportsWhiteTemperature) {
            this.service.getCharacteristic(this.characteristic.ColorTemperature)
                .on('get', this.getColorTemperature.bind(this))
                .on('set', this.setColorTemperature.bind(this))
                // min/max values found here: https://github.com/ebaauw/homebridge-hue/blob/master/lib/HueLight.js
                .setProps({maxValue: 500, minValue: 153});
            
            this.maxCT = 500;
        }

        if (this.supportsHSV) {
            this.service.getCharacteristic(this.characteristic.Hue)
                .on('get', this.getHue.bind(this))
                .on('set', this.setHue.bind(this));
            
            this.service.getCharacteristic(this.characteristic.Saturation)
                .on('get', this.getSaturation.bind(this))
                .on('set', this.setSaturation.bind(this));
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
        if ((this.supportsDim || this.isDimmer) && onState && this.previousBrightness) {
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
        if (this.supportsDim || this.isDimmer) {
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
        else if (this.supportsDim || this.isDimmer) {
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

    getColorTemperature(callback) {
        if (this.supportsWhiteTemperature) {
            this.query("whiteTemperature",
                (error, temperature) => {
                    if (callback) {
                        callback(error, temperature);
                    }
                });
        } else if (callback) {
            callback("Accessory does not support white temperature");
        }
    }

    setColorTemperature(temperature, callback, context) {
        if (context === IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) { callback(); }
        } else if (this.supportsWhiteTemperature) {
            const newTemp = 1000000.0 / temperature;
            this.updateStatus({ whiteTemperature: newTemp.toFixed(0) }, callback);
        } else if (callback) {
            callback("Accessory does not support color temperature");
        }
    }

    getHue(callback) {
        if (this.supportsHSV) {
            this.query("hue",
                (error, hue) => {
                    if (callback) {
                        callback(error, hue);
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support hue");
        }
    }

    setHue(hue, callback, context) {
        if (context === IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) { callback(); }
        } else if (this.supportsHSV) {
            this.updateStatus({ hue: hue }, callback);
        } else if (callback) {
            callback("Accessory does not support hue")
        }
    }

    getSaturation(callback) {
        if (this.supportsHSV) {
            this.query("saturation", 
                (error, saturation) => {
                    if (callback) {
                        callback(error, saturation);
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support saturation");
        }
    }

    setSaturation(saturation, callback, context) {
        if (context === IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) { callback(); }
        } else if (this.supportsHSV) {
            this.updateStatus({ saturation: saturation }, callback);
        } else if (callback) {
            callback("Accessory does not support saturation");
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

    // Colour temperature conversion maths from https://github.com/ebaauw/homebridge-hue/commit/627a32d7bc9ea48bccf1278eebc83d064d86817e
    update_colorTemperature(kelvin) {
        const ct = Math.max(153, Math.min(Math.round(1000000.0 / kelvin), this.maxCT))
        this.service.getCharacteristic(this.characteristic.ColorTemperature)
            .setValue(ct.toFixed(0), undefined, IndigoAccessory.REFRESH_CONTEXT);
    }

    update_hue(hue) {
        this.service.getCharacteristic(this.characteristic.Hue)
            .setValue(hue, undefined, IndigoAccessory.REFRESH_CONTEXT);
    }

    update_saturation(saturation) {
        this.service.getCharacteristic(this.characteristic.Saturation)
            .setValue(saturation, undefined, IndigoAccessory.REFRESH_CONTEXT);
    }
}

module.exports = IndigoLightAccessory;