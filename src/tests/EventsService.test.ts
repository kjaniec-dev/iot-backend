import { WaterLeakDetectionData } from "../model/WaterLeakDetectionData";
import * as fs from "fs";
import * as path from "path";
import { EventsService } from "../services/events/EventsService";
import { IotDataEvent } from "../model/IotDataEvent";
import { waitForSuccess } from "../common/uitls/utilities";

let eventsService: EventsService;

const dir = path.join( process.cwd(), "/iot" );

beforeAll( async () => {
	jest.useFakeTimers( {
		advanceTimers: 60000
	} );

	const directoryExist = fs.existsSync( dir );
	if( !directoryExist ) {
		await fs.promises.mkdir( dir );
	}

	eventsService = new EventsService();
} );

afterAll(  async () => {
	eventsService.stop();
	await fs.promises.rmdir( dir, { recursive: true } );
} );

describe( "Events service logic", () => {

	test( "Should not generate any events", async () => {
		const now = Date.now();
		const temperature = 32.1;
		const humidity = 55.8;
		const waterLevel = 0;
		const heatIndex = 29.89;

		const waterLeakDetection = new WaterLeakDetectionData( {ts: now, type: "waterLeakDetection", temperature, waterLevel, humidity, heatIndex} );
		await eventsService.onReceive( waterLeakDetection );

		const events: IotDataEvent[] = eventsService.getEvents();
		expect( events ).toHaveLength( 0 );
	} );

	test( "Should generate 3 events", async () => {
		const now = Date.now() + 1;
		const temperature = 55.1;
		const humidity = 99.8;
		const waterLevel = 3;
		const heatIndex = 29.89;

		const waterLeakDetection = new WaterLeakDetectionData( {ts: now, type: "waterLeakDetection", temperature, waterLevel, humidity, heatIndex} );
		await eventsService.onReceive( waterLeakDetection );

		waitForSuccess( () => {
			const events = eventsService.getEvents();
			return events.length > 0;
		}, 3000 );

		const events: IotDataEvent[] = eventsService.getEvents();
		expect( events ).toHaveLength( 3 );

		const currentEvents: IotDataEvent[] = eventsService.getCurrentEvents();
		expect( currentEvents ).toHaveLength( 3 );
	} );

	test( "Should generate 3 events but only restored ones", async () => {
		const now = Date.now() + 1;
		const temperature = 25.1;
		const humidity = 38.8;
		const waterLevel = 0;
		const heatIndex = 29.89;

		const waterLeakDetection = new WaterLeakDetectionData( {ts: now, type: "waterLeakDetection", temperature, waterLevel, humidity, heatIndex} );
		await eventsService.onReceive( waterLeakDetection );

		waitForSuccess( () => {
			const events = eventsService.getEvents();
			return events.length > 3;
		}, 3000 );

		const events: IotDataEvent[] = eventsService.getEvents();
		expect( events ).toHaveLength( 6 );

		const currentEvents: IotDataEvent[] = eventsService.getCurrentEvents();
		expect( currentEvents ).toHaveLength( 0 );
	} );
} );
