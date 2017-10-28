var IndigoAccessory = require('./accessory').IndigoAccessory;

// Indigo Position Accessory (Door, Window, or Window Covering)
//
// platform: the HomeKit platform
// serviceType: the constructor for the type of HAP service to create
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoPositionAccessory extends IndigoAccessory {
    constructor(services, platform, serviceType, deviceURL, json) {
        super(services, platform, serviceType, deviceURL, json);

        this.service.getCharacteristic(this.characteristic.CurrentPosition)
            .on('get', this.getPosition.bind(this));

        this.service.getCharacteristic(this.characteristic.PositionState)
            .on('get', this.getPositionState.bind(this));

        this.service.getCharacteristic(this.characteristic.TargetPosition)
            .on('get', this.getPosition.bind(this))
            .on('set', this.setTargetPosition.bind(this));
    }

    // Get the position of the accessory
    // callback: invokes callback(error, position)
    //           error: error message or undefined if no error
    //           position: if device supports brightness, will return the brightness value; otherwise on=100 and off=0
    getPosition(callback) {
        if (this.typeSupportsOnOff || this.typeSupportsDim || this.typeIsDimmer) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var position = (this.isOn) ? 100 : 0;
                        if (this.typeSupportsDim || this.typeIsDimmer) {
                            position = this.brightness;
                        }
                        this.log("%s: getPosition() => %s", this.name, position);
                        if (callback) {
                            callback(undefined, position);
                        }
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support on/off or dim");
        }
    }

    // Get the position state of the accessory
    // callback: invokes callback(error, position)
    //           error: error message or undefined if no error
    //           positionState: always this.characteristic.PositionState.STOPPED
    getPositionState(callback) {
        if (this.typeSupportsOnOff || this.typeSupportsDim || this.typeIsDimmer) {
            this.log("%s: getPositionState() => %s", this.name, this.characteristic.PositionState.STOPPED);
            if (callback) {
                callback(undefined, this.characteristic.PositionState.STOPPED);
            }
        }
        else if (callback) {
            callback("Accessory does not support on/off or dim");
        }
    }

    // Set the target position of the accessory
    // position: if device supports brightness, sets brightness to equal position; otherwise turns device on if position > 0, or off otherwise
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, and will not update CurrentPosition
    //          otherwise, calls the Indigo RESTful API and also updates CurrentPosition to match position after a one second delay
    setTargetPosition(position, callback, context) {
        this.log("%s: setTargetPosition(%s)", this.name, position);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        } else if (this.typeSupportsOnOff || this.typeSupportsDim || this.typeIsDimmer) {
            if (this.typeSupportsDim || this.typeIsDimmer) {
                this.updateStatus({ brightness: position }, callback);
            } else {
                this.updateStatus({ isOn: (position > 0) ? 1 : 0 }, callback);
            }
            // Update current state to match target state
            setTimeout(
                () => {
                    this.service
                        .getCharacteristic(this.characteristic.CurrentPosition)
                        .setValue(position, undefined, IndigoAccessory.REFRESH_CONTEXT);
                }, 1000);
        } else if (callback) {
            callback("Accessory does not support on/off or dim");
        }
    }

    // Update HomeKit state to match state of Indigo's isOn property
    // Does nothing if device supports brightness
    // isOn: new value of isOn property
    update_isOn(isOn) {
        if (!(this.typeSupportsDim || this.typeIsDimmer)) {
            var position = (isOn) ? 100 : 0;
            this.service
                .getCharacteristic(this.characteristic.CurrentPosition)
                .setValue(position, undefined, IndigoAccessory.REFRESH_CONTEXT);
            this.service
                .getCharacteristic(this.characteristic.TargetPosition)
                .setValue(position, undefined, IndigoAccessory.REFRESH_CONTEXT);
        }
    }

    // Update HomeKit state to match state of Indigo's brightness property
    // brightness: new value of brightness property
    update_brightness(brightness) {
        this.service
            .getCharacteristic(this.characteristic.CurrentPosition)
            .setValue(brightness, undefined, IndigoAccessory.REFRESH_CONTEXT);
        this.service
            .getCharacteristic(this.characteristic.TargetPosition)
            .setValue(brightness, undefined, IndigoAccessory.REFRESH_CONTEXT);
    }
}

module.exports = IndigoPositionAccessory;