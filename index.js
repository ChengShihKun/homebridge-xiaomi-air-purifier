const miio = require('miio');
let Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory('homebridge-xiaomi-air-purifier', 'XiaoMiAirPurifier', XiaoMiAirPurifier);
}

function XiaoMiAirPurifier(log, config) {
    this.log = log;
    this.name = config.name || 'Air Purifier';
    this.showAirQuality = config.showAirQuality || false;
    this.showTemperature = config.showTemperature || false;
    this.showHumidity = config.showTemperature || false;
    this.address = config.address;
    this.token = config.token;
    this.model = config.model;

    this.services = [];

    this.airPurifierService = new Service.AirPurifier(this.name);

    this.airPurifierService
        .getCharacteristic(Characteristic.Active)
        .on('get', this.getPowerState.bind(this))
        .on('set', this.setPowerState.bind(this));

    this.airPurifierService
        .getCharacteristic(Characteristic.CurrentAirPurifierState)
        .on('get', this.getCurrentAirPurifierState.bind(this));

    this.airPurifierService
        .getCharacteristic(Characteristic.TargetAirPurifierState)
        .on('get', this.getTargetAirPurifierState.bind(this))
        .on('set', this.setTargetAirPurifierState.bind(this));

    this.airPurifierService
        .getCharacteristic(Characteristic.RotationSpeed)
        .on('get', this.getRotationSpeed.bind(this))
        .on('set', this.setRotationSpeed.bind(this));

    this.services.push(this.airPurifierService);

    this.serviceInfo = new Service.AccessoryInformation();

    this.serviceInfo
        .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
        .setCharacteristic(Characteristic.Model, 'Air Purifier')
        .setCharacteristic(Characteristic.SerialNumber, 'UNKNOWN');;

    this.services.push(this.serviceInfo);

    this.lightBulbService = new Service.Lightbulb(this.name + " LED");

    this.lightBulbService
        .getCharacteristic(Characteristic.On)
        .on('get', this.getLED.bind(this))
        .on('set', this.setLED.bind(this));

    this.lightBulbService
        .getCharacteristic(Characteristic.Brightness)
        .on('get', this.getLEDBrightness.bind(this))
        .on('set', this.setLEDBrightness.bind(this));

    this.services.push(this.lightBulbService);

    if (this.showAirQuality) {
        this.airQualitySensorService = new Service.AirQualitySensor('Air Quality Sensor');

        this.airQualitySensorService
            .getCharacteristic(Characteristic.AirQuality)
            .on('get', this.getAirQuality.bind(this));

        this.airQualitySensorService
            .getCharacteristic(Characteristic.PM2_5Density)
            .on('get', this.getPM2_5Density.bind(this));

        this.services.push(this.airQualitySensorService);
    }

    if (this.showTemperature) {
        this.temperatureSensorService = new Service.TemperatureSensor('Temperature');

        this.temperatureSensorService
            .getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperature.bind(this));

        this.services.push(this.temperatureSensorService);
    }

    if (this.showHumidity) {
        this.humiditySensorService = new Service.HumiditySensor('Humidity');

        this.humiditySensorService
            .getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.getCurrentRelativeHumidity.bind(this));

        this.services.push(this.humiditySensorService);
    }

    this.init();
}

