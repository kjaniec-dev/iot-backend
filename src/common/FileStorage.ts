import * as fs from "fs";
import * as path from "path";
import { consoleLogger, fileLogger } from "./logging/loggers";

export abstract class FileStorage {

	private baseDir: string;
	private dir: string;

	constructor( baseDir: string, dir: string ) {
		this.baseDir = baseDir;
		this.dir = dir;
	}

	abstract appendFile( fileName: string, data: string ): Promise<void>;
	abstract readFile( fileName: string ): Promise<Buffer>;
	abstract readDir(): Promise<string[]>;
}

export class LocalFileStorage extends FileStorage {

	private basePath: string;

	constructor( dir: string ) {
		const baseDir = process.cwd();
		super( baseDir, dir );
		this.basePath = path.join( baseDir, dir );
	}

	public async appendFile( fileName: string, data: string ) {
		consoleLogger.debug( `Appending data ${data} to file ${fileName} ` );
		await fs.promises.appendFile( path.join( this.basePath, fileName ), `${data}\n` ).catch( err => {
			consoleLogger.error( err, `Cannot append data ${data} to file ${fileName}` );
			fileLogger.error( err, `Cannot append data ${data} to file ${fileName}` );
		} );
	}

	public async readFile( fileName: string ): Promise<Buffer> {
		consoleLogger.debug( `Reading file ${fileName}` );
		return fs.promises.readFile( path.join( this.basePath, fileName ) );
	}

	public async readDir(): Promise<string[]> {
		consoleLogger.debug( `Reading base directory ${this.basePath}` );
		return fs.promises.readdir( path.join( this.basePath ) )
	}
}
//place for s3 fileStorage class
