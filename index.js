/*
Indigo platform shim for HomeBridge
Written by Mike Riccio (https://github.com/webdeck/homebridge-indigo)
See http://www.indigodomo.com/ for more info on Indigo
See http://forums.indigodomo.com/viewtopic.php?f=9&t=15008 for installation instructions

Configuration example for your Homebridge config.json:

"platforms": [
    {
        "platform": "Indigo",
        "name": "My Indigo Server",
        "protocol": "http",
        "host": "127.0.0.1",
        "port": "8176",
        "path": "",
        "username": "myusername",
        "password": "mypassword",
        "includeActions": true,
        "includeIds": [ "12345", "67890" ],
        "excludeIds": [ "98765", "43210" ],
        "treatAsSwitchIds": [ "13579", "24680" ],
        "treatAsLockIds": [ "112233", "445566" ],
        "treatAsDoorIds": [ "224466", "664422" ],
        "treatAsGarageDoorIds": [ "223344", "556677" ],
        "treatAsWindowIds": [ "123123", "456456" ],
        "treatAsWindowCoveringIds": [ "345345", "678678" ],
        "thermostatsInCelsius": false,
        "accessoryNamePrefix": "",
        "listenPort": 8177
    }
]

Fields:
    "platform": Must always be "Indigo" (required)
    "name": Can be anything (required)
    "protocol": "http" or "https" (optional, defaults to "http" if not specified)
    "host": Hostname or IP Address of your Indigo web server (required)
    "port": Port number of your Indigo web server (optional, defaults to "8176" if not specified)
    "path": The path to the root of your Indigo web server (optional, defaults to "" if not specified, only needed if you have a proxy in front of your Indigo web server)
    "username": Username to log into Indigo web server, if applicable (optional)
    "password": Password to log into Indigo web server, if applicable (optional)
    "includeActions": If true, creates HomeKit switches for your actions (optional, defaults to false)
    "includeIds": Array of Indigo IDs to include (optional - if provided, only these Indigo IDs will map to HomeKit devices)
    "excludeIds": Array of Indigo IDs to exclude (optional - if provided, these Indigo IDs will not be mapped to HomeKit devices)
    "treatAsSwitchIds": Array of Indigo IDs to treat as switches (instead of lightbulbs) - devices must support on/off to qualify
    "treatAsLockIds": Array of Indigo IDs to treat as locks (instead of lightbulbs) - devices must support on/off to qualify (on = locked)
    "treatAsDoorIds": Array of Indigo IDs to treat as doors (instead of lightbulbs) - devices must support on/off to qualify (on = open)
    "treatAsGarageDoorIds": Array of Indigo IDs to treat as garage door openers (instead of lightbulbs) - devices must support on/off to qualify (on = open)
    "treatAsWindowIds": Array of Indigo IDs to treat as windows (instead of lightbulbs) - devices must support on/off to qualify (on = open)
    "treatAsWindowCoveringIds": Array of Indigo IDs to treat as window coverings (instead of lightbulbs) - devices must support on/off to qualify (on = open)
    "thermostatsInCelsius": If true, thermostats in Indigo are reporting temperatures in celsius (optional, defaults to false)
    "accessoryNamePrefix": Prefix all accessory names with this string (optional, useful for testing)
    "listenPort": homebridge-indigo will listen on this port for device state updates from Indigo (requires compatible Indigo plugin) (optional, defaults to not listening)

Note that if you specify both "includeIds" and "excludeIds", then only the IDs that are in
"includeIds" and missing from "excludeIds" will be mapped to HomeKit devices.  Typically,
you would only specify one or the other, not both of these lists.  If you just want to
expose everything, then omit both of these keys from your configuration.

Also note that any Indigo devices or actions that have Remote Display unchecked in Indigo
will NOT be exposed to HomeKit, because Indigo excludes those devices from its RESTful API.
*/

