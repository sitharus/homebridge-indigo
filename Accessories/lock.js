var IndigoAccessory = require('./accessory').IndigoAccessory;

//
// Indigo Lock Accessory - Represents a lock mechanism
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoLockAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.LockMechanism, deviceURL, json);

        this.service.getCharacteristic(this.characteristic.LockCurrentState)
            .on('get', this.getLockCurrentState.bind(this));

        this.service.getCharacteristic(this.characteristic.LockTargetState)
            .on('get', this.getLockTargetState.bind(this))
            .on('set', this.setLockTargetState.bind(this));
    }

    // Get the current lock state of the accessory
    // callback: invokes callback(error, lockState)
    //           error: error message or undefined if no error
    //           lockState: this.characteristic.LockCurrentState.SECURED (device on) or this.characteristic.LockCurrentState.UNSECURED (device off)
    getLockCurrentState(callback) {
        if (this.typeSupportsOnOff) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var lockState = (this.isOn) ? this.characteristic.LockCurrentState.SECURED : this.characteristic.LockCurrentState.UNSECURED;
                        this.log("%s: getLockCurrentState() => %s", this.name, lockState);
                        if (callback) {
                            callback(undefined, lockState);
                        }
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support on/off");
        }
    }

    // Get the target lock state of the accessory
    // callback: invokes callback(error, lockState)
    //           error: error message or undefined if no error
    //           lockState: this.characteristic.LockTargetState.SECURED (device on) or this.characteristic.LockTargetState.UNSECURED (device off)
    getLockTargetState(callback) {
        if (this.typeSupportsOnOff) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var lockState = (this.isOn) ? this.characteristic.LockTargetState.SECURED : this.characteristic.LockTargetState.UNSECURED;
                        this.log("%s: getLockTargetState() => %s", this.name, lockState);
                        if (callback) {
                            callback(undefined, lockState);
                        }
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support on/off");
        }
    }

    // Set the target lock state of the accessory
    // lockState: this.characteristic.LockTargetState.SECURED (device on) or this.characteristic.LockTargetState.UNSECURED (device off)
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, and will not update LockCurrentState
    //          otherwise, calls the Indigo RESTful API and also updates LockCurrentState to match after a one second delay
    setLockTargetState(lockState, callback, context) {
        this.log("%s: setLockTargetState(%s)", this.name, lockState);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        } else if (this.typeSupportsOnOff) {
            this.updateStatus({ isOn: (lockState == this.characteristic.LockTargetState.SECURED) ? 1 : 0 }, callback);
            // Update current state to match target state
            setTimeout(
                () => {
                    this.service.getCharacteristic(this.characteristic.LockCurrentState)
                        .setValue((lockState == this.characteristic.LockTargetState.SECURED) ?
                            this.characteristic.LockCurrentState.SECURED : this.characteristic.LockCurrentState.UNSECURED,
                        undefined, IndigoAccessory.REFRESH_CONTEXT);
                }, 1000);
        } else if (callback) {
            callback("Accessory does not support on/off");
        }
    }

    // Update HomeKit state to match state of Indigo's isOn property
    // isOn: new value of isOn property
    update_isOn(isOn) {
        var lockState = (isOn) ? this.characteristic.LockCurrentState.SECURED : this.characteristic.LockCurrentState.UNSECURED;
        this.service.getCharacteristic(this.characteristic.LockCurrentState)
            .setValue(lockState, undefined, IndigoAccessory.REFRESH_CONTEXT);

        lockState = (isOn) ? this.characteristic.LockTargetState.SECURED : this.characteristic.LockTargetState.UNSECURED;
        this.service.getCharacteristic(this.characteristic.LockTargetState)
            .setValue(lockState, undefined, IndigoAccessory.REFRESH_CONTEXT);
    }
}

module.exports = IndigoLockAccessory;

