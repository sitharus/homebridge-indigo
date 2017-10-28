const IndigoAccessory = require('./accessory').IndigoAccessory;

//
// Indigo Garage Door Accessory
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoGarageDoorAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.GarageDoorOpener, deviceURL, json);

        this.service.getCharacteristic(this.characteristic.CurrentDoorState)
            .on('get', this.getCurrentDoorState.bind(this));

        this.service.getCharacteristic(this.characteristic.TargetDoorState)
            .on('get', this.getTargetDoorState.bind(this))
            .on('set', this.setTargetDoorState.bind(this));

        this.service.getCharacteristic(this.characteristic.ObstructionDetected)
            .on('get', this.getObstructionDetected.bind(this));
    }

    // Get the current door state of the accessory
    // callback: invokes callback(error, doorState)
    //           error: error message or undefined if no error
    //           doorState: this.characteristic.CurrentDoorState.OPEN (device on) or this.characteristic.CurrentDoorState.CLOSED (device off)
    getCurrentDoorState(callback) {
        if (this.typeSupportsOnOff) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var doorState = (this.isOn) ? this.characteristic.CurrentDoorState.OPEN : this.characteristic.CurrentDoorState.CLOSED;
                        this.log("%s: getPosition() => %s", this.name, doorState);
                        if (callback) {
                            callback(undefined, doorState);
                        }
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support on/off");
        }
    };

    // Get the target door state of the accessory
    // callback: invokes callback(error, doorState)
    //           error: error message or undefined if no error
    //           doorState: this.characteristic.TargetDoorState.OPEN (device on) or this.characteristic.TargetDoorState.CLOSED (device off)
    getTargetDoorState(callback) {
        if (this.typeSupportsOnOff) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var doorState = (this.isOn) ? this.characteristic.TargetDoorState.OPEN : this.characteristic.TargetDoorState.CLOSED;
                        this.log("%s: getPosition() => %s", this.name, doorState);
                        if (callback) {
                            callback(undefined, doorState);
                        }
                    }
                }
            );
        }
        else if (callback) {
            callback("Accessory does not support on/off");
        }
    };

    // Set the target door state of the accessory
    // lockState: this.characteristic.TargetDoorState.OPEN (device on) or this.characteristic.TargetDoorState.CLOSED (device off)
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, and will not update CurrentDoorState
    //          otherwise, calls the Indigo RESTful API and also updates CurrentDoorState to match after a one second delay
    setTargetDoorState(doorState, callback, context) {
        this.log("%s: setTargetPosition(%s)", this.name, doorState);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        }
        else if (this.typeSupportsOnOff) {
            this.updateStatus({ isOn: (doorState == this.characteristic.TargetDoorState.OPEN) ? 1 : 0 }, callback);
            // Update current state to match target state
            setTimeout(
                () => {
                    this.service.getCharacteristic(this.characteristic.CurrentDoorState)
                        .setValue((doorState == this.characteristic.TargetDoorState.OPEN) ?
                            this.characteristic.CurrentDoorState.OPEN : this.characteristic.CurrentDoorState.CLOSED,
                        undefined, IndigoAccessory.REFRESH_CONTEXT);
                }, 1000);
        } else if (callback) {
            callback("Accessory does not support on/off");
        }
    };

    // Get the obstruction detected state of the accessory
    // callback: invokes callback(error, obstructionDetected)
    //           error: error message or undefined if no error
    //           obstructionDetected: always false
    getObstructionDetected(callback) {
        if (this.typeSupportsOnOff) {
            this.log("%s: getObstructionDetected() => %s", this.name, false);
            if (callback) {
                callback(undefined, false);
            }
        } else if (callback) {
            callback("Accessory does not support on/off");
        }
    };

    // Update HomeKit state to match state of Indigo's isOn property
    // isOn: new value of isOn property
    update_isOn(isOn) {
        var doorState = (isOn) ? this.characteristic.CurrentDoorState.OPEN : this.characteristic.CurrentDoorState.CLOSED;
        this.service.getCharacteristic(this.characteristic.CurrentDoorState)
            .setValue(doorState, undefined, IndigoAccessory.REFRESH_CONTEXT);

        doorState = (isOn) ? this.characteristic.TargetDoorState.OPEN : this.characteristic.TargetDoorState.CLOSED;
        this.service.getCharacteristic(this.characteristic.TargetDoorState)
            .setValue(doorState, undefined, IndigoAccessory.REFRESH_CONTEXT);
    };
}

module.exports = IndigoGarageDoorAccessory;