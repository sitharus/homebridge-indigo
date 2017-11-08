
//
// Generic Indigo Accessory
//
// platform: the HomeKit platform
// serviceType: the constructor for the type of HAP service to create
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoAccessory {

    // A set context that indicates this is from an update made by this plugin, so do not call the Indigo RESTful API with a put request

    constructor(services, platform, serviceType, deviceURL, json) {
        this.platform = platform;
        this.log = platform.log;
        this.deviceURL = deviceURL;
        const {Accessory, Service, uuid, Characteristic} = services;
        this.accessoryService = Accessory;
        this.uuidService = uuid;
        this.serviceType = Service;
        this.characteristic = Characteristic;

        this.updateFromJSON(json);

        this.accessoryService.call(this, this.name, uuid.generate(String(this.id)));

        this.infoService = this.getService(Service.AccessoryInformation);
        this.infoService.setCharacteristic(Characteristic.Manufacturer, "Indigo")
            .setCharacteristic(Characteristic.SerialNumber, String(this.id));

        if (this.type) {
            this.infoService.setCharacteristic(Characteristic.Model, this.type);
            switch (this.type) {
                case 'dimmer':
                    this.isDimmer = true;
                    break;
            }
        }

        if (this.versByte) {
            this.infoService.setCharacteristic(Characteristic.FirmwareRevision, this.versByte);
        }

        this.service = this.addService(serviceType, this.name);
    }

    getServices() {
        return this.services;
    }

    // Updates the Accessory's properties with values from JSON from the Indigo RESTful API
    // json: JSON object from the Indigo RESTful API
    // updateCallback: optional, invokes updateCallback(propertyName, propertyValue) for each property that has changed value
    updateFromJSON(json, updateCallback) {
        for (var prop in json) {
            if (prop != "name" && json.hasOwnProperty(prop)) {
                if (json[prop] != this[prop]) {
                    this[prop] = json[prop];
                    if (updateCallback) {
                        updateCallback(prop, json[prop]);
                    }
                }
            }
        }

        // Allows us to change the name of accessories - useful for testing
        if (json.name !== undefined) {
            this.name = this.platform.accessoryNamePrefix + String(json.name);
        }
    }

    getStatus(callback, updateCallback) {
        this.platform.indigoRequestJSON(this.deviceURL, "GET", null,
            (error, json) => {
                if (error) {
                    if (callback) {
                        callback(error);
                    }
                } else {
                    this.updateFromJSON(json, updateCallback);
                    if (callback) {
                        callback();
                    }
                }
            }
        );
    };


    // Calls the Indigo RESTful API to alter the state of this Accessory, and updates the Accessory's properties to match
    // qs: the query string parameters to send to the Indigo RESTful API via a PUT request
    // callback: invokes callback(error), error is undefined if no error occurred
    // updateCallback: optional, invokes updateCallback(propertyName, propertyValue) for each property that has changed value
    updateStatus(qs, callback, updateCallback) {
        this.log("updateStatus of %s: %s", this.name, JSON.stringify(qs));
        this.platform.indigoRequest(this.deviceURL, "PUT", qs,
            (error, response, body) => {
                if (error) {
                    if (callback) {
                        callback(error);
                    }
                } else {
                    this.getStatus(callback, updateCallback);
                }
            }
        );
    };

    // Calls the Indigo RESTful API to get the latest state of this Accessory, and updates the Accessory's properties to match
    // key: the property we are interested in
    // callback: invokes callback(error, value), error is undefined if no error occurred, value is the value of the property named key
    query(key, callback) {
        this.getStatus(
            (error) => {
                if (error) {
                    if (callback) {
                        callback(error);
                    }
                } else {
                    this.log("%s: query(%s) => %s", this.name, key, this[key]);
                    if (callback) {
                        callback(undefined, this[key]);
                    }
                }
            }
        );
    };

    // Invokes the Accessory's update_XXX(value) function, if it exists, where "XXX" is the value of prop
    // For example, updateProperty("brightness", 100) invokes update_brightness(100) if the function update_brightess exists
    // prop: the property name
    // value: the property value
    // TODO: Need a more elegant way to map HomeKit Characteristics and values to Indigo JSON keys and values
    updateProperty(prop, value) {
        updateFunction = "update_" + prop;
        if (this[updateFunction]) {
            this.log("%s: %s(%s)", this.name, updateFunction, value);
            this[updateFunction](value);
        }
    };

    // Calls the Indigo RESTful API to get the latest state of this Accessory, and updates the Accessory's properties to match
    // Invokes the Accessory's update_KEY function for each property KEY where the value has changed from the prior cached state
    // If the Accessory does not have an update_KEY function for a given KEY, it is safely ignored
    // This is used when we are listening on the listenPort for notifications from Indigo about devices that have changed state
    // callback: invokes callback(error), error is undefined if no error occurred
    refresh(callback) {
        this.log("%s: refresh()", this.name);
        this.getStatus(callback, this.updateProperty.bind(this));
    };

    // Updates the Accessory's properties to match the provided JSON key/value pairs
    // Invokes the Accessory's update_KEY function for each property KEY where the value has changed from the prior cached state
    // If the Accessory does not have an update_KEY function for a given KEY, it is safely ignored
    // This is used when we are listening on the listenPort for notifications from Indigo about devices that have changed state
    // json: the JSON key/value pairs to update
    refreshFromJSON(json) {
        this.log("%s: refreshFromJSON()", this.name);
        this.updateFromJSON(json, this.updateProperty.bind(this));
    };


    // Most accessories support on/off, so we include helper functions to get/set onState here

    // Get the current on/off state of the accessory
    // callback: invokes callback(error, onState)
    //           error: error message or undefined if no error
    //           onState: true if device is on, false otherwise
    getOnState(callback) {
        if (this.supportsOnOff) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var onState = (this.on) ? true : false;
                        this.log("%s: getOnState() => %s", this.name, onState);
                        if (callback) {
                            callback(undefined, onState);
                        }
                    }
                }
            );
        }
        else if (callback) {
            callback("Accessory does not support on/off");
        }
    };

    // Set the current on/off state of the accessory
    // onState: true if on, false otherwise
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setOnState(onState, callback, context) {
        this.log("%s: setOnState(%s)", this.name, onState);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        } else if (this.supportsOnOff) {
            this.updateStatus({ on: (onState) ? 1 : 0 }, callback);
        } else if (callback) {
            callback("Accessory does not support on/off");
        }
    };
}
IndigoAccessory.REFRESH_CONTEXT = 'refresh'

module.exports = { IndigoAccessory };