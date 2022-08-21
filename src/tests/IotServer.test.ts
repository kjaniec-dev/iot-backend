import { EventsService } from "../services/events/EventsService";
import { IotServer } from "../server/IotServer";
import { LastValueService } from "../services/data/last_value/LastValueService";
import * as path from "path";
import * as fs from "fs";
import { WaterLeakDetectionData } from "../model/WaterLeakDetectionData";
import * as dotenv from "dotenv";
import { IotData } from "../model/IotData";
import WebSocket from "ws";

let eventsService: EventsService;
let lastValueService: LastValueService;
let iotServer: IotServer;
const dir = path.join( process.cwd(), "/iot" );

beforeAll( ( done ) => {

	dotenv.config( {
		path: path.resolve( process.cwd(), ".env.test" )
	} );
	const directoryExist = fs.existsSync( dir );
	if( !directoryExist ) {
		fs.mkdirSync( dir );
	}
	eventsService = new EventsService();
	lastValueService = new LastValueService();
	iotServer = new IotServer( eventsService, lastValueService );
	done();
} );

afterAll( () => {
	iotServer.stop();
	const directoryExist = fs.existsSync( dir );
	if( directoryExist ) {
		fs.rmdirSync( dir, {recursive: true} );
	}
} );

const createWebSocket = () : Promise<WebSocket> => {
	return new Promise( ( resolve, reject ) => {
		const webSocket = new WebSocket( `ws://localhost:${process.env.SERVER_PORT}` );
		const start = Date.now();
		const timer = setInterval( () => {
			if( webSocket.readyState === WebSocket.OPEN ) {
				clearInterval( timer );
				resolve( webSocket );
			}
			if( Date.now() - start > 3000 ) {
				clearInterval( timer );
				reject( new Error( "Websocket not connect to server" ) );
			}

		}, 10 );
	} );
}

