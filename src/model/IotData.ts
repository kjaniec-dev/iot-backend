import { EventType, IotDataEvent } from "./IotDataEvent";

export type IotDataType = "waterLeakDetection" | "movementDetection";

export abstract class IotData {

	public readonly ts: number;
	public readonly abstract type: IotDataType;
	public readonly eventTypes: EventType[];

	constructor( json: any ) {
		this.ts = json.ts || Date.now();
		this.deserialize( json );
		this.eventTypes = this.resolveEventTypes();
	}

	public abstract deserialize( json: any ): void;
	public abstract resolveEventTypes(): EventType[];
}