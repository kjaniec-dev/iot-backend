import { IotData } from "./IotData";

export const onlyThresholdEventTypes = [
	"highHumidityEvent",
	"highTemperatureEvent",
	"highWaterLevelEvent",
	"noDataReceivedEvent",
];

export const restoredEventTypes = [
	"humidityRestoredEvent",
	"temperatureRestoredEvent",
	"waterLevelRestoredEvent",
	"dataReceived"
];

export const thresholdAndRestorationEventTypes: Record<EventType, EventType> = {
	highHumidityEvent: "humidityRestoredEvent",
	highTemperatureEvent: "temperatureRestoredEvent",
	highWaterLevelEvent: "waterLevelRestoredEvent",
	noDataReceivedEvent: "dataReceived"
}

export const eventTypes: string[] = onlyThresholdEventTypes.concat( restoredEventTypes );

export type EventType = typeof eventTypes[ number ];

export class IotDataEvent {

	public readonly type: EventType;
	public readonly data: IotData

	constructor( type: EventType, data: IotData ) {
		this.type = type;
		this.data = data;
	}
}