describe( "IotServer tests", () => {

	test( "Should get empty events", async () => {
		const events = await fetch( `http://localhost:${process.env.SERVER_PORT}/events` ).then( res => res.json() );
		expect( events ).toEqual( [] );

		const currentEvents = await fetch( `http://localhost:${process.env.SERVER_PORT}/events/current` ).then( res => res.json() );
		expect( currentEvents ).toHaveLength( 0 );
	} );

	test( "Should get some events", async () => {
		const waterLeakDetectionData = new WaterLeakDetectionData( {
			temperature: 57.8,
			waterLevel: 10,
			humidity: 99.8,
			heatIndex: 54.3
		} );
		await eventsService.onReceive( waterLeakDetectionData );

		const events = await fetch( `http://localhost:${process.env.SERVER_PORT}/events` ).then( res => res.json() );
		expect( events ).toHaveLength( 3 );

		const currentEvents = await fetch( `http://localhost:${process.env.SERVER_PORT}/events/current` ).then( res => res.json() );
		expect( currentEvents ).toHaveLength( 3 );

		const anotherWaterLeakDetectionData = new WaterLeakDetectionData( {
			temperature: 25.8,
			waterLevel: 0,
			humidity: 40.8,
			heatIndex: 22.3
		} );
		await eventsService.onReceive( anotherWaterLeakDetectionData );

		const moreEvents = await fetch( `http://localhost:${process.env.SERVER_PORT}/events` ).then( res => res.json() );
		expect( moreEvents ).toHaveLength( 6 );

		const currentEventsAfterRestoredEvents = await fetch( `http://localhost:${process.env.SERVER_PORT}/events/current` ).then( res => res.json() );
		expect( currentEventsAfterRestoredEvents ).toHaveLength( 0 );
	} );

	test( "Should get last value on websocket connect", async () => {

		const firstLastValueData = new WaterLeakDetectionData( {
			ts: Date.now(),
			type: "waterLeakDetection",
			temperature: 22.5,
			waterLevel: 0,
			heatIndex: 19.56,
			humidity: 42.1
		} );

		await lastValueService.onReceive( firstLastValueData ).then( async () => {
			await new Promise( ( resolve, reject) => {
				const start = Date.now();
				const timer = setInterval( async () => {
					const lastValueData = lastValueService.get( "waterLeakDetection" );
					if( lastValueData ) {
						clearInterval( timer );
						resolve( lastValueData );
					}
					if( Date.now() - start > 3000 ) {
						clearInterval( timer );
						reject( new Error( "Last value data has not been processed" ) );
					}
				}, 10 );
			} )
		} );


		const ws: WebSocket = await createWebSocket();

		let data: Promise<IotData>;

		ws.on( "message", async ( message: Buffer ) => {
			data = new Promise( resolve => {
				const parsedData: IotData = JSON.parse( message.toString() ) as IotData;
				resolve( parsedData );
			} );
		} );

		await lastValueService.onReceive( firstLastValueData ).then( async () => {
			const result = await new Promise( ( resolve, reject) => {
				const start = Date.now();
				const timer = setInterval( async () => {
					const d = await data;
					if( d ) {
						clearInterval( timer );
						resolve( d );
					}
					if( Date.now() - start > 3000 ) {
						clearInterval( timer );
						reject( new Error( "Websocket not connect to server" ) );
					}

				}, 10 );
			} )
			expect( result ).toEqual( firstLastValueData );
		} );
	} );

	test( "Should get last value when last value has changed", async () => {

		const ws: WebSocket = await createWebSocket();

		let data: Promise<IotData>;

		ws.on( "message", async ( message: Buffer ) => {
			data = new Promise( resolve => {
				const parsedData: IotData = JSON.parse( message.toString() ) as IotData;
				resolve( parsedData );
			} );
		} );

		const receivedData = new WaterLeakDetectionData( {
			ts: Date.now(),
			type: "waterLeakDetection",
			temperature: 55.3,
			waterLevel: 1,
			heatIndex: 51.3,
			humidity: 89.9
		} );

		await lastValueService.onReceive( receivedData ).then( async () => {
			const result = await new Promise( ( resolve, reject) => {
				const start = Date.now();
				const timer = setInterval( async () => {
					const d = await data;
					if( d ) {
						clearInterval( timer );
						resolve( d );
					}
					if( Date.now() - start > 3000 ) {
						clearInterval( timer );
						reject( new Error( "Websocket not connect to server" ) );
					}

				}, 10 );
			} )
			expect( result ).toEqual( receivedData );
		} );
	} );

	test( "Should emit last value to two websockets", async () => {

		const ws: WebSocket = await createWebSocket();
		const ws2: WebSocket = await createWebSocket();

		let data: Promise<IotData>;
		let data2: Promise<IotData>;

		ws.on( "message", async ( message: Buffer ) => {
			data = new Promise( resolve => {
				const parsedData: IotData = JSON.parse( message.toString() ) as IotData;
				resolve( parsedData );
			} );
		} );

		ws2.on( "message", async ( message: Buffer ) => {
			data2 = new Promise( resolve => {
				const parsedData: IotData = JSON.parse( message.toString() ) as IotData;
				resolve( parsedData );
			} );
		} );

		const receivedData = new WaterLeakDetectionData( {
			ts: Date.now(),
			type: "waterLeakDetection",
			temperature: 45.3,
			waterLevel: 0.5,
			heatIndex: 42.3,
			humidity: 75.9
		} );

		await lastValueService.onReceive( receivedData ).then( async () => {
			const result: any = await new Promise( ( resolve, reject) => {
				const start = Date.now();
				const timer = setInterval( async () => {
					const d = await data;
					const d2 = await data2;
					if( d && d2 ) {
						clearInterval( timer );
						resolve( { d, d2 } );
					}
					if( Date.now() - start > 3000 ) {
						clearInterval( timer );
						reject( new Error( "Websockets are not react to last value data" ) );
					}

				}, 10 );
			} );
			expect( result.d ).toEqual( receivedData );
			expect( result.d2 ).toEqual( receivedData );
			expect( result.d ).toEqual( result.d2 );
		} );
	} );

} );
