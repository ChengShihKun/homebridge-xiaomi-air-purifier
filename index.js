var miio = require('miio');
var Service, Characteristic;

module.exports = function (homebridge) {
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

    this.airPurifierService
        .getCharacteristic(Characteristic.SwingMode)
        .on('get', this.getLED.bind(this))
        .on('set', this.setLED.bind(this));

    this.airPurifierService
        .getCharacteristic(Characteristic.LockPhysicalControls)
        .on('get', this.getBuzzer.bind(this))
        .on('set', this.setBuzzer.bind(this));

    this.services.push(this.airPurifierService);

    this.serviceInfo = new Service.AccessoryInformation();

    this.serviceInfo
        .setCharacteristic(Characteristic.Manufacturer, 'Xiaomi')
        .setCharacteristic(Characteristic.Model, 'Air Purifier')
        .setCharacteristic(Characteristic.SerialNumber, '0799-E5C0-57A641308C0D');;

    this.services.push(this.serviceInfo);

    if (this.showAirQuality) {
        this.airQualitySensorService = new Service.AirQualitySensor('Air Quality Sensor');

        this.airQualitySensorService
            .getCharacteristic(Characteristic.AirQuality)
            .on('get', this.getAirQuality.bind(this));

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

    this.discover();
}

XiaoMiAirPurifier.prototype = {
    discover: function () {
        var accessory = this;

        var device = miio.createDevice({
            address: accessory.address,
            token: accessory.token,
            model: accessory.model
        });
        device.init();
        accessory.device = device;
    },

    getPowerState: function (callback) {
        var state = this.device.power
        if (state) {
            callback(null, Characteristic.Active.ACTIVE);
        } else {
            callback(null, Characteristic.Active.INACTIVE);
        }
        this.log.info('getPowerState:', state);
    },

    setPowerState: function (state, callback) {
        this.log.info('setPowerState:', state);
        this.device.setPower(state === Characteristic.Active.ACTIVE)
            .then((res) => {
                this.log.info('setPowerStateResponse:', res);
                callback();
            });
    },

    getCurrentAirPurifierState: function (callback) {
        var mode = {
            idle: Characteristic.CurrentAirPurifierState.INACTIVE,
            silent: Characteristic.CurrentAirPurifierState.IDLE,
            favorite: Characteristic.CurrentAirPurifierState.PURIFYING_AIR,
            auto: Characteristic.CurrentAirPurifierState.PURIFYING_AIR,
            low: Characteristic.CurrentAirPurifierState.IDLE,
            medium: Characteristic.CurrentAirPurifierState.PURIFYING_AIR,
            high: Characteristic.CurrentAirPurifierState.PURIFYING_AIR,
        };
        var state = mode[this.device.mode];
        this.log.info('CurrentAirPurifierState:', this.device.mode, state);
        callback(null, state);
    },

    getTargetAirPurifierState: function (callback) {
        var mode = {
            idle: Characteristic.TargetAirPurifierState.MANUAL,
            silent: Characteristic.TargetAirPurifierState.MANUAL,
            favorite: Characteristic.TargetAirPurifierState.MANUAL,
            auto: Characteristic.TargetAirPurifierState.AUTO,
            low: Characteristic.TargetAirPurifierState.MANUAL,
            medium: Characteristic.TargetAirPurifierState.MANUAL,
            high: Characteristic.TargetAirPurifierState.MANUAL,
        };
        var state = mode[this.device.mode];
        this.log.info('TargetAirPurifierState:', this.device.mode, state);
        callback(null, state);
    },

    setTargetAirPurifierState: function (state, callback) {
        if (state === Characteristic.TargetAirPurifierState.MANUAL) {
            this.device.setMode('favorite');
        } else if (state === Characteristic.TargetAirPurifierState.AUTO) {
            this.device.setMode('auto');
        }
        callback();
    },

    getCurrentRelativeHumidity: function (callback) {
        callback(null, this.device.humidity);
    },

    getAirQuality: function (callback) {
        var levels = [
            [200, Characteristic.AirQuality.POOR],
            [100, Characteristic.AirQuality.INFERIOR],
            [50, Characteristic.AirQuality.FAIR],
            [20, Characteristic.AirQuality.GOOD],
            [0, Characteristic.AirQuality.EXCELLENT],
        ];

        var quality = Characteristic.AirQuality.UNKNOWN;

        for (var item of levels) {
            if (this.device.aqi >= item[0]) {
                quality = item[1];
                break;
            }
        }

        callback(null, quality);
    },

    getCurrentTemperature: function (callback) {
        callback(null, this.device.temperature);
    },

    setRotationSpeed: function (speed, callback) {
        var level = Math.round(speed / 6.25);
        this.device.setFavoriteLevel(level)
            .then(() => {
                callback();
            })
        this.log.info('setRotationSpeed:', speed);
    },

    getRotationSpeed: function (callback) {
        var level = this.device.favoriteLevel;
        callback(null, Math.round(level * 6.25));
        this.log.info('getRotationSpeed:', level);
    },

    setLED: function (led, callback) {
        this.device.setLed(led === Characteristic.SwingMode.SWING_ENABLED)
            .then((res) => {
                this.log.info('setLED:', res);
                callback();
            });
    },

    getLED: function (callback) {
        var state = this.device.led;
        if (state) {
            callback(null, Characteristic.SwingMode.SWING_ENABLED);
        } else {
            callback(null, Characteristic.SwingMode.SWING_DISABLED);
        }
        this.log.info('getLED:', state);
    },

    setBuzzer: function (buzzer, callback) {
        this.device.setBuzzer(buzzer === Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED)
            .then((res) => {
                this.log.info('setBuzzer:', res);
                callback();
            });
    },

    getBuzzer: function (callback) {
        var state = this.device.buzzer;
        if (state) {
            callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_ENABLED);
        } else {
            callback(null, Characteristic.LockPhysicalControls.CONTROL_LOCK_DISABLED);
        }
        this.log.info('getBuzzer:', state);
    },

    identify: function (callback) {
        callback();
    },

    getServices: function () {
        return this.services;
    }
};
