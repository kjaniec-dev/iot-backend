import { IotData } from "../../model/IotData";
import { LimitedArrayCache } from "../../common/LimitedArrayCache";
import { EventType, IotDataEvent, onlyThresholdEventTypes, thresholdAndRestorationEventTypes } from "../../model/IotDataEvent";
import { formatDate } from "../../common/uitls/utilities";
import { IotFileDataLoader } from "../../common/IotFileDataLoader";
import { WaterLeakDetectionData } from "../../model/WaterLeakDetectionData";
import { LastOccurredWorker } from "../../common/LastOccurredWorker";
import { Receiver } from "../../common/Receiver";
import { EventEmitter } from "events";
import { consoleLogger, fileLogger } from "../../common/logging/loggers";
import { Listener } from "../../common/Listener";

const ONE_MINUTE_IN_MS = 60 * 1000;
const EVENTS_FILENAME = "events";
export const EVENTS_EMITTED_EVENT_NAME = "events";

export class EventsService extends IotFileDataLoader implements Receiver<IotData>, Listener<IotDataEvent> {

	private iotDataEventEmitter: EventEmitter;
	private eventItems: LimitedArrayCache<IotDataEvent>;
	private currentEvents: Map<EventType, IotDataEvent> = new Map<EventType, IotDataEvent>();
	private temporaryEventsData: IotDataEvent[] = [];
	private lastOccurredWaterLeakDataWorker: LastOccurredWorker;

	constructor() {
		super();
		this.iotDataEventEmitter = new EventEmitter();
		this.eventItems = new LimitedArrayCache<IotDataEvent>( 100 );

		this.onLoad( [ EVENTS_FILENAME ], this.resolveEventsFromFileContent, async () => {
			this.eventItems.add( ...this.temporaryEventsData );
			this.temporaryEventsData = [];
			return;
		} ).then().catch( err => {
			consoleLogger.error( `An error occurred when load last events data from file`, err );
			fileLogger.error( `An error occurred when load last events data from file`, err );
		} );

		this.lastOccurredWaterLeakDataWorker = new LastOccurredWorker( ONE_MINUTE_IN_MS, async ( ts: number ) => {
			const eventType: EventType = "noDataReceivedEvent";
			consoleLogger.debug( `EventsService - lastOccurredWaterLeakDataWorker - check for event - ${eventType}` )
			const waterLeakDetection = new WaterLeakDetectionData( { ts } );
			const event = new IotDataEvent( eventType, waterLeakDetection );

			this.currentEvents.set( eventType, event );
			await this.saveEvents( [ event ] );
		} );
	}

	public async onReceive( iotData: IotData ) {
		consoleLogger.debug( `EventsService - onReceive()` )
		await this.processEventsFromIotData( iotData ).catch( err => {
			consoleLogger.error( `An error occurred when receiving iot data in events service - message: ${err.message}` );
		} );
	}

	public getEvents(): IotDataEvent[] {
		return this.eventItems.getItems();
	}

	public getCurrentEvents(): IotDataEvent[] {
		return Array.from( this.currentEvents.values() );
	}

	public registerListener( listener: ( iotData: IotDataEvent ) => void ) {
		consoleLogger.debug( `Registering a new listener to EventsService emitter on event 'iotDataEvent'` );
		this.iotDataEventEmitter.addListener( EVENTS_EMITTED_EVENT_NAME, listener );
	}

	public unregisterAllListeners(): void {
		if( this.iotDataEventEmitter.listenerCount( "iotData" ) > 0 ) {
			consoleLogger.debug( `EventsService unregistering all listeners to event 'iotData'` );
			this.iotDataEventEmitter.removeAllListeners( EVENTS_EMITTED_EVENT_NAME );
		}
	}

	private async processEventsFromIotData( iotData: IotData ) {
		consoleLogger.debug( `EventsService - processEventsFromIotData()` )
		this.lastOccurredWaterLeakDataWorker.reset();

		switch( iotData.type ) {
			case "waterLeakDetection":
				await this.handleWaterLeakEvents( iotData as WaterLeakDetectionData );
				break;
			case "movementDetection":
			default:
				break;
		}
	}

