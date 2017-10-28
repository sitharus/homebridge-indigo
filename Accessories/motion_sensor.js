var IndigoAccessory = require('./accessory').IndigoAccessory;

class IndigoMotionSensorAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.MotionSensor, deviceURL, json);

        this.service.getCharacteristic(this.characteristic.MotionDetected)
            .on('get', this.getOnState.bind(this));
    }
}

module.exports = IndigoMotionSensorAccessory;