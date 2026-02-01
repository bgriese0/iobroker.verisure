/*
 * Created with @iobroker/create-adapter v3.1.2
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

// Load your modules here, e.g.:
// import * as fs from 'fs';

class Verisure extends utils.Adapter {
	/**
	 * Adapter constructor
	 *
	 * @param options Adapter options
	 */
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
		// Initialize your adapter here

		// The adapters config (in the instance object everything under the attribute "native") is accessible via
		// this.config:
		this.log.debug(`config username: ${this.config.username}`);

		/*
		For every state in the system there has to be also an object of type state
		Here a simple template for a boolean variable named "testVariable"
		Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables

		IMPORTANT: State roles should be chosen carefully based on the state's purpose.
		           Please refer to the state roles documentation for guidance:
		           https://www.iobroker.net/#en/documentation/dev/stateroles.md
		*/
		// Basic validation of credentials
		if (!this.config.username || !this.config.password) {
			this.log.warn('Please configure username and password for Verisure account');
			return;
		}

		await this.setObjectNotExistsAsync('info.connection', {
			type: 'state',
			common: {
				name: 'Connection state',
				type: 'boolean',
				role: 'indicator.connected',
				read: true,
				write: false,
				def: false,
			},
			native: {},
		});

		try {
			const authenticated = await this.authenticate(this.config.username, this.config.password);
			await this.setState('info.connection', { val: authenticated, ack: true });
			if (authenticated) {
				this.log.info('Successfully authenticated to Verisure');
			} else {
				this.log.warn('Authentication to Verisure failed, please verify credentials');
			}
		} catch (error) {
			this.log.error(`Failed to authenticate to Verisure: ${(error as Error).message}`);
			await this.setState('info.connection', { val: false, ack: true });
		}
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
		if (!state) {
			this.log.info(`state ${id} deleted`);
			return;
		}
		if (state.ack === false) {
			this.log.info(`Command received for ${id}: ${state.val}`);
			// TODO: implement command handling for Verisure actions
		}
	}

	private async authenticate(username: string, password: string): Promise<boolean> {
		// TODO: replace with real Verisure API call
		this.log.debug(`Authenticating to Verisure as ${username}`);
		void password;
		// Minimal placeholder to show intent; always return false for now
		await Promise.resolve();
		return false;
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

export default Verisure;
if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Verisure(options);
} else {
	// otherwise start the instance directly
	(() => new Verisure())();
}