const request = require("request");
const async = require("async");
const express = require("express");
const bodyParser = require('body-parser');
const inherits = require('util').inherits;
const IndigoAccessory = require("./Accessories/accessory").IndigoAccessory;
const IndigoLightAccessory = require('./Accessories/light');
const IndigoMotionSensorAccessory = require('./Accessories/motion_sensor');
const IndigoTemperatureSensorAccessory = require('./Accessories/temperature_sensor');
const IndigoSwitchAccessory = require('./Accessories/switch');
const IndigoLockAccessory = require('./Accessories/lock');
const IndigoPositionAccessory = require('./Accessories/position');
const IndigoDoorAccessory = require('./Accessories/door');
const IndigoWindowAccessory = require('./Accessories/window');
const IndigoWindowCoveringAccessory = require('./Accessories/window_covering');
const IndigoGarageDoorAccessory = require('./Accessories/garage_door');
const IndigoFanAccessory = require('./Accessories/fan');
const IndigoThermostatAccessory = require('./Accessories/thermostat');
const IndigoActionAccessory = require('./Accessories/action');
const IndigoLightSensorAccessory = require('./Accessories/light_sensor');

let Service, Characteristic, Accessory, uuid;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    Accessory = homebridge.hap.Accessory;
    uuid = homebridge.hap.uuid;

    fixInheritance(IndigoAccessory, Accessory);
    homebridge.registerPlatform("homebridge-indigo", "Indigo", IndigoPlatform);
};

// Necessary because Accessory is defined after we have defined all of our classes
function fixInheritance(subclass, superclass) {
    var proto = subclass.prototype;
    inherits(subclass, superclass);
    subclass.prototype.parent = superclass.prototype;
    for (var mn in proto) {
        subclass.prototype[mn] = proto[mn];
    }
}


// Initialize the homebridge platform
// log: the logger
// config: the contents of the platform's section of config.json
class IndigoPlatform {
    constructor(log, config) {
        this.log = log;

        // We use a queue to serialize all the requests to Indigo
        this.requestQueue = async.queue(
            function (options, callback) {
                this.log("Indigo request: %s", options.url);
                request(options, callback);
            }.bind(this)
        );

        this.foundAccessories = [];
        this.accessoryMap = new Map();

        // Parse all the configuration options
        var protocol = "http";
        if (config.protocol) {
            protocol = config.protocol;
        }

        var port = "8176";
        if (config.port) {
            port = config.port;
        }

        this.path = "";
        if (config.path) {
            this.path = config.path;
            // Make sure path doesn't end with a slash
            if (this.path.length > 0 && this.path.charAt(this.path.length - 1) == '/') {
                this.path = this.path.substr(0, this.path.length - 1);
            }
            this.log("Path prefix is %s", this.path);
        }

        this.baseURL = protocol + "://" + config.host + ":" + port;
        this.log("Indigo base URL is %s", this.baseURL);

        if (config.username && config.password) {
            this.auth = {
                user: config.username,
                pass: config.password,
                sendImmediately: true
            };
        }

        this.includeActions = config.includeActions;
        this.includeIds = config.includeIds;
        this.excludeIds = config.excludeIds;
        this.treatAsSwitchIds = config.treatAsSwitchIds;
        this.treatAsMotionSensor = config.treatAsMotionSensor;
        this.treatAsLockIds = config.treatAsLockIds;
        this.treatAsDoorIds = config.treatAsDoorIds;
        this.treatAsGarageDoorIds = config.treatAsGarageDoorIds;
        this.treatAsWindowIds = config.treatAsWindowIds;
        this.treatAsWindowCoveringIds = config.treatAsWindowCoveringIds;
        this.thermostatsInCelsius = config.thermostatsInCelsius;
        this.treatAsTemperatureSensor = config.treatAsTemperatureSensor;

        if (config.accessoryNamePrefix) {
            this.accessoryNamePrefix = config.accessoryNamePrefix;
        } else {
            this.accessoryNamePrefix = "";
        }

        // Start the accessory update listener, if configured
        if (config.listenPort) {
            this.app = express();
            this.app.use(bodyParser.json());
            this.app.use(bodyParser.urlencoded({ extended: true }));
            this.app.get("/devices/:id", this.updateAccessory.bind(this));
            this.app.post("/devices/:id", this.updateAccessoryFromPost.bind(this));
            this.app.listen(config.listenPort,
                function () {
                    this.log("Listening on port %d", config.listenPort);
                }.bind(this)
            );
        }
    }

