/*
 * Created with @iobroker/create-adapter v3.1.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

import request from 'request';
import objectAssign from 'object-assign';
import 'es6-promise/auto';

class Verisure extends utils.Adapter {
	private verisureConfig!: {
		username: string;
		password: string;
		domain: string;
		auth_path: string;
		alarmstatus_path: string;
		climatedata_path: string;
		alarmFields: string[];
		climateFields: string[];
	};
	private formData: Record<string, string> = {};
	private authenticated = false;
	private alarmStatus: Record<string, unknown> = {};
	private climateData: Array<Record<string, unknown>> = [];
	private firstAlarmPoll?: Promise<unknown>;
	private firstClimatePoll?: Promise<unknown>;
	private alarmFetchTimeout = 30 * 1000;
	private climateFetchTimeout = 30 * 60 * 1000;
	private errorTimeout = 10 * 60 * 1000;
	private listeners = {
		climateChange: [] as Array<(data: unknown) => void>,
		alarmChange: [] as Array<(data: unknown) => void>,
	};

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'verisure',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		if (!this.config.username || !this.config.password) {
			this.log.error('Username and password are required for Verisure API');
			return;
		}

		this.verisureConfig = objectAssign(
			{
				username: '',
				password: '',
				domain: 'https://mypages.verisure.com',
				auth_path: '/j_spring_security_check?locale=sv_SE',
				alarmstatus_path: '/remotecontrol?_=',
				climatedata_path: '/overview/climatedevice?_=',
				alarmFields: ['status', 'date'],
				climateFields: ['location', 'humidity', 'temperature', 'timestamp'],
			},
			{
				username: this.config.username,
				password: this.config.password,
				domain: this.config.domain || 'https://mypages.verisure.com',
			},
		);

		this.formData = {
			j_username: this.verisureConfig.username,
			j_password: this.verisureConfig.password,
		};

		request = request.defaults({ jar: true });

		this.engage();
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback - Callback function
	 */
	private onUnload(callback: () => void): void {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (error) {
			this.log.error(`Error during unloading: ${(error as Error).message}`);
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  */
	// private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 *
	 * @param id - State ID
	 * @param state - State object
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

			if (state.ack === false) {
				// This is a command from the user (e.g., from the UI or other adapter)
				// and should be processed by the adapter
				this.log.info(`User command received for ${id}: ${state.val}`);

				// TODO: Add your control logic here
			}
		} else {
			// The object was deleted or the state value has expired
			this.log.info(`state ${id} deleted`);
	}

	private filterByKeys(obj: Record<string, unknown>, keysArr: string[]): Record<string, unknown> {
		const filtered: Record<string, unknown> = {};
		for (const key of Object.keys(obj)) {
			if (keysArr.includes(key)) {
				filtered[key] = obj[key];
			}
		}
		return filtered;
	}

	private dispatch(service: 'climateChange' | 'alarmChange', data: unknown): void {
		for (const listener of this.listeners[service]) {
			listener(data);
		}
	}

	private requestPromise(options: request.UriOptions & request.CoreOptions): Promise<any> {
		return new Promise((resolve, reject) => {
			request(options, (error, response, body) => {
				if (
					options.json &&
					response &&
					response.headers['content-type'] !== 'application/json;charset=UTF-8'
				) {
					error = { state: 'error', message: 'Expected JSON, but got html' } as any;
				} else if (body && body.state === 'error') {
					error = body;
					this.authenticated = false;
				}

				if (error) {
					reject(error);
				} else {
					this.authenticated = true;
					resolve(body);
				}
			});
		});
	}

	private authenticate(): Promise<boolean | unknown> {
		const authUrl = this.verisureConfig.domain + this.verisureConfig.auth_path;
		const requestParams = {
			url: authUrl,
			form: this.formData,
			method: 'POST',
		};
		return this.authenticated ? Promise.resolve(true) : this.requestPromise(requestParams);
	}

	private fetchAlarmStatus(): Promise<any> {
		const alarmstatusUrl = this.verisureConfig.domain + this.verisureConfig.alarmstatus_path + Date.now();
		return this.requestPromise({ url: alarmstatusUrl, json: true });
	}

	private fetchClimateData(): Promise<any> {
		const climatedataUrl = this.verisureConfig.domain + this.verisureConfig.climatedata_path + Date.now();
		return this.requestPromise({ url: climatedataUrl, json: true });
	}

	private parseAlarmData(data: any): Promise<any> {
		if (!Array.isArray(data) || data.length === 0) return Promise.resolve(data);
		const filtered = this.filterByKeys(data[0], this.verisureConfig.alarmFields);

		setTimeout(() => this.pollAlarmStatus(), this.alarmFetchTimeout);

		if (JSON.stringify(filtered) !== JSON.stringify(this.alarmStatus)) {
			this.alarmStatus = filtered;
			this.dispatch('alarmChange', filtered);
		}
		return Promise.resolve(filtered);
	}

	private parseClimateData(data: any): Promise<any> {
		if (!Array.isArray(data)) return Promise.resolve(data);
		const filtered = data.map((set: Record<string, unknown>) =>
			this.filterByKeys(set, this.verisureConfig.climateFields),
		);

		setTimeout(() => this.pollClimateData(), this.climateFetchTimeout);

		if (JSON.stringify(filtered) !== JSON.stringify(this.climateData)) {
			this.climateData = filtered;
			this.dispatch('climateChange', filtered);
		}
		return Promise.resolve(filtered);
	}

	private pollAlarmStatus(): Promise<any> {
		return this.fetchAlarmStatus().then((data) => this.parseAlarmData(data));
	}

	private pollClimateData(): Promise<any> {
		return this.fetchClimateData().then((data) => this.parseClimateData(data));
	}

	private gotAlarmStatus(): boolean {
		return Object.keys(this.alarmStatus).length !== 0;
	}

	private gotClimateData(): boolean {
		return Object.keys(this.climateData).length !== 0;
	}

	private getAlarmStatus(): Promise<any> {
		if (this.gotAlarmStatus()) {
			return Promise.resolve(this.alarmStatus);
		} else {
			return this.firstAlarmPoll as Promise<any>;
		}
	}

	private getClimateData(): Promise<any> {
		if (this.gotClimateData()) {
			return Promise.resolve(this.climateData);
		} else {
			return this.firstClimatePoll as Promise<any>;
		}
	}

	private onError(err: unknown): void {
		setTimeout(() => this.engage(), this.errorTimeout);
		this.log.error(`Verisure request failed: ${JSON.stringify(err)}`);
	}

	private engage(): void {
		this.firstAlarmPoll = this.authenticate().then(() => this.pollAlarmStatus());
		this.firstClimatePoll = (this.firstAlarmPoll as Promise<any>)
			.then(() => this.pollClimateData())
			.catch((err) => this.onError(err));
	}
}
	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  */
	//
	// private onMessage(obj: ioBroker.Message): void {
	// 	if (typeof obj === 'object' && obj.message) {
	// 		if (obj.command === 'send') {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info('send command');
	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
	// 		}
	// 	}
	// }
}
if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Verisure(options);
} else {
	// otherwise start the instance directly
	(() => new Verisure())();
}