	private resolveEventsFromFileContent = async ( suffix: string, lines: string[] ) => {
		consoleLogger.debug( `EventsService - resolveEventsFromFileContent()` )
		const events: IotDataEvent[] = lines.reduce( ( acc: IotDataEvent[], line: string ) => {
			if( !line || line.length === 0 ) {
				return acc;
			}

			const parsedLine = JSON.parse( line );
			return acc.concat( new IotDataEvent( parsedLine.type, parsedLine.data ) );
		}, [] );


		this.eventItems.add( ...events );
	}

	private async saveEvents( events: IotDataEvent[] ) {
		consoleLogger.debug( `EventsService - saving to in-memory collections` );
		if( this.loading ) {
			this.temporaryEventsData.push( ...events );
		} else {
			this.eventItems.add( ...events );
		}

		try {
			const eventsFileName = `${formatDate( new Date() )}-${EVENTS_FILENAME}`;
			consoleLogger.debug( `EventsService - saving events to file with name ${eventsFileName}` )
			const fileLines = events.map( event => JSON.stringify( event ) ).join( "\n" );
			await this.fileStorage.appendFile( eventsFileName, fileLines );
		} catch( err: any ) {
			consoleLogger.error( `And error occurred when saving events`, err );
			fileLogger.error( `And error occurred when saving events`, err );
		}
	}

	private async handleWaterLeakEvents( iotData: WaterLeakDetectionData ): Promise<void> {
		consoleLogger.debug( `EventsService - handleWaterLeakEvents, data ${JSON.stringify( iotData )}` )
		const waterLevelEvent = this.handleSingleThresholdOrRestoredEvent( "highWaterLevelEvent", iotData );
		const humidityEvent = this.handleSingleThresholdOrRestoredEvent( "highHumidityEvent", iotData );
		const temperatureEvent = this.handleSingleThresholdOrRestoredEvent( "highTemperatureEvent", iotData );
		const dataReceivedEvent = this.handleSingleThresholdOrRestoredEvent( "noDataReceivedEvent", iotData );

		const events: IotDataEvent[] = [ waterLevelEvent, humidityEvent, temperatureEvent, dataReceivedEvent ].filter( ev => ev !== undefined ) as IotDataEvent[];

		consoleLogger.debug( `EventsService waterLeakEvents ${JSON.stringify( events )}` )

		this.currentEvents.forEach( ( event ) => {
			consoleLogger.debug( `EventsService - emitting event ${JSON.stringify( event )}` )
			this.iotDataEventEmitter.emit( EVENTS_EMITTED_EVENT_NAME, event );
		} )

		if( events.length ) {
			consoleLogger.debug( `Events service - saving events in-memory and to file` );
			await this.saveEvents( events );
		}
	}

	private handleSingleThresholdOrRestoredEvent( eventThresholdName: EventType, iotData: IotData ): IotDataEvent | undefined {
		consoleLogger.debug( `EventsService handleSingleThresholdOrRestoredEvent(), eventThresholdName: ${eventThresholdName}` )

		if( iotData.eventTypes.indexOf( eventThresholdName ) >= 0 ) {
			const event = new IotDataEvent( eventThresholdName, iotData );
			consoleLogger.debug( `EventsService - setting new event to a map ${JSON.stringify( event )}` );
			this.currentEvents.set( eventThresholdName, event );
			return event;
		} else {
			const eventExistInCurrentEventsMap = !!this.currentEvents.get( eventThresholdName );
			const oppositeRestoredEventName = thresholdAndRestorationEventTypes[ eventThresholdName ];

			if( eventExistInCurrentEventsMap && oppositeRestoredEventName ) {
				consoleLogger.debug( `EventsService - removing event from a map ${eventThresholdName}` );
				this.currentEvents.delete( eventThresholdName );
				return new IotDataEvent( oppositeRestoredEventName as EventType, iotData );
			}
		}

		return undefined;
	}

	public stop() {
		this.lastOccurredWaterLeakDataWorker.stop();
		this.unregisterAllListeners();
	}
}