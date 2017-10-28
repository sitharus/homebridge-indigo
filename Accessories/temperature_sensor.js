var IndigoAccessory = require('./accessory').IndigoAccessory;

class IndigoTemperatureSensorAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.TemperatureSensor, deviceURL, json);

        this.service.getCharacteristic(this.characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this));
    }

    getCurrentTemperature(callback, context) {
        this.getStatus(
            (error) => {
                if (error) {
                    callback(error);
                } else {
                    var value = this.displayRawState;
                    this.log("%s: getCurrentTemperature() => %s", this.name, value);
                    callback(undefined, value);
                }
            }
        );
    }
}

module.exports = IndigoTemperatureSensorAccessory;
