import { FileStorage, LocalFileStorage } from "./FileStorage";
import { consoleLogger, fileLogger } from "./logging/loggers";

class FileDataLoader {
	protected fileStorage: FileStorage;
	protected loading: boolean = false;

	constructor( fileStorage: FileStorage ) {
		this.fileStorage = fileStorage;
	}

	protected async onLoad( fileSuffixes: string[], resolveFileContentFunc: ( fileSuffix: string, fileContentLines: string[] ) => Promise<void>, callbackFunc?: () => Promise<void> ) {
		try {
			consoleLogger.debug( `FileDataLoader onLoad() with suffixes ${fileSuffixes.join( "," )}` )
			this.loading = true;

			const files = await this.fileStorage.readDir();

			for( const fileSuffix of fileSuffixes ) {
				const filenames: string[] = files.filter( file => file.endsWith( fileSuffix ) );

				if( filenames.length ) {
					const sortedFilenames = filenames.sort();
					const contentFile = await this.fileStorage.readFile( sortedFilenames[ sortedFilenames.length - 1 ] );
					const content = contentFile.toString();

					const lines: string[] = content.split( "\n" );
					await resolveFileContentFunc( fileSuffix, lines );
				}
			}

			consoleLogger.debug( `FileDataLoader - files contents processed` );

			this.loading = false;

			if( callbackFunc ) {
				consoleLogger.debug( `FileDataLoader onLoad() - callback function execution` );
				await callbackFunc();
			}
		} catch( err ) {
			consoleLogger.error( `An error occurred when onLoad files content has been executed`, err );
			fileLogger.error( `An error occurred when onLoad files content has been executed`, err );
		}
	}
}

export class IotFileDataLoader extends FileDataLoader {

	constructor() {
		consoleLogger.debug( `IotFileDataLoader constructor` );
		super( new LocalFileStorage( "/iot" ) )
	}
}

