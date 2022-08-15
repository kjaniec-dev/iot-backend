import log4js, { getLogger } from "log4js";
import * as path from "path";

class LoggersConfiguration {
	private readonly consoleLog: log4js.Logger;
	private readonly fileLog: log4js.Logger;

	constructor() {
		log4js.configure( {
			appenders: {
				consoleAppender: { type: "console" },
				dateFileAppender: { type: "dateFile", filename: path.join( process.cwd(), "/logs/error.log" ) }
			},
			categories: {
				default: { appenders: [ "consoleAppender" ], level: "trace", enableCallStack: false },
				file: { appenders: [ "dateFileAppender" ], level: "error" }
			},
		} );

		this.consoleLog = getLogger();
		this.fileLog = getLogger( "file" );
	}

	public get consoleLogger(): log4js.Logger {
		return this.consoleLog;
	}

	public get fileLogger(): log4js.Logger {
		return this.fileLog;
	}

}

export const loggers = new LoggersConfiguration();
