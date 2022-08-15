import { WaterLeakDetectionData } from "../model/WaterLeakDetectionData";
import { NodeMqttClient } from "../client/mqtt/MqttClient";
import { IotData } from "../model/IotData";
import { waitForSuccess } from "../common/uitls/utilities";
import * as dotenv from "dotenv";
import path from "path";
import { MqttClient } from "mqtt";

const mqttServer = require('mqtt-server');
let nodeMqttClient: NodeMqttClient;
let mqttSrv: any;

const waterLeakData = new WaterLeakDetectionData( {
	ts: Date.now(),
	waterLevel: 0,
	temperature: 23.1,
	humidity: 44.1,
	heatIndex: 19.9
} );

beforeAll( async () => {
	dotenv.config( {
		path: path.resolve( process.cwd(), ".env.test" )
	} );

	mqttSrv = await new Promise( resolve => {
		const server = mqttServer( {
			mqtt: `tcp://localhost:${process.env.MQTT_PORT}`
		}, undefined, ( client: any ) => {
			client.on( "connect", () => {
				console.log( "client connected" );
				client.publish( {
					topic: "water_leak/detection",
					payload: JSON.stringify( waterLeakData )
				} );
			} );
		} );

		server.listen( () => {
			console.log( "Mqtt server listen" );
			resolve( server );
		} )
	} );
} );

afterAll(  ( done ) => {
	mqttSrv.close();
	nodeMqttClient.stop();
	done();
} );

describe( "Mqtt client", () => {
	test( "Should connect and subscribe to mqtt topic message", async () => {
		let data: IotData | undefined;

		nodeMqttClient = await new Promise( ( resolve, reject ) => {
			const mqttClient = new NodeMqttClient();
			mqttClient.start();

			mqttClient.registerListener( ( iotData: IotData ) => {
				data = iotData;
			} );

			const start = Date.now();
			const timer = setInterval( async () => {
				if( mqttClient.isConnected ) {
					clearInterval( timer );
					resolve( mqttClient );
				}
				if( Date.now() - start > 3000 ) {
					clearInterval( timer );
					reject( new Error( "An error occurred when connect to mqtt" ) );
				}

			}, 10 );
		} );

		waitForSuccess( () => {
			return !!data;
		} );

		expect( data ).toEqual( waterLeakData );
	} );
} );


