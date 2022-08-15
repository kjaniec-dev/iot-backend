import { IotDataService } from "../services/data/IotDataService";
import { IotData } from "../model/IotData";
import { WaterLeakDetectionData } from "../model/WaterLeakDetectionData";
import { formatDate, waitForSuccess } from "../common/uitls/utilities";
import { LocalFileStorage } from "../common/FileStorage";
import * as fs from "fs";
import * as path from "path";


let iotDataService: IotDataService;

const dir =  path.join( process.cwd(), "/iot" );

beforeAll( async () => {
	const directoryExist = fs.existsSync( dir );
	if( !directoryExist ) {
		await fs.promises.mkdir( dir );
	}

	iotDataService = new IotDataService();
} );

afterAll(  async () => {
	iotDataService.unregisterAllListeners();
	await fs.promises.rmdir( dir, { recursive: true } )
} );

describe( "IotDataService - the most important logic", () => {
	test( "Should emit value and save it", async () => {
		const now = Date.now();
		const temperature = 31.1;
		const humidity = 42.8;
		const waterLevel = 0;
		const heatIndex = 29.89;

		let iotData: IotData;
		const listener = ( data: IotData ) => {
			iotData = data;
		};

		iotDataService.registerListener( listener );

		const waterLeakDetection = new WaterLeakDetectionData( {ts: now, temperature, waterLevel, humidity, heatIndex} )
		await iotDataService.onReceive( waterLeakDetection );

		waitForSuccess(  () => {
			if( !iotData ) {
				return false;
			}

			expect( iotData.type ).toBe( "waterLeakDetection" );
			expect( iotData.ts ).toBe( now );

			const waterLeakDetectionData = iotData as WaterLeakDetectionData;
			expect( waterLeakDetectionData.getWaterLevel() ).toBe( waterLevel );
			expect( waterLeakDetectionData.getHumidity() ).toBe( humidity );
			expect( waterLeakDetectionData.getTemperature() ).toBe( temperature );
			expect( waterLeakDetectionData.getHeatIndex() ).toBe( heatIndex );

			return true;
		} );

		const items = iotDataService.getIotDataItems();
		expect( items ).toContainEqual( { eventTypes: [], temperature, waterLevel, humidity, heatIndex, ts: now, type: "waterLeakDetection" } );

		const fileStorage = new LocalFileStorage( "/iot" );
		const file = await fileStorage.readFile( `${formatDate( new Date() )}-waterLeakDetection` );
		const fileContent = file.toString();
		expect( JSON.parse( fileContent ) ).toEqual( { eventTypes: [], temperature, humidity, heatIndex, waterLevel, ts: now, type: "waterLeakDetection" } );
	} );

	test( "Should not emit value if timestamp is from past", async () => {
		const now = Date.now() - 60 * 1000;
		const temperature = 31.1;
		const humidity = 42.8;
		const waterLevel = 0;
		const heatIndex = 29.89;

		const waterLeakDetection = new WaterLeakDetectionData( {ts: now, temperature, waterLevel, humidity, heatIndex} )
		await iotDataService.onReceive( waterLeakDetection );

		const items = iotDataService.getIotDataItems();
		expect( items ).toHaveLength( 1 );

		const itemTs = items[ 0 ].ts;

		const fileStorage = new LocalFileStorage( "/iot" );
		const file = await fileStorage.readFile( `${formatDate( new Date() )}-waterLeakDetection` );
		const fileContent = file.toString();
		expect( JSON.parse( fileContent ) ).toEqual( { eventTypes: [], temperature, humidity, heatIndex, waterLevel, ts: itemTs, type: "waterLeakDetection" } );
	} );
} );


