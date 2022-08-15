export interface Listener<T> {
	registerListener( listener: ( data: T ) => void, event?: string ): void;
	unregisterListener?( event: string, listener: ( data: T ) => void ): void;
	unregisterAllListeners( event?: string ): void;
}