import { consoleLogger } from "./logging/loggers";

export class LimitedArrayCache<I> {

	private size: number;
	private items: I[] = [];

	constructor( size: number = 10 ) {
		consoleLogger.debug( `LimitedArrayCache size: ${size}` );
		this.size = size;
	}

	public add( ...items: I[] ) {
		consoleLogger.debug( `LimitedArrayCache add items ${JSON.stringify( items )} ` );
		if( this.size < this.length() + 1 ) {
			consoleLogger.debug( `LimitedArrayCache splice for a half items ` );
			this.items.splice( 0, this.size / 2 );
		}
		this.items.push( ...items );
	}

	public length(): number {
		return this.items.length;
	}

	public getItems() {
		return this.items;
	}

	public getLast(): I | undefined {
		return this.length() ? this.items[ this.length() - 1 ] : undefined;
	}
}