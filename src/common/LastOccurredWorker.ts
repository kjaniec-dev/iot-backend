import { consoleLogger } from "./logging/loggers";

export class LastOccurredWorker {

	private timeout: any;

	constructor( private timeInMs: number, private func: ( ts: number ) => void ) {
		// consoleLogger.debug( `LastOccurredWorker constructor` );
		this.reset();
	}

	public reset() {
		this.stop();
		consoleLogger.debug( `LastOccurredWorker reset() execution` );

		this.timeout = setTimeout( () => {
			consoleLogger.debug( "set timeout execution" )
			const now = Date.now();
			consoleLogger.debug( `LastOccurredWorker reset setTimeout ts: ${now}` );
			this.func( now );
			this.reset();
		}, this.timeInMs );
	}

	public stop() {
		if( this.timeout ) {
			clearTimeout( this.timeout );
		}
		this.timeout = null;
	}
}