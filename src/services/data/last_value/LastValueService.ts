import { IotData, IotDataType } from "../../../model/IotData";
import { EventEmitter } from "events";
import { Receiver } from "../../../common/Receiver";
import { Listener } from "../../../common/Listener";
import { consoleLogger } from "../../../common/logging/loggers";

export const LAST_VALUE_EVENT_NAME = "lastValue";

export class LastValueService implements Receiver<IotData>, Listener<IotData> {

	private map: Map<IotDataType, IotData>;
	private lastValueEmitter: EventEmitter;

	constructor() {
		this.lastValueEmitter = new EventEmitter();
		this.map = new Map<IotDataType, IotData>();
	}

	public async onReceive( iotData: IotData ): Promise<void> {
		consoleLogger.debug( `LastValueService onReceive()` );
		await this.set( iotData );
	}

	private async set( iotData: IotData ): Promise<void> {
		consoleLogger.debug( `LastValueService set()` );
		const { type } = iotData;
		const stringifiedData = JSON.stringify( iotData );
		consoleLogger.debug( `Setting last value data for type ${type}, data: ${stringifiedData}` );
		this.map.set( type, iotData );
		consoleLogger.debug( `Emitting last value event ${LAST_VALUE_EVENT_NAME} with data: ${stringifiedData}` );
		this.lastValueEmitter.emit( LAST_VALUE_EVENT_NAME, iotData );
		return;
	}

	public get( iotDataType: IotDataType ) {
		return this.map.get( iotDataType );
	}

	public getAll(): IotData[] {
		consoleLogger.debug( `Getting all last value iot data` );
		return Array.from( this.map.values() );
	}

	public registerListener( listener: ( data: IotData ) => void ): void {
		consoleLogger.debug( `Registering new last value listener on event ${LAST_VALUE_EVENT_NAME}` );
		this.lastValueEmitter.addListener( LAST_VALUE_EVENT_NAME, listener )
	}

	public unregisterAllListeners(): void {
		if( this.lastValueEmitter.listenerCount( LAST_VALUE_EVENT_NAME ) > 0 ){
			consoleLogger.debug( `Unregistering all last value listeners on event ${LAST_VALUE_EVENT_NAME}` );
			this.lastValueEmitter.removeAllListeners( LAST_VALUE_EVENT_NAME );
		}
	}
}