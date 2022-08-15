import { WaterLeakDetectionData } from "../model/WaterLeakDetectionData";
import { LastValueService } from "../services/data/last_value/LastValueService";
import { IotData } from "../model/IotData";
import exp = require("constants");

const lastValueService: LastValueService = new LastValueService();

let iotData: IotData;

beforeAll( () => {
	lastValueService.registerListener( ( data: IotData ) => {
		iotData = data;
	} );
} );

afterAll(  async () => {
	lastValueService.unregisterAllListeners();
} );

describe( "Last value service", () => {

	test( "Should not get any values when not even single data received", async () => {
		const notExistingData = lastValueService.get( "waterLeakDetection" );
		expect( notExistingData ).toBeUndefined();

		const allLastValueData = lastValueService.getAll();
		expect( allLastValueData ).toHaveLength( 0 );

		expect( iotData ).toBeUndefined();
	} );

	test( "Should get last value for water leak detection data", async () => {
		const now = Date.now();
		const temperature = 55.1;
		const humidity = 99.8;
		const waterLevel = 0.3;
		const heatIndex = 29.89;

		const waterLeakDetection = new WaterLeakDetectionData( {ts: now, type: "waterLeakDetection", temperature, waterLevel, humidity, heatIndex} );
		lastValueService.onReceive( waterLeakDetection );

		const lastValueData = lastValueService.get( "waterLeakDetection" );
		expect( lastValueData ).toBeDefined();
		expect( lastValueData ).toEqual( waterLeakDetection );

		const allLastValueData = lastValueService.getAll();
		expect( allLastValueData ).toHaveLength( 1 );
		expect( allLastValueData[ 0 ] ).toEqual( waterLeakDetection );

		const anotherWaterLeakDetectionData = new WaterLeakDetectionData( {ts: now, type: "waterLeakDetection", temperature: temperature + 1, waterLevel, humidity, heatIndex} );
		await lastValueService.onReceive( anotherWaterLeakDetectionData );
		expect(lastValueService.get( "waterLeakDetection" ) ).toBe( anotherWaterLeakDetectionData );
	} );
} );
