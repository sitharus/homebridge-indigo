var IndigoAccessory = require('./accessory').IndigoAccessory;

class IndigoMotionSensorAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.MotionSensor, deviceURL, json);

        this.service.getCharacteristic(this.characteristic.MotionDetected)
            .on('get', this.getMotionDetected.bind(this));
    }

    getMotionDetected(callback, context) {
        this.query('motionDetected',
            (error, value) => {
                if (error) {
                    callback(error);
                } else {
                    callback(error, value);
                }
            }
        );
    }
}

module.exports = IndigoMotionSensorAccessory;