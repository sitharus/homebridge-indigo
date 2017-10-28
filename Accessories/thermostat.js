const IndigoAccessory = require('./accessory').IndigoAccessory;
//
// Indigo Thermostat Accessory
//
// platform: the HomeKit platform
// deviceURL: the path of the RESTful call for this device, relative to the base URL in the configuration, starting with a /
// json: the json that describes this device
//
class IndigoThermostatAccessory extends IndigoAccessory {
    constructor(services, platform, deviceURL, json, thermostatsInCelsius) {
        super(services, platform, services.Service.Thermostat, deviceURL, json);

        this.thermostatsInCelsius = thermostatsInCelsius;

        this.temperatureDisplayUnits = (thermostatsInCelsius) ?
            this.characteristic.TemperatureDisplayUnits.CELSIUS :
            this.characteristic.TemperatureDisplayUnits.FAHRENHEIT;

        this.service.getCharacteristic(this.characteristic.CurrentHeatingCoolingState)
            .on('get', this.getCurrentHeatingCooling.bind(this));

        this.service.getCharacteristic(this.characteristic.TargetHeatingCoolingState)
            .on('get', this.getTargetHeatingCooling.bind(this))
            .on('set', this.setTargetHeatingCooling.bind(this));

        this.service.getCharacteristic(this.characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this));

        this.service.getCharacteristic(this.characteristic.TargetTemperature)
            .on('get', this.getTargetTemperature.bind(this))
            .on('set', this.setTargetTemperature.bind(this));

        this.service.getCharacteristic(this.characteristic.TemperatureDisplayUnits)
            .on('get', this.getTemperatureDisplayUnits.bind(this))
            .on('set', this.setTemperatureDisplayUnits.bind(this));

        this.service.getCharacteristic(this.characteristic.CoolingThresholdTemperature)
            .on('get', this.getCoolingThresholdTemperature.bind(this))
            .on('set', this.setCoolingThresholdTemperature.bind(this));

        this.service.getCharacteristic(this.characteristic.HeatingThresholdTemperature)
            .on('get', this.getHeatingThresholdTemperature.bind(this))
            .on('set', this.setHeatingThresholdTemperature.bind(this));

        if (this.displayHumidityInRemoteUI) {
            this.service.getCharacteristic(this.characteristic.CurrentRelativeHumidity)
                .on('get', this.getCurrentRelativeHumidity.bind(this));
        }
    }

    // Determine the current heating/cooling state
    // returns one of this.characteristic.CurrentHeatingCoolingState.{OFF,HEAT,COOL}
    determineCurrentHeatingCoolingState() {
        var mode = this.characteristic.CurrentHeatingCoolingState.OFF;
        if (this.hvacHeaterIsOn) {
            mode = this.characteristic.CurrentHeatingCoolingState.HEAT;
        } else if (this.hvacCoolerIsOn) {
            mode = this.characteristic.CurrentHeatingCoolingState.COOL;
        }
        return mode;
    };

    // Determine the target heating/cooling state
    // returns one of this.characteristic.TargetHeatingCoolingState.{OFF,HEAT,COOL,AUTO}
    determineTargetHeatingCoolingState() {
        var mode = this.characteristic.TargetHeatingCoolingState.OFF;
        if (this.hvacOperationModeIsHeat || this.hvacOperationModeIsProgramHeat) {
            mode = this.characteristic.TargetHeatingCoolingState.HEAT;
        } else if (this.hvacOperationModeIsCool || this.hvacOperationModeIsProgramCool) {
            mode = this.characteristic.TargetHeatingCoolingState.COOL;
        } else if (this.hvacOperationModeIsAuto || this.hvacOperationModeIsProgramAuto) {
            mode = this.characteristic.TargetHeatingCoolingState.AUTO;
        }
        return mode;
    };

    // Get the current heating/cooling state of the accessory
    // callback: invokes callback(error, mode)
    //           error: error message or undefined if no error
    //           mode: one of this.characteristic.CurrentHeatingCoolingState.{OFF,HEAT,COOL}
    getCurrentHeatingCooling(callback) {
        if (this.typeSupportsHVAC || this.typeIsHVAC) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var mode = this.determineCurrentHeatingCoolingState();
                        this.log("%s: getCurrentHeatingCooling() => %s", this.name, mode);
                        if (callback) {
                            callback(undefined, mode);
                        }
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support HVAC");
        }
    };

    // Get the target heating/cooling state of the accessory
    // callback: invokes callback(error, mode)
    //           error: error message or undefined if no error
    //           mode: one of this.characteristic.TargetHeatingCoolingState.{OFF,HEAT,COOL,AUTO}
    getTargetHeatingCooling(callback) {
        if (this.typeSupportsHVAC || this.typeIsHVAC) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var mode = this.determineTargetHeatingCoolingState();
                        this.log("%s: getTargetHeatingCooling() => %s", this.name, mode);
                        if (callback) {
                            callback(undefined, mode);
                        }
                    }
                }
            );
        } else if (callback) {
            callback("Accessory does not support HVAC");
        }
    };

    // Set the target heating/cooling state of the accessory
    // mode: one of this.characteristic.TargetHeatingCoolingState.{OFF,HEAT,COOL,AUTO}
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setTargetHeatingCooling(mode, callback, context) {
        this.log("%s: setTargetHeatingCooling(%s)", this.name, mode);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        } else if (this.typeSupportsHVAC || this.typeIsHVAC) {
            var qs;
            if (mode == this.characteristic.TargetHeatingCoolingState.OFF) {
                qs = { hvacOperationModeIsOff: "true" };
            }
            else if (mode == this.characteristic.TargetHeatingCoolingState.HEAT) {
                qs = { hvacOperationModeIsHeat: "true" };
            }
            else if (mode == this.characteristic.TargetHeatingCoolingState.COOL) {
                qs = { hvacOperationModeIsCool: "true" };
            }
            else if (mode == this.characteristic.TargetHeatingCoolingState.AUTO) {
                qs = { hvacOperationModeIsAuto: "true" };
            }

            if (qs) {
                this.updateStatus(qs, callback);
            } else if (callback) {
                callback("Unknown target heating/cooling state");
            }
        }
        else if (callback) {
            callback("Accessory does not support HVAC");
        }
    };

    // Note: HomeKit wants all temperature values in celsius, so convert if needed

    // Converts a celsius temperature into Indigo's units (F or C, depending on setting)
    // temperature: temperature in degrees celsius
    // returns: temperature in Indigo's units
    celsiusToIndigoTemp(temperature) {
        if (this.thermostatsInCelsius) {
            return (temperature);
        } else {
            return (Math.round(((temperature * 9.0 / 5.0) + 32.0) * 10.0) / 10.0);
        }
    }

    // Converts a temperature in Indigo's units (F or C, depending on setting) into celsius
    // temperature: temperature in Indigo's units
    // returns: temperature in degrees celsius
    indigoTempToCelsius(temperature) {
        if (this.thermostatsInCelsius) {
            return (temperature);
        } else {
            return (Math.round(((temperature - 32.0) * 5.0 / 9.0) * 10.0) / 10.0);
        }
    }

    // Invokes the Indigo RESTful API to get a temperature value
    // key: the Indigo RESTful API response JSON key of the temperature value
    // callback: invokes callback(error, temperature)
    //           error: error message or undefined if no error
    //           temperature: the temperature in degrees celsius
    getTemperatureValue(key, callback) {
        if (this.typeSupportsHVAC || this.typeIsHVAC) {
            this.query(key,
                (error, temperature) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var t = this.indigoTempToCelsius(temperature);
                        this.log("%s: getTemperatureValue(%s) => %s", this.name, key, t);
                        if (callback) {
                            callback(undefined, t);
                        }
                    }
                }
            );
        }
        else if (callback) {
            callback("Accessory does not support HVAC");
        }
    };

    // Invokes the Indigo RESTful API to update a temperature value
    // key: the Indigo RESTful API JSON key of the temperature value to update
    // temperature: the temperature in degrees celsius
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setTemperatureValue(key, temperature, callback, context) {
        this.log("%s: setTemperatureValue(%s, %s)", this.name, key, temperature);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        }
        else if (this.typeSupportsHVAC || this.typeIsHVAC) {
            var qs = {};
            qs[key] = this.celsiusToIndigoTemp(temperature);
            this.updateStatus(qs, callback);
        }
        else if (callback) {
            callback("Accessory does not support HVAC");
        }
    };


    // Get the current temperature of the accessory
    // callback: invokes callback(error, temperature)
    //           error: error message or undefined if no error
    //           temperature: the temperature in degrees celsius
    getCurrentTemperature(callback) {
        this.getTemperatureValue("inputTemperatureVals", callback);
    };

    // Determine the target temperature of the accessory
    // If the thermostat is in heating mode, returns the heat setpoint in degrees celsius
    // If the thermostat is in cooling mode, returns the cool setpoint in degrees celsius
    // Otherwise, returns the average of the heat and cool setpoints in degrees celsius
    determineTargetTemperature() {
        var temperature;
        if (this.hvacOperationModeIsHeat || this.hvacOperationModeIsProgramHeat) {
            temperature = this.setpointHeat;
        }
        else if (this.hvacOperationModeIsCool || this.hvacOperationModeIsProgramCool) {
            temperature = this.setpointCool;
        }
        else {
            temperature = (this.setpointHeat + this.setpointCool) / 2.0;
        }
        return this.indigoTempToCelsius(temperature);
    }

    // Get the target temperature of the accessory
    // If the thermostat is in heating mode, it uses the heat setpoint
    // If the thermostat is in cooling mode, it uses the cool setpoint
    // Otherwise, it uses the average of the heat and cool setpoints
    // callback: invokes callback(error, temperature)
    //           error: error message or undefined if no error
    //           temperature: the temperature in degrees celsius
    getTargetTemperature(callback) {
        if (this.typeSupportsHVAC || this.typeIsHVAC) {
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var t = this.determineTargetTemperature();
                        this.log("%s: getTargetTemperature() => %s", this.name, t);
                        if (callback) {
                            callback(undefined, t);
                        }
                    }
                }
            );
        }
        else if (callback) {
            callback("Accessory does not support HVAC");
        }
    };

    // Set the target temperature of the accessory
    // If the thermostat is in heating mode, it sets the heat setpoint
    // If the thermostat is in cooling mode, it sets the cool setpoint
    // Otherwise, it sets the heat setpoint to 2 degrees celsius (5 degrees fahrenheit) below the target temperature,
    // and sets the cool setpoint to 2 degrees celsius (5 degrees fahrenheit) above the target temperature
    // temperature: the temperature in degrees celsius
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setTargetTemperature(temperature, callback, context) {
        this.log("%s: setTargetTemperature(%s)", this.name, temperature);
        if (context == IndigoAccessory.REFRESH_CONTEXT) {
            if (callback) {
                callback();
            }
        }
        else if (this.typeSupportsHVAC || this.typeIsHVAC) {
            var t = this.celsiusToIndigoTemp(temperature);
            this.getStatus(
                (error) => {
                    if (error) {
                        if (callback) {
                            callback(error);
                        }
                    } else {
                        var qs;
                        if (this.hvacOperationModeIsHeat) {
                            qs = { setpointHeat: t };
                        }
                        else if (this.hvacOperationModeIsCool) {
                            qs = { setpointCool: t };
                        }
                        else {
                            var adjust = (this.thermostatsInCelsius) ? 2 : 5;
                            qs = { setpointCool: t + adjust, setpointHeat: t - adjust };
                        }
                        this.updateStatus(qs, callback);
                    }
                }
            );
        }
        else if (callback) {
            callback("Accessory does not support HVAC");
        }
    };

    // Get the temperature display units of the accessory
    // callback: invokes callback(error, units)
    //           error: error message or undefined if no error
    //           units: the temperature display units - one of TemperatureDisplayUnits.{CELSIUS,FAHRENHEIT}
    getTemperatureDisplayUnits(callback) {
        this.log("%s: getTemperatureDisplayUnits() => %s", this.name, this.temperatureDisplayUnits);
        if (callback) {
            callback(undefined, this.temperatureDisplayUnits);
        }
    };

    // Set the temperature display units of the accessory
    // units: the temperature display units - one of TemperatureDisplayUnits.{CELSIUS,FAHRENHEIT}
    // callback: invokes callback(error), error is undefined if no error occurred
    setTemperatureDisplayUnits(units, callback) {
        this.log("%s: setTemperatureDisplayUnits(%s)", this.name, units);
        this.temperatureDisplayUnits = units;
        if (callback) {
            callback();
        }
    };

    // Get the cooling threshold temperature of the accessory
    // callback: invokes callback(error, temperature)
    //           error: error message or undefined if no error
    //           temperature: the temperature in degrees celsius
    getCoolingThresholdTemperature(callback) {
        this.getTemperatureValue("setpointCool", callback);
    };

    // Set the cooling threshold temperature of the accessory
    // temperature: the temperature in degrees celsius
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setCoolingThresholdTemperature(temperature, callback, context) {
        this.setTemperatureValue("setpointCool", temperature, callback, context);
    };

    // Get the heating threshold temperature of the accessory
    // callback: invokes callback(error, temperature)
    //           error: error message or undefined if no error
    //           temperature: the temperature in degrees celsius
    getHeatingThresholdTemperature(callback) {
        this.getTemperatureValue("setpointHeat", callback);
    };

    // Set the heating threshold temperature of the accessory
    // temperature: the temperature in degrees celsius
    // callback: invokes callback(error), error is undefined if no error occurred
    // context: if equal to IndigoAccessory.REFRESH_CONTEXT, will not call the Indigo RESTful API to update the device, otherwise will
    setHeatingThresholdTemperature(temperature, callback, context) {
        this.setTemperatureValue("setpointHeat", temperature, callback, context);
    };

    // Get the current relative humidity of the accessory
    // callback: invokes callback(error, relativeHumidity)
    //           error: error message or undefined if no error
    //           relativeHumidity: the relative humidity
    getCurrentRelativeHumidity(callback) {
        if (this.displayHumidityInRemoteUI) {
            this.query("inputHumidityVals", callback);
        } else if (callback) {
            callback("Accessory does not support relative humidity");
        }
    };

    // Update HomeKit state to match state of Indigo's inputTemperatureVals property
    // inputTemperatureVals: new value of inputTemperatureVals property
    update_inputTemperatureVals(inputTemperatureVals) {
        this.service.getCharacteristic(this.characteristic.CurrentTemperature)
            .setValue(this.indigoTempToCelsius(inputTemperatureVals), undefined, IndigoAccessory.REFRESH_CONTEXT);
    };


    // Update HomeKit state to match state of Indigo's setpointCool property
    // setpointCool: new value of setpointCool property
    update_setpointCool(setpointCool) {
        this.service.getCharacteristic(this.characteristic.CoolingThresholdTemperature)
            .setValue(this.indigoTempToCelsius(setpointCool), undefined, IndigoAccessory.REFRESH_CONTEXT);
        this.service.getCharacteristic(this.characteristic.TargetTemperature)
            .setValue(this.determineTargetTemperature(), undefined, IndigoAccessory.REFRESH_CONTEXT);
    };

    // Update HomeKit state to match state of Indigo's setpointHeat property
    // setpointHeat: new value of setpointHeat property
    update_setpointHeat(setpointHeat) {
        this.service.getCharacteristic(this.characteristic.HeatingThresholdTemperature)
            .setValue(this.indigoTempToCelsius(setpointHeat), undefined, IndigoAccessory.REFRESH_CONTEXT);
        this.service.getCharacteristic(this.characteristic.TargetTemperature)
            .setValue(this.determineTargetTemperature(), undefined, IndigoAccessory.REFRESH_CONTEXT);
    };

    // Update HomeKit state to match state of Indigo's inputHumidityVals property
    // inputHumidityVals: new value of inputHumidityVals property
    update_inputHumidityVals(inputHumidityVals) {
        this.service.getCharacteristic(this.characteristic.CurrentRelativeHumidity)
            .setValue(inputHumidityVals, undefined, IndigoAccessory.REFRESH_CONTEXT);
    };


    // Update HomeKit state to match state of Indigo's hvacHeaterIsOn/hvacCoolerIsOn property
    // prop: new value of property
    update_hvacHeaterIsOn(prop) { return this.update_hvacIsOn(prop) }
    update_hvacCoolerIsOn(prop) { return this.update_hvacIsOn(prop) }
    update_hvacIsOn(prop) {
        this.service.getCharacteristic(this.characteristic.CurrentHeatingCoolingState)
            .setValue(this.determineCurrentHeatingCoolingState(), undefined, IndigoAccessory.REFRESH_CONTEXT);
    }

    // Update HomeKit state to match state of Indigo's hvacOperationModeIsHeat/hvacOperationModeIsProgramHeat
    // hvacOperationModeIsCool/hvacOperationModeIsProgramCool/hvacOperationModeIsAuto/hvacOperationModeIsProgramAuto property
    // prop: new value of property
    update_hvacOperationModeIsHeat(prop) { return this.update_hvacOperationMode(prop); }
    update_hvacOperationModeIsProgramHeat(prop) { return this.update_hvacOperationMode(prop); }
    update_hvacOperationModeIsCool(prop) { return this.update_hvacOperationMode(prop); }
    update_hvacOperationModeIsProgramCool(prop) { return this.update_hvacOperationMode(prop); }
    update_hvacOperationModeIsAuto(prop) { return this.update_hvacOperationMode(prop); }
    update_hvacOperationModeIsProgramAuto(prop) { return this.update_hvacOperationMode(prop); }

    update_hvacOperationMode(prop) {
        this.service.getCharacteristic(this.characteristic.TargetHeatingCoolingState)
            .setValue(this.determineTargetHeatingCoolingState(), undefined, IndigoAccessory.REFRESH_CONTEXT);
        this.service.getCharacteristic(this.characteristic.TargetTemperature)
            .setValue(this.determineTargetTemperature(), undefined, IndigoAccessory.REFRESH_CONTEXT);
    };
}