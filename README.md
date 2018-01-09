# homebridge-xiaomi-air-purifier

This project is forked from [homebridge-mi-air-purifier](https://github.com/seikan/homebridge-mi-air-purifier).

This is Xiaomi Mi Air Purifier plugin for [Homebridge](https://github.com/nfarina/homebridge). Since Apple Homekit doesn't support air purifier on iOS 10, you need to upgrade your iOS devices to iOS 11 or above.

![mi-air-purifier](https://cloud.githubusercontent.com/assets/73107/26249685/1d0ae78c-3cda-11e7-8b64-71e8d4323a3e.jpg)

### Features

- Switch on / off.
- Control modes:
  - Auto: Auto Mode on Mi Air Purifier.
  - Manual: Favourite Mode on Mi Air Purifier.
- Change Favourite Mode speed.
- Switch LED (swing) / buzzer (Lock physical controls)
- Display temperature.
- Display humidity.
- Display air quality.

### Installation

1. Install required packages.

   ```
   npm install -g homebridge-xiaomi-air-purifier miio
   ```

2. Add following accessory to the `config.json`.

   ```
     "accessories": [
       {
         "accessory": "XiaoMiAirPurifier",
         "name": "Air Purifier",
         "showTemperature": true,
         "showHumidity": true,
         "showAirQuality": true,
         "address": "10.0.0.2",
         "token": "a829f4cd88765425ce1ca8eb2cfed74f",
         "model": "zhimi.airpurifier.m1"
       }
     ]
   ```

   Use `miio --discover` to find out all mi devices, with their address, identifiers, models and tokens. Visit [this website](https://github.com/aholstenson/miio/blob/master/docs/missing-devices.md) for more information.

3. Restart Homebridge, and your Mi air purifier will be discovered automatically.

### Known Issues

- Stuck on 'turning off' after turn off the air purifier. It seem to be a bug of homebridge.

### License

See the [LICENSE](https://github.com/seikan/homebridge-mi-air-purifier/blob/master/LICENSE.md) file for license rights and limitations (MIT).
