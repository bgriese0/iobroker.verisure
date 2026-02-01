/*
 * Created with @iobroker/create-adapter v3.1.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

import VerisureClient from 'verisure';

type VerisureClientType = {
	getToken: (code?: string) => Promise<unknown>;
	getInstallations: () => Promise<Array<{ giid: string; client: (request: unknown) => Promise<any> }>>;
};

class Verisure extends utils.Adapter {
	private pollTimer: ioBroker.Interval | undefined;
	private client: VerisureClientType | undefined;
	private refreshPromise: Promise<void> | undefined;

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
		if (!this.config.email || !this.config.password) {
			this.log.error('Email and password are required in adapter configuration');
			return;
		}

		this.client = new VerisureClient(this.config.email, this.config.password) as unknown as VerisureClientType;

		await this.syncDevices();

		const intervalMs = Math.max(30, this.config.pollInterval || 300) * 1000;
		this.pollTimer = this.setInterval(() => this.syncDevices(), intervalMs);
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback - Callback function
	 */
	private onUnload(callback: () => void): void {
		try {
			if (this.pollTimer) {
				this.clearInterval(this.pollTimer);
			}

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
		} else {
			// The object was deleted or the state value has expired
			this.log.info(`state ${id} deleted`);
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

	private async syncDevices(): Promise<void> {
		if (!this.client) return;

		try {
			if (!this.refreshPromise) {
				this.refreshPromise = this.client
					.getToken()
					.then(() => undefined)
					.catch((err: Error) => {
						this.log.error(`Failed to refresh token: ${err.message}`);
						throw err;
					})
					.finally(() => {
						this.refreshPromise = undefined;
					});
			}
			await this.refreshPromise;

			const installations = await this.client.getInstallations();

			for (const installation of installations) {
				const client = installation.client.bind(installation);

				const overview = await client({
					operationName: 'overview',
					variables: { giid: installation.giid },
					query: `query overview($giid: String!) {
						installation(giid: $giid) {
							doorlocks {
								deviceLabel
								area
								doorLockState
								deviceId
								__typename
							}
							cameras {
								deviceLabel
								area
								isOnline
								deviceId
								image {
									highResolutionUrl
								}
								__typename
							}
							__typename
						}
					}`,
				});

				const baseId = `installations.${installation.giid}`;

				if (overview.installation?.doorlocks) {
					for (const lock of overview.installation.doorlocks) {
						const uniqueKey = `${lock.deviceLabel || 'lock'}_${lock.area || 'unknown'}_${lock.deviceId || 'id'}`;
						const id = `${baseId}.doorlocks.${this.sanitizeId(uniqueKey)}`;
						await this.extendObjectAsync(id, {
							type: 'state',
							common: {
								name: lock.deviceLabel,
								type: 'string',
								role: 'state',
								read: true,
								write: false,
							},
							native: {},
						});
						await this.setState(id, { val: lock.doorLockState, ack: true });
					}
				}

				if (overview.installation?.cameras) {
					for (const camera of overview.installation.cameras) {
						const uniqueKey = `${camera.deviceLabel || 'camera'}_${camera.area || 'unknown'}_${camera.deviceId || 'id'}`;
						const id = `${baseId}.cameras.${this.sanitizeId(uniqueKey)}`;
						await this.extendObjectAsync(id, {
							type: 'state',
							common: {
								name: camera.deviceLabel,
								type: 'boolean',
								role: 'indicator.reachable',
								read: true,
								write: false,
							},
							native: {},
						});
						await this.setState(id, { val: !!camera.isOnline, ack: true });

						if (camera.image?.highResolutionUrl) {
							const imageId = `${id}.imageUrl`;
							await this.extendObjectAsync(imageId, {
								type: 'state',
								common: {
									name: `${camera.deviceLabel} image`,
									type: 'string',
									role: 'url',
									read: true,
									write: false,
								},
								native: {},
							});
							await this.setState(imageId, { val: camera.image.highResolutionUrl, ack: true });
						}
					}
				}
			}
		} catch (error) {
			this.log.error(`Failed to sync devices: ${(error as Error).message}`);
		}
	}

	private sanitizeId(label: string): string {
		const sanitized = label
			.replace(/[^a-zA-Z0-9-_]/g, '_')
			.replace(/_+/g, '_')
			.replace(/^_+|_+$/g, '');
		return sanitized || 'unknown';
	}
}
if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Verisure(options);
} else {
	// otherwise start the instance directly
	(() => new Verisure())();
}