    // Invokes callback(accessories[]) with all of the discovered accessories for this platform
    accessories(callback) {
        var requestURLs = [this.path + "/devices"];

        async.eachSeries(requestURLs,
            (requestURL, asyncCallback) => {
                this.discoverAccessories(requestURL, asyncCallback);
            },
            (asyncError) => {
                if (asyncError) {
                    this.log(asyncError);
                }

                if (this.foundAccessories.length > 99) {
                    this.log("*** WARNING *** you have %s accessories.",
                        this.foundAccessories.length);
                    this.log("*** Limiting to the first 99 discovered. ***");
                    this.log("*** See README.md for how to filter your list. ***");
                    this.foundAccessories = this.foundAccessories.slice(0, 99);
                }

                this.log("Created %s accessories", this.foundAccessories.length);
                callback(this.foundAccessories.sort(
                    function (a, b) {
                        return (a.name > b.name) - (a.name < b.name);
                    }
                ));
            }
        );
    };

    // Discovers all of the accessories under a root Indigo RESTful API node (e.g. devices, actions, etc.)
    // Populates this.foundAccessories and this.accessoryMap
    // requestURL: the Indigo RESTful API URL to query
    // callback: invokes callback(error) when all accessories have been discovered; error is undefined if no error occurred
    discoverAccessories(requestURL, callback) {
        this.indigoRequestJSON(requestURL, "GET", null,
            (error, json) => {
                if (error) {
                    callback(error);
                } else {
                    async.eachSeries(json, this.addAccessory.bind(this),
                        function (asyncError) {
                            if (asyncError) {
                                callback(asyncError);
                            } else {
                                callback();
                            }
                        }
                    );
                }
            }
        );
    };

    // Adds an IndigoAccessory object to this.foundAccessories and this.accessoryMap
    // item: JSON describing the device, as returned by the root of the Indigo RESTful API (e.g. /devices.json/)
    // callback: invokes callback(error), error is always undefined as we want to ignore errors
    // Note: does not create and add the IndigoAccessory if it is an unknoen type or is excluded by the config
    addAccessory(item, callback) {
        // Get the details of the item, using its provided restURL
        this.log("Adding accessory %s", JSON.stringify(item));
        if (this.includeItemId(item.id)) {
            var accessory = this.createAccessoryFromJSON(item.href, item);
            if (accessory) {
                this.foundAccessories.push(accessory);
                this.accessoryMap.set(String(item.id), accessory);
            } else {
                this.log("Ignoring unknown accessory type %s", item.type);
            }
        }
        else {
            this.log("Ignoring excluded ID %s", item.id);
        }
        callback();
    };

    // Returns true if the item id should be included in the accessory list
    // id: the Indigo ID of the device/action
    includeItemId(id) {
        if (this.includeIds && (this.includeIds.indexOf(String(id)) < 0)) {
            return false;
        }

        if (this.excludeIds && (this.excludeIds.indexOf(String(id)) >= 0)) {
            return false;
        }

        return true;
    };

    // Makes a request to Indigo using the RESTful API
    // path: the path of the request, relative to the base URL in the configuration, starting with a /
    // method: the type of HTTP request to make (e.g. GET, POST, etc.)
    // qs: the query string to include in the request (optional)
    // callback: invokes callback(error, response, body) with the result of the HTTP request
    indigoRequest(path, method, qs, callback) {
        // seems to be a bug in request that if followRedirect is false and auth is
        // required, it crashes because redirects is missing, so I include it here
        var options = {
            url: this.baseURL + path,
            method: method,
            followRedirect: false,
            redirects: []
        };
        if (this.auth) {
            options.auth = this.auth;
        }
        if (qs) {
            options.qs = qs;
        }

        // All requests to Indigo are serialized, so that there is no more than one outstanding request at a time
        this.requestQueue.push(options, callback);
    };

    // Makes a request to Indigo using the RESTful API and parses the JSON response
    // path: the path of the request, relative to the base URL in the configuration, starting with a /
    // method: the type of HTTP request to make (e.g. GET, POST, etc.)
    // qs: the query string to include in the request (optional)
    // callback: invokes callback(error, json) with the parsed JSON object returned by the HTTP request
    // jsonFixer: optional function which manipulates the HTTP response body before attempting to parse the JSON
    //            this is used to work around bugs in Indigo's RESTful API responses that cause invalid JSON
    indigoRequestJSON(path, method, qs, callback, jsonFixer) {
        this.indigoRequest(path, method, qs,
            (error, response, body) => {
                if (error) {
                    var msg = "Error for Indigo request " + path + ": " + error;
                    this.log(msg);
                    callback(msg);
                }
                else {
                    var json;
                    try {
                        var json = JSON.parse(body);
                    } catch (e) {
                        var msg2 = "Error parsing Indigo response for " + path +
                            "\nException: " + e + "\nResponse: " + body;
                        this.log(msg2);
                        callback(msg2);
                        return;
                    }
                    callback(undefined, json);
                }
            }
        );
    };

