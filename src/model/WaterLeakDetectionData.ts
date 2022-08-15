import { IotData, IotDataType } from "./IotData";
import { EventType } from "./IotDataEvent";

const HUMIDITY_THRESHOLD: number = 80;
const WATER_LEVEL_THRESHOLD: number = 0.1;
const TEMPERATURE_THRESHOLD: number = 50;

export class WaterLeakDetectionData extends IotData {
	public readonly type: IotDataType;

	protected temperature: number | undefined;
	protected humidity: number | undefined;
	protected heatIndex: number | undefined;
	protected waterLevel: number | undefined;

	public constructor( data: any ) {
		super( data );
		this.type = "waterLeakDetection";
	}

	public toString(): string {
		return JSON.stringify( this );
	}

	public deserialize( data: any ) {
		this.temperature = data.temperature;
		this.humidity = data.humidity;
		this.heatIndex = data.heatIndex;
		this.waterLevel = data.waterLevel;
	}

	public resolveEventTypes(): EventType[] {
		const thresholdTypes: EventType[] = [];

		if( !!( this.waterLevel && ( this.waterLevel > WATER_LEVEL_THRESHOLD ) ) ) {
			thresholdTypes.push( "highWaterLevelEvent" );
		}

		if( !!( this.temperature && ( this.temperature > TEMPERATURE_THRESHOLD ) ) ) {
			thresholdTypes.push( "highTemperatureEvent" );
		}

		if( !!( this.humidity && ( this.humidity > HUMIDITY_THRESHOLD ) ) ) {
			thresholdTypes.push( "highHumidityEvent" );
		}

		return thresholdTypes;
	}

	public getTemperature() {
		return this.temperature;
	}

	public getHumidity() {
		return this.humidity;
	}

	public getWaterLevel() {
		return this.waterLevel;
	}

	public getHeatIndex() {
		return this.heatIndex;
	}
}