XiaoMiAirPurifier.prototype = {
    init: async function() {
        this.device = await miio.device({
            address: this.address,
            token: this.token,
            model: this.model
        });
    },

    getPowerState: async function(callback) {
        const state = await this.device.power() ? Characteristic.Active.ACTIVE : Characteristic.Active.INACTIVE;
        callback(null, state);
        this.log.info('getPowerState:', state);
    },

    setPowerState: async function(state, callback) {
        this.log.info('setPowerState:', state);
        const res = await this.device.setPower(state === Characteristic.Active.ACTIVE);
        callback();
        this.log.info('setPowerStateResponse:', res);
    },

    getCurrentAirPurifierState: async function(callback) {
        const modeList = {
            idle: Characteristic.CurrentAirPurifierState.INACTIVE,
            silent: Characteristic.CurrentAirPurifierState.IDLE,
            favorite: Characteristic.CurrentAirPurifierState.PURIFYING_AIR,
            auto: Characteristic.CurrentAirPurifierState.PURIFYING_AIR,
            low: Characteristic.CurrentAirPurifierState.IDLE,
            medium: Characteristic.CurrentAirPurifierState.PURIFYING_AIR,
            high: Characteristic.CurrentAirPurifierState.PURIFYING_AIR,
        };
        const mode = await this.device.mode();
        const state = modeList[mode];
        this.log.info('CurrentAirPurifierState:', mode, state);
        callback(null, state);
    },

    getTargetAirPurifierState: async function(callback) {
        const modeList = {
            idle: Characteristic.TargetAirPurifierState.MANUAL,
            silent: Characteristic.TargetAirPurifierState.MANUAL,
            favorite: Characteristic.TargetAirPurifierState.MANUAL,
            auto: Characteristic.TargetAirPurifierState.AUTO,
            low: Characteristic.TargetAirPurifierState.MANUAL,
            medium: Characteristic.TargetAirPurifierState.MANUAL,
            high: Characteristic.TargetAirPurifierState.MANUAL,
        };
        const mode = await this.device.mode();
        const state = modeList[mode];
        this.log.info('TargetAirPurifierState:', mode, state);
        callback(null, state);
    },

    setTargetAirPurifierState: async function(state, callback) {
        if (state === Characteristic.TargetAirPurifierState.MANUAL) {
            await this.device.setMode('favorite');
        } else if (state === Characteristic.TargetAirPurifierState.AUTO) {
            await this.device.setMode('auto');
        }
        callback();
    },

    getCurrentRelativeHumidity: async function(callback) {
        const humidity = await this.device.relativeHumidity();
        callback(null, humidity);
    },

    getAirQuality: async function(callback) {
        const levels = [
            [200, Characteristic.AirQuality.POOR],
            [100, Characteristic.AirQuality.INFERIOR],
            [50, Characteristic.AirQuality.FAIR],
            [20, Characteristic.AirQuality.GOOD],
            [0, Characteristic.AirQuality.EXCELLENT],
        ];

        let quality = Characteristic.AirQuality.UNKNOWN;
        const aqi = await this.device.pm2_5();
        for (let item of levels) {
            if (aqi >= item[0]) {
                quality = item[1];
                break;
            }
        }

        callback(null, quality);
        this.log.info('getAirQuality:', quality);
    },

    getPM2_5Density: async function(callback) {
        const aqi = await this.device.pm2_5();
        callback(null, aqi);
        this.log.info('getPM2_5Density:', aqi);
    },

    getCurrentTemperature: async function(callback) {
        const temperature = await this.device.temperature();
        const celsius = temperature.celsius;
        callback(null, celsius);
        this.log.info('getCurrentTemperature:', celsius);
    },

    setRotationSpeed: async function(speed, callback) {
        const level = Math.round(speed / 6.25);
        await this.device.setFavoriteLevel(level);
        callback();
        this.log.info('setRotationSpeed:', speed);
    },

    getRotationSpeed: async function(callback) {
        const level = await this.device.favoriteLevel();
        const speed = Math.round(level * 6.25);
        callback(null, speed);
        this.log.info('getRotationSpeed:', speed);
    },

    setLED: async function(state, callback) {
        await this.device.led(state);
        callback();
        this.log.info('setLED:', state);
    },

    getLED: async function(callback) {
        const state = await this.device.led();
        callback(null, state);
        this.log.info('getLED:', state);
    },

    setLEDBrightness: async function(brightness, callback) {
        const levels = [
            [70, 'bright'],
            [40, 'dim'],
            [0, 'off'],
        ];

        for (let item of levels) {
            if (brightness >= item[0]) {
                const level = item[1];
                await this.device.ledBrightness(level)
                this.log.info('setLEDBrightness:', level);
                callback();
                return;
            }
        }
    },

    getLEDBrightness: async function(callback) {
        const level = await this.device.ledBrightness();
        const levels = {
            'bright': 70,
            'dim': 40,
            'off': 0,
        };
        const state = levels[level];
        callback(null, state);
        this.log.info('getLEDBrightness:', state);
    },

    identify: function(callback) {
        callback();
    },

    getServices: function() {
        return this.services;
    }
};
