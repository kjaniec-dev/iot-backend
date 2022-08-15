import path from "path";
import fs from "fs";

type Certs = {
	key: string | Buffer | undefined;
	cert: string | Buffer | undefined;
	ca: string | Buffer | undefined;
}

export function formatDate( date: Date ): string {
	return date.toISOString().split( "T" )[ 0 ];
}

export function resolveCertificates( certsPath: string ): Certs {
	//I do not see any point to load certs separately - as each one path to cert/key/ca
	//Just load the folder with files inside - like cert.pem, key.key, ca.pem etc.
	const certs: Certs = {
		ca: undefined,
		cert: undefined,
		key: undefined
	};
	const pathToCerts = path.resolve( process.cwd(), certsPath );

	const exists = fs.existsSync( pathToCerts )
	if( exists ) {
		const files: string[] = fs.readdirSync( pathToCerts );
		files.forEach( fileName => {
			if( fileName in certs ) {
				certs[ fileName as "ca" | "cert" | "key" ] = fs.readFileSync( fileName );
			}
		} );
	}

	return certs;
}

export function waitForSuccess( callback: () => boolean, timeout: number = 2000 ) {
	const now = Date.now();
	let success: boolean = false;

	while( !success && ( now + timeout > Date.now() ) ) {
		try {
			success = callback();
		} catch( err: any ) {
			console.error( `${err.message}` );
		}
	}

	if( !success ) {
		throw new Error( `Conditions does not meet` );
	}
}
