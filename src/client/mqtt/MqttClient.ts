import * as mqtt from "mqtt";
import { WaterLeakDetectionData } from "../../model/WaterLeakDetectionData";
import { IotData } from "../../model/IotData";
import { EventEmitter } from "events";
import { Listener } from "../../common/Listener";
import { resolveCertificates } from "../../common/uitls/utilities";
import { consoleLogger, fileLogger } from "../../common/logging/loggers";

type MQTT_PROTOCOL = "mqtt" | "mqtts";

type TopicType = "water_leak/detection" | "movement/detection"
const TOPICS: TopicType[] = [ "water_leak/detection", "movement/detection" ];

export const MQTT_DATA_EVENT_NAME = "mqttData";

export class NodeMqttClient implements Listener<IotData> {
    private client: mqtt.MqttClient;
    private clientOptions: mqtt.IClientOptions;
    private connected: boolean = false;
    private mqttIotDataEmitter: EventEmitter;

    constructor() {
        consoleLogger.trace( `Connecting to mqtt` );
        const { client, clientOptions } = NodeMqttClient.connect();
        this.client = client;
        this.clientOptions = clientOptions;
        this.mqttIotDataEmitter = new EventEmitter();
    }

    public start() {
        consoleLogger.info( `Mqtt client method start()` );
        try {
            this.connected = true;

            this.client.on( "connect", () => {
                consoleLogger.trace( "Connected to mqtt" );

                this.client.subscribe( TOPICS, ( err, granted ) => {
                    if( err ) {
                        fileLogger.error( "An error encountered when subscribing to topics", err );
                        consoleLogger.error( "An error encountered when subscribing to topics", err );
                    } else {
                        granted.forEach( grantedItem => {
                            consoleLogger.trace( `Topic ${grantedItem.topic} has been subscribed` );
                        } );
                    }
                } )
            } );

            this.client.on( "error", err => {
                if( err ) {
                    consoleLogger.error( "An error occurred on mqtt stream", err );
                    fileLogger.error( "An error occurred on mqtt stream", err );
                    throw err;
                }
            } );

            this.client.on( "reconnect", () => {
                consoleLogger.trace( `Mqtt reconnect` );
            } )

            this.client.on( "message", ( topic: string, payload: Buffer ) => {
                const content = payload.toString();
                consoleLogger.info( `Topic ${topic} received message ${content}` );
                this.handleMqttMessage( topic, content );
            } );

            this.client.on( "end", () => {
                consoleLogger.trace( `Mqtt client ended connection with a broker` );
            } );

            this.client.on( "disconnect", () => consoleLogger.trace( "Disconnect from mqtt" ) )
            consoleLogger.debug( `Mqtt client start() has been executed` );
        } catch( err: any ) {
            fileLogger.error( `An error occurred when connect to mqtt client`, err.message );
            consoleLogger.error( `An error occurred when connect to mqtt client`, err.message );
            throw err;
        }
    }

    public stop() {
        consoleLogger.debug( `NodeMqttClient stop() has been called` );
        if( this.client ) {
            TOPICS.forEach( topic => {
                consoleLogger.trace( `Unsubscribing topic ${topic}` )
                this.client!.unsubscribe( topic );
            } );

            this.client.end();
        }
        this.connected = false;
    }

    public registerListener( listener: ( data: IotData ) => void ): void {
        this.mqttIotDataEmitter.addListener( MQTT_DATA_EVENT_NAME, listener );
        consoleLogger.debug( `NodeMqttClient registering a listener` );
    }

    public unregisterAllListeners(): void {
        if( this.mqttIotDataEmitter.listenerCount( MQTT_DATA_EVENT_NAME ) > 0 ) {
            consoleLogger.debug( `NodeMqttClient unregistering all listeners to event ${MQTT_DATA_EVENT_NAME}` );
            this.mqttIotDataEmitter.removeAllListeners( MQTT_DATA_EVENT_NAME );
        }
    }

    private static connect(): { client: mqtt.MqttClient, clientOptions: mqtt.IClientOptions} {
        const certsPath = process.env.CERTS_PATH || "/ssl";
        consoleLogger.trace( `Resolving mqtt certificates from path ${certsPath}` );
        const { ca, key, cert } = resolveCertificates( certsPath );

        const clientOptions: mqtt.IClientOptions = {
            host: process.env.MQTT_HOST || "localhost",
            port: process.env.MQTT_PORT ? Number.parseInt( process.env.MQTT_PORT, 10 ) : 1883,
            username: process.env.MQTT_USERNAME,
            password: process.env.MQTT_PASSWORD,
            clientId: process.env.MQTT_CLIENT_ID,
            protocol: process.env.MQTT_PROTOCOL ? process.env.MQTT_PROTOCOL as MQTT_PROTOCOL : "mqtt",
            key,
            cert,
            ca
        };

        consoleLogger.debug( `Connecting to mqtt with clientOptions: ${JSON.stringify( clientOptions )}` )
        const client = mqtt.connect( clientOptions );
        return { client, clientOptions }
    }

    private handleMqttMessage = ( topic: string, message: string ) => {
        let iotData: IotData;

        try {
            const parsedMessage = JSON.parse( message );

            switch( topic ) {
                case "water_leak/detection":
                    iotData = new WaterLeakDetectionData( parsedMessage );
                    break;
                case "movement/detection":
                    consoleLogger.warn( `Topic "${topic}" is unsupported now` );
                    return;
                default:
                    consoleLogger.warn( `Unknown topic ${topic} has been handled` );
                    return;
            }

            consoleLogger.debug( `Emitting value ${iotData}` );
            this.mqttIotDataEmitter.emit( MQTT_DATA_EVENT_NAME, iotData );
        } catch( err: any ) {
            consoleLogger.error( `An error occurred when handling message from mqtt - err: ${err.message}, topic: ${topic}, payload: ${message}` );
            fileLogger.error( `An error occurred when handling message from mqtt - err: ${err.message}, topic: ${topic}, payload: ${message}` );
        }
    }

    public get isConnected() {
        return this.connected;
    }
}
