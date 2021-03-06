var IndigoAccessory = require('./accessory').IndigoAccessory;

class IndigoTemperatureSensorAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.TemperatureSensor, deviceURL, json);
        this.service.getCharacteristic(this.characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this));
    }

    getCurrentTemperature(callback, context) {
        this.query('temperature',
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

module.exports = IndigoTemperatureSensorAccessory;