    // Returns subclass of IndigoAccessory based on json, or null if unsupported type
    // deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
    // json: the json that describes this device
    createAccessoryFromJSON(deviceURL, json) {
        const services = { Accessory, Service, uuid, Characteristic };
        if (json.restParent == "actions") {
            return new IndigoActionAccessory(services, this, deviceURL, json);
        } else if (json.supportsOnOff && this.treatAsSwitchIds &&
            (this.treatAsSwitchIds.indexOf(String(json.id)) >= 0)) {
            return new IndigoSwitchAccessory(services, this, deviceURL, json);
        } else if (json.supportsOnOff && this.treatAsLockIds &&
            (this.treatAsLockIds.indexOf(String(json.id)) >= 0)) {
            return new IndigoLockAccessory(services, this, deviceURL, json);
        } else if (json.supportsOnOff && this.treatAsDoorIds &&
            (this.treatAsDoorIds.indexOf(String(json.id)) >= 0)) {
            return new IndigoDoorAccessory(services, this, deviceURL, json);
        } else if (json.supportsOnOff && this.treatAsGarageDoorIds &&
            (this.treatAsGarageDoorIds.indexOf(String(json.id)) >= 0)) {
            return new IndigoGarageDoorAccessory(services, this, deviceURL, json);
        } else if (json.supportsOnOff && this.treatAsWindowIds &&
            (this.treatAsWindowIds.indexOf(String(json.id)) >= 0)) {
            return new IndigoWindowAccessory(services, this, deviceURL, json);
        } else if (json.supportsOnOff && this.treatAsWindowCoveringIds &&
            (this.treatAsWindowCoveringIds.indexOf(String(json.id)) >= 0)) {
            return new IndigoWindowCoveringAccessory(services, this, deviceURL, json);
        } else if (json.supportsHVAC || json.typeIsHVAC) {
            return new IndigoThermostatAccessory(services, this, deviceURL, json, this.thermostatsInCelsius);
        } else if (json.supportsSpeedControl || json.typeIsSpeedControl) {
            return new IndigoFanAccessory(services, this, deviceURL, json);
        } else if (json.supportsDim || json.isDimmer || json.supportsOnOff) {
            return new IndigoLightAccessory(services, this, deviceURL, json);
        } else if (json.type === 'temperatureSensor') {
            return new IndigoTemperatureSensorAccessory(services, this, deviceURL, json);
        } else if (json.type === 'lightSensor') {
            return new IndigoLightSensorAccessory(services, this, deviceURL, json);
        } else if (json.type === 'motionSensor') {
            return new IndigoMotionSensorAccessory(services, this, deviceURL, json);
        } else {
            return null;
        }
    };

    // Invoked by a GET request on listenPort of /devices/:id
    // If the ID corresponds to an accessory, invokes refresh() on that accessory
    // Sends a 200 HTTP response if successful, a 404 if the ID is not found, or a 500 if there is an error
    updateAccessory(request, response) {
        var id = String(request.params.id);
        this.log("Got update request for device ID %s", id);
        var accessory = this.accessoryMap.get(id);
        if (accessory) {
            accessory.refresh((error) => {
                if (error) {
                    this.log("Error updating device ID %s: %s", id, error);
                    response.sendStatus(500);
                } else {
                    response.sendStatus(200);
                }
            });
        }
        else {
            response.sendStatus(404);
        }
    };

    // Invoked by a POST request to listenPort of /devices/:id
    // If the ID corresponds to an accessory, invokes refreshFromJSON() on that accessory with the POST body content (JSON)
    // Unknown properties in the post body are silently ignored
    // Sends a 200 HTTP response if successful, or a 404 if the ID is not found
    updateAccessoryFromPost(request, response) {
        var id = String(request.params.id);
        this.log("Got update request for device ID %s", id);
        var accessory = this.accessoryMap.get(id);
        if (accessory) {
            accessory.refreshFromJSON(request.body);
            response.sendStatus(200);
        }
        else {
            response.sendStatus(404);
        }
    }
}
