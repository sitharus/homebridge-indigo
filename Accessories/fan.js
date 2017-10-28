const IndigoAccessory = require('./accessory').IndigoAccessory;
//
// Indigo Fan Accessory
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoFanAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.Fan, deviceURL, json);

        if (this.speedIndex) {
            this.previousRotationSpeed = (this.speedIndex / 3.0) * 100.0;
        }

        this.service.getCharacteristic(this.characteristic.On)
            .on('get', this.getOnState.bind(this))
            .on('set', this.setFanOnState.bind(this));

        this.service.getCharacteristic(this.characteristic.RotationSpeed)
            .on('get', this.getRotationSpeed.bind(this))
            .on('set', this.setRotationSpeed.bind(this));
    }


    // Set the on state of the fan
    // onState: true if on, false otherwise
    //          if true, sets the speed index to the previous speed index level, unless it is undefined or zero, in which case sends an ON command
    //          this hackery is because HomeKit sends both ON and ROTATION SPEED when adjusting a fan's speed
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setFanOnState(onState, callback, context) {
        this.log("%s: setFanOnState(%d)", this.name, onState);
        if (onState && this.previousRotationSpeed) {
            this.setRotationSpeed(this.previousRotationSpeed, callback, context);
        } else {
            this.setOnState(onState, callback, context)
        }
    };

    // Get the rotation speed of the accessory
    // callback: invokes callback(error, speedIndex)
    //           error: error message or undefined if no error
    //           speedIndex: if device supports speed control, will return the speed as a value from 0 (off) to 100 (full speed)
    getRotationSpeed(callback) {
        if (this.typeSupportsSpeedControl || this.typeIsSpeedControl) {
            this.query("speedIndex",
                (error, speedIndex) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        if (speedIndex > 0) {
                            this.previousRotationSpeed = (speedIndex / 3.0) * 100.0;
                        }
                        if (callback) {
                            callback(undefined, (speedIndex / 3.0) * 100.0);
                        }
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support rotation speed");
        }
    };

    // Set the current rotation speed of the accessory
    // rotationSpeed: the rotation speed, from 0 (off) to 100 (full speed)
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setRotationSpeed(rotationSpeed, callback, context) {
        this.log("%s: setRotationSpeed(%d)", this.name, rotationSpeed);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        } else if (this.typeSupportsSpeedControl || this.typeIsSpeedControl) {
            if (rotationSpeed >= 0.0 && rotationSpeed <= 100.0) {
                var speedIndex = 0;
                if (rotationSpeed > (100.0 / 3.0 * 2.0)) {
                    speedIndex = 3;
                } else if (rotationSpeed > (100.0 / 3.0)) {
                    speedIndex = 2;
                } else if (rotationSpeed > 0) {
                    speedIndex = 1;
                }
                if (rotationSpeed > 0) {
                    this.previousRotationSpeed = rotationSpeed;
                }
                this.updateStatus({ speedIndex: speedIndex }, callback);
            }
        }
        else if (callback) {
            callback("Accessory does not support rotation speed");
        }
    };

    // Update HomeKit state to match state of Indigo's isOn property
    // isOn: new value of isOn property
    update_isOn(isOn) {
        var onState = (isOn) ? true : false;
        this.service.getCharacteristic(this.characteristic.On)
            .setValue(onState, undefined, IndigoAccessory.REFRESH_CONTEXT);
    };

    // Update HomeKit state to match state of Indigo's speedIndex property
    // speedIndex: new value of speedIndex property
    update_speedIndex(speedIndex) {
        if (speedIndex > 0) {
            this.previousRotationSpeed = (this.speedIndex / 3.0) * 100.0;
        }
        this.service.getCharacteristic(this.characteristic.RotationSpeed)
            .setValue((speedIndex / 3.0) * 100.0, undefined, IndigoAccessory.REFRESH_CONTEXT);
    };
}

module.exports = IndigoAccessory;
