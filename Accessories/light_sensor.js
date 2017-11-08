var IndigoAccessory = require('./accessory').IndigoAccessory;

class IndigoLightSensorAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.LightSensor, deviceURL, json);
        this.service.getCharacteristic(this.characteristic.CurrentAmbientLightLevel)
            .on('get', this.getCurrentTemperature.bind(this));
    }

    getCurrentTemperature(callback, context) {
        this.query('lightLevel',
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

module.exports = IndigoLightSensorAccessory;
