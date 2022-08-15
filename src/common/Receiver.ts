export interface Receiver<T> {
	onReceive( data: T ): void;
}
