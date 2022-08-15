import { EventsService } from "../services/events/EventsService";
import express, { Express, Request, Response } from "express";
import { consoleLogger, fileLogger } from "../common/logging/loggers";
import * as http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { LastValueService } from "../services/data/last_value/LastValueService";
import { Server } from "http";
import { IotData } from "../model/IotData";

export class IotServer {

	private server: http.Server;
	private disconnecting: boolean = false;
	private port: number;
	private heartbeatInterval?: NodeJS.Timer;
	private ws?: WebSocket;

	constructor( private eventsService: EventsService, private lastValueService: LastValueService ) {
		consoleLogger.debug( `IotServer constructor - creating express app configuring endpoints` );
		this.port = process.env.SERVER_PORT ? Number.parseInt( process.env.SERVER_PORT, 10 ) : 8000;

		this.server = this.setupServer();

		this.startWebsocketServer( this.server ).then( ( wss: WebSocketServer ) => {
			this.lastValueService.registerListener( ( iotData: IotData ) => {
				wss.clients.forEach( ( client: WebSocket ) => {
					if( ( client !== this.ws ) && ( client.readyState === WebSocket.OPEN ) ) {
						client.send( JSON.stringify( iotData ) );
					}
				} );
			} );
		} );

		this.server.on( "error", ( err: Error ) => {
			consoleLogger.error( `An error occurred on node http server emitter, err: ${err.message}` );
			fileLogger.error( `An error occurred on node http server emitter, err: ${err.message}` );
		} );

		this.server.on( "close", () => {
			consoleLogger.info( `Iot server closed` );
		} );
	}

	private setupServer(): Server {
		const app = express();

		app.use( express.json() );

		app.get( "/events", ( req: Request, res: Response ) => {
			consoleLogger.debug( `Getting current events - endpoint GET /events` )
			const events = this.eventsService.getEvents();
			res.status( 200 );
			res.send( events );
		} );

		app.get( "/events/current", ( req: Request, res: Response ) => {
			consoleLogger.debug( `Getting current events - endpoint GET /events/current` )
			const events = this.eventsService.getCurrentEvents();
			res.status( 200 );
			res.send( events );
		} );

		return app.listen( this.port, () => {
			consoleLogger.info( `Server listen on port ${this.port}` );
		} );
	}

	private async startWebsocketServer( server: Server ) {
		const wss: WebSocketServer = await new Promise( ( resolve, reject ) => {
			const websocketServer = new WebSocketServer( {server} );

			websocketServer.on( "listening", () => {
				resolve( websocketServer );
			} );

			websocketServer.on( "error", ( err: Error ) => {
				consoleLogger.error( `An error occurred on websocket server, err: ${err.message}` );
				fileLogger.error( `An error occurred on websocket server, err: ${err.message}` );
				reject( err );
			} );
		} );

		wss.on( "connection", ( ws: WebSocket ) => {
			consoleLogger.debug( `Connected socket` );
			ws.on( "pong", this.heartbeat );

			const lastValues = this.lastValueService.getAll();
			lastValues.forEach( lastValue => {
				ws.send( JSON.stringify( lastValue ) );
			} );
		} );

		wss.on( "close", () => {
			consoleLogger.info( `Closed web socket server` );
			clearInterval( this.heartbeatInterval );
		} );

		return wss;
	}

	public stop() {
		consoleLogger.debug( `Stopping iot server` );
		this.eventsService.stop();
		this.lastValueService.unregisterAllListeners();

		if( !this.disconnecting ) {
			this.disconnecting = true;
			this.server.close();
		}
	}

	private heartbeat( ws: any ) {
		ws.isAlive = true;
	}
}
