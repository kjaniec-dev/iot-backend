## Iot Backend

This backend is a bridge between iot devices and mobile devices. It connects to mqtt broker for getting iot data, process that data, and provides and API ( express.js and websockets ) to retrieve it in a mobile app.

---
### Basic functionality

Current version of this software realize most basic functionality like:
- subscription to the topic `water_leak/detection`
- parse the data from message with expected fields 
```json
{
    "ts": 1658580471,
    "type": "waterLeakDetection",
    "waterLevel": 0,
    "temperature": 23.1,
    "heatIndex": 21.88
}
```
- save it to a folder `/iot` with a daily file rotation in a workdir of a docker container - it's needed for bucketing implemented in the near future
- generate events based on defined thresholds ( and restored values of events )
```js
const HUMIDITY_THRESHOLD: number = 80;
const WATER_LEVEL_THRESHOLD: number = 0.1;
const TEMPERATURE_THRESHOLD: number = 50;
```
>I assume that **humidity** value exceeded 80% or **water level** exceeded 0.1 or **temperature** above 50 are values to start worrying about
- just like iot data, events are save it to a folder `/iot`
>By events I assume every data exceeded its threshold and a value restored to normal state ( which generates an event too ). Specific event is generated when data are not received by a one minute which is important, because it points that something went wrong
- a websocket for getting most recent one value of water leak data
- an endpoint for getting last 100 events ( thresholds events and restored ones ) 
- an endpoint for getting only current events with threshold exceeded (without restored events)
---
### To do
- first of all - push notifications
- saving iot data and events to someting like AWS S3
- bucketing iot data and events (it would be great to make it for charts on mobile app) - add i.e. TimescaleDB? 
- add another topics to handle like `movement/detection` or maybe `air_quality/monitoring`
---
### How to run
```text
-add `.env` text file in iot_backend and add two envs in it:
MQTT_HOST=mosquitto
MQTT_PORT=10001

npm install
npm run build
docker-compose up -d

-publish some data to mosquitto
docker-compose exec mosquitto mosquitto_pub -h mosquitto -p 10001 -m '{"ts": 1755747585019317, "humidity": 38, "temperature": 31.2, "waterLevel": 1, "heatIndex": 27.8}' -t "water_leak/detection"
```