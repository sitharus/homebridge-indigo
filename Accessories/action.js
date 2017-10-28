const IndigoAccessory = require('./accessory').IndigoAccessory;
//
// Indigo Action Accessory - Represents an Indigo action group as a "push button switch" accessory (turns on only momentarily)
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoActionAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json) {
        super(services, platform, services.Service.Switch, deviceURL, json);

        this.service.getCharacteristic(this.caracteristic.On)
            .on('get', this.getActionState.bind(this))
            .on('set', this.executeAction.bind(this));
    }

    // Get the action state of the accessory
    // Actions always say they are off
    // callback: invokes callback(undefined, false)
    getActionState(callback) {
        this.log("%s: getActionState() => %s", this.name, false);
        callback(undefined, false);
    };

    // Executes the action if value is true and turns the accessory back off
    // value: if true, executes the action and updates the accessory state back to off
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to execute the action, otherwise will
    executeAction(value, callback, context) {
        this.log("%s: executeAction(%s)", this.name, value);
        if (value && context !== IndigoAccessory.REFRESH_CONTEXT) {
            this.platform.indigoRequest(this.deviceURL, "EXECUTE", null,
                (error, response, body) => {
                    if (error) {
                        this.log("Error executing action group: %s", error);
                    }
                }
            );

            // Turn the switch back off
            setTimeout(
                () => {
                    this.service.getCharacteristic(this.caracteristic.On)
                        .setValue(false, undefined, IndigoAccessory.REFRESH_CONTEXT);
                }, 1000);
        }

        if (callback) {
            callback();
        }
    };
}

module.exports = IndigoActionAccessory;
