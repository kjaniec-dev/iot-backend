import { LimitedArrayCache } from "../common/LimitedArrayCache";

type SomeData = {
	index: number;
};

describe( "Limited array cache tests", () => {

	test( "Empty array cache", () => {
		const arrayCache = new LimitedArrayCache( 10 );
		const items = arrayCache.getItems();
		expect( items ).toHaveLength( 0 );
		expect( arrayCache.getLast() ).toBeUndefined();
	} );

	test( "Should add a new item and get it", () => {
		const arrayCache = new LimitedArrayCache<SomeData>( 10 );

		arrayCache.add( {index: 0} );

		const items = arrayCache.getItems();
		expect( items ).toHaveLength( 1 );
		expect( arrayCache.length() ).toBe( 1 );
		expect( arrayCache.getLast() ).toEqual( {index: 0} );
	} );

	test( "Should splice array on half size", () => {
		const arrayCache = new LimitedArrayCache<SomeData>( 10 );

		let index = 1;

		while( index <= 11 ) {
			arrayCache.add( {index} );
			index++;
		}

		const items = arrayCache.getItems();
		expect( items ).toHaveLength( 6 );
		expect( items.map( item => item.index ) ).toEqual( [ 6, 7, 8, 9, 10, 11 ] )

		expect( arrayCache.getLast() ).toEqual( {index: 11} );
	} );

} );
