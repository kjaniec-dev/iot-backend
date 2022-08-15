import { IotData, IotDataType } from "../../model/IotData";
import { LimitedArrayCache } from "../../common/LimitedArrayCache";
import { WaterLeakDetectionData } from "../../model/WaterLeakDetectionData";
import { IotFileDataLoader } from "../../common/IotFileDataLoader";
import { EventEmitter } from "events";
import { formatDate } from "../../common/uitls/utilities";
import { Listener } from "../../common/Listener";
import { Receiver } from "../../common/Receiver";
import { consoleLogger } from "../../common/logging/loggers";

const supportedIotDataTypes: IotDataType[] = [ "waterLeakDetection" ];

export class IotDataService extends IotFileDataLoader implements Receiver<IotData>, Listener<IotData> {

	private waterLeakDetectionItems: LimitedArrayCache<IotData>;
	private temporaryWaterLeakData: IotData[] = [];
	private iotDataEmitter = new EventEmitter();

	constructor() {
		super();
		this.waterLeakDetectionItems = new LimitedArrayCache<IotData>( 20000 );

		consoleLogger.debug( `IotDataService onLoad - loading all data from the newest file when start/restart application happened` );
		this.onLoad( supportedIotDataTypes, this.resolveFileContentFunc, async () => {
			consoleLogger.debug( `IotDataService callback for onLoad files content function` );
			this.waterLeakDetectionItems.add( ...this.temporaryWaterLeakData );
			this.temporaryWaterLeakData = [];
			return;
		} ).then();
	}

	public async onReceive( iotData: IotData ) {
		consoleLogger.debug( `IotDataService onReceive()` );
		switch( iotData.type ) {
			case "waterLeakDetection": {
				await this.saveWaterLeakDetectionData( iotData );
				break;
			}

			case "movementDetection":
				consoleLogger.warn( `Movement detection is unsupported right now` );
				return;
			default:
				consoleLogger.warn( `Unknown iot data type: ${iotData.type}` );
				return;
		}

		// consoleLogger.debug( `IotDataService - emitting 'iotData' event with content ${iotData}` );
		this.iotDataEmitter.emit( "iotData", iotData );
	}

	public getIotDataItems(): IotData[] {
		return this.waterLeakDetectionItems.getItems();
	}

	public registerListener( listener: ( iotData: IotData ) => void ) {
		consoleLogger.debug( `Registering a new listener to IotDataService emitter on event 'iotData'` );
		this.iotDataEmitter.addListener( "iotData", listener );
	}

	public unregisterAllListeners(): void {
		if( this.iotDataEmitter.listenerCount( "iotData" ) > 0 ) {
			consoleLogger.debug( `IotDataService unregistering all listeners to event 'iotData'` );
			this.iotDataEmitter.removeAllListeners( "iotData" );
		}
	}

	private async saveWaterLeakDetectionData( iotData: IotData ): Promise<void> {
		consoleLogger.debug( `IotDataService - saveWaterLeakDetectionData()` );
		const lastIotData = this.loading
			? ( this.temporaryWaterLeakData.length ? this.temporaryWaterLeakData[ this.temporaryWaterLeakData.length - 1 ] : undefined )
			: this.waterLeakDetectionItems.getLast();

		if( lastIotData && lastIotData.ts > iotData.ts ) {
			consoleLogger.warn( `Skipping iotData event from mqtt because timestamp is older than current - current ${lastIotData.ts}, received ts: ${iotData.ts}` );
			return;
		}

		consoleLogger.debug( `IotDataService - appending data to in memory collections` );
		if( this.loading ) {
			this.temporaryWaterLeakData.push( iotData );
		} else {
			this.waterLeakDetectionItems.add( iotData );
		}

		const date = new Date();

		const fileName = `${formatDate( date )}-${iotData.type}`;
		consoleLogger.debug( `IotDataService - appending data to file /iot/${fileName}` );
		await this.fileStorage.appendFile( fileName, JSON.stringify( iotData ) );
	}

	private async resolveFileContentFunc( fileSuffix: string, fileContentLines: string[] ) {
		consoleLogger.debug( `IotDataService resolveFileContentFunc()` );
		switch( fileSuffix ) {
			case "waterLeakDetection": {
				const iotData: IotData[] = fileContentLines.reduce( ( acc: IotData[], line: string ) => {
					if( !line || line.length === 0 ) {
						return acc;
					}

					return acc.concat( new WaterLeakDetectionData( JSON.parse( line ) ) );
				}, [] );

				this.waterLeakDetectionItems.add( ...iotData );
				break;
			}
			default:
		}

		return;
	}
}
