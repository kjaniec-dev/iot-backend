import * as dotenv from "dotenv";
import { Application } from "./Application";
import { EventsService } from "./services/events/EventsService";
import { IotDataService } from "./services/data/IotDataService";
import { LastValueService } from "./services/data/last_value/LastValueService";
import { consoleLogger, fileLogger } from "./common/logging/loggers";

dotenv.config();

const application = new Application( new IotDataService(), new EventsService(), new LastValueService() );
application.start();


const handleUncaughtException = ( err: Error ) => {
	consoleLogger.error( `Uncaught exception`, err );
	fileLogger.error( `Uncaught exception`, err );
}

const handleExit = async () => {
	application.stop();
}

process.on( 'uncaughtException', ( err, next ) => {
	handleUncaughtException( err );
} );

process.on( "SIGINT", () => {
	consoleLogger.trace( `Received SIGINT` );
	handleExit();
} );

process.on( "SIGTERM", () => {
	consoleLogger.trace( `Received SIGTERM` );
	handleExit();
} );


process.on( "beforeExit", () => {
	consoleLogger.trace( `Before exit process hook` );
	handleExit();
} );

process.on( "exit", () => {
	consoleLogger.trace( `Exit process hook` );
} );