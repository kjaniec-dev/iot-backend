import { NodeMqttClient } from "./client/mqtt/MqttClient";
import { IotDataService } from "./services/data/IotDataService";
import { LastValueService } from "./services/data/last_value/LastValueService";
import { EventsService } from "./services/events/EventsService";
import { IotServer } from "./server/IotServer";
import { IotData } from "./model/IotData";
import { consoleLogger } from "./common/logging/loggers";

export class Application {

    private iotDataService: IotDataService;
    private eventsService: EventsService;
    private nodeMqttClient: NodeMqttClient;
    private server: IotServer;
    private lastValueService: LastValueService;

    public constructor( iotDataService: IotDataService, eventsService: EventsService, lastValueService: LastValueService )  {
        this.eventsService = eventsService;
        this.lastValueService = lastValueService;
        this.iotDataService = iotDataService;
        this.nodeMqttClient = new NodeMqttClient();

        this.server = new IotServer( eventsService, lastValueService );

        consoleLogger.debug( `Register listener on events to node mqtt client - iotDataService onReceive` );
        this.nodeMqttClient.registerListener( ( data: IotData ) => this.iotDataService.onReceive( data ) );

        consoleLogger.debug( `Register listener on events to iotDataService - last value service onReceive` );
        this.iotDataService.registerListener( ( data: IotData ) => this.lastValueService.onReceive( data ) );
        consoleLogger.debug( `Register listener on events to iotDataService - events service onReceive` );
        this.iotDataService.registerListener( ( data: IotData ) => this.eventsService.onReceive( data ) );
    }

    public start() {
        consoleLogger.info( `Starting application` );
        this.nodeMqttClient.start();
    }

    public stop() {
        consoleLogger.info( `Stopping application` );
        this.nodeMqttClient.unregisterAllListeners();
        this.iotDataService.unregisterAllListeners();

        consoleLogger.info( `Stopping EventsService` );
        this.eventsService.stop();

        if( this.nodeMqttClient.isConnected ) {
            consoleLogger.debug( `Stopping node mqtt client` );
            this.nodeMqttClient.stop();
        }
        this.server.stop();
    }
}