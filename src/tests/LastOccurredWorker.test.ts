import { LastOccurredWorker } from "../common/LastOccurredWorker";

let lastOccurredWorker: LastOccurredWorker;

beforeAll( () => {
	jest.useFakeTimers( {
		advanceTimers: 1000
	} );
} );

afterEach( () => {
	if( lastOccurredWorker ) {
		lastOccurredWorker.stop();
	}
} )

describe( "Last occurred worker", () => {

	test( "Should tick at least two times", () => {
		const timeoutInMs = 100;
		const func = jest.fn();

		lastOccurredWorker = new LastOccurredWorker( timeoutInMs, func );
		expect( func ).not.toBeCalled();

		jest.advanceTimersByTime( timeoutInMs );
		expect( func ).toBeCalled();
		expect( func ).toBeCalledTimes( 1 );

		jest.advanceTimersByTime( timeoutInMs );
		expect( func ).toBeCalledTimes( 2 );
	} );

	test( "Should cleared every time without setting timeout function", async () => {
		const timeoutInMs = 100;
		const func = jest.fn();

		lastOccurredWorker = new LastOccurredWorker( timeoutInMs, func );
		expect( func ).not.toBeCalled();

		lastOccurredWorker.reset();

		jest.advanceTimersByTime( 50 );
		expect( func ).not.toBeCalled();

		lastOccurredWorker.reset();
		jest.advanceTimersByTime( 50 );
		expect( func ).not.toBeCalled();

		lastOccurredWorker.reset();
		jest.advanceTimersByTime( 50 );
		expect( func ).toBeCalledTimes( 0 );
	} );
} );
