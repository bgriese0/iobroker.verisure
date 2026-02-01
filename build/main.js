"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_verisure = __toESM(require("verisure"));
class Verisure extends utils.Adapter {
  pollTimer;
  client;
  refreshPromise;
  constructor(options = {}) {
    super({
      ...options,
      name: "verisure"
    });
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  /**
   * Is called when databases are connected and adapter received configuration.
   */
  async onReady() {
    if (!this.config.email || !this.config.password) {
      this.log.error("Email and password are required in adapter configuration");
      return;
    }
    this.client = new import_verisure.default(this.config.email, this.config.password);
    await this.syncDevices();
    const intervalMs = Math.max(30, this.config.pollInterval || 300) * 1e3;
    this.pollTimer = this.setInterval(() => this.syncDevices(), intervalMs);
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    try {
      if (this.pollTimer) {
        this.clearInterval(this.pollTimer);
      }
      callback();
    } catch (error) {
      this.log.error(`Error during unloading: ${error.message}`);
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
  onStateChange(id, state) {
    if (state) {
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
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
  async syncDevices() {
    var _a, _b, _c;
    if (!this.client) return;
    try {
      if (!this.refreshPromise) {
        this.refreshPromise = this.client.getToken();
      }
      await this.refreshPromise;
      this.refreshPromise = void 0;
      const installations = await this.client.getInstallations();
      for (const installation of installations) {
        const client = installation.client.bind(installation);
        const overview = await client({
          operationName: "overview",
          variables: { giid: installation.giid },
          query: `query overview($giid: String!) {
						installation(giid: $giid) {
							doorlocks {
								deviceLabel
								area
								doorLockState
								__typename
							}
							cameras {
								deviceLabel
								area
								isOnline
								image {
									highResolutionUrl
								}
								__typename
							}
							__typename
						}
					}`
        });
        const baseId = `installations.${installation.giid}`;
        if ((_a = overview.installation) == null ? void 0 : _a.doorlocks) {
          for (const lock of overview.installation.doorlocks) {
            const id = `${baseId}.doorlocks.${this.sanitizeId(lock.deviceLabel)}`;
            await this.extendObjectAsync(id, {
              type: "state",
              common: {
                name: lock.deviceLabel,
                type: "string",
                role: "state",
                read: true,
                write: false
              },
              native: {}
            });
            await this.setState(id, { val: lock.doorLockState, ack: true });
          }
        }
        if ((_b = overview.installation) == null ? void 0 : _b.cameras) {
          for (const camera of overview.installation.cameras) {
            const id = `${baseId}.cameras.${this.sanitizeId(camera.deviceLabel)}`;
            await this.extendObjectAsync(id, {
              type: "state",
              common: {
                name: camera.deviceLabel,
                type: "boolean",
                role: "indicator.reachable",
                read: true,
                write: false
              },
              native: {}
            });
            await this.setState(id, { val: !!camera.isOnline, ack: true });
            if ((_c = camera.image) == null ? void 0 : _c.highResolutionUrl) {
              const imageId = `${id}.imageUrl`;
              await this.extendObjectAsync(imageId, {
                type: "state",
                common: {
                  name: `${camera.deviceLabel} image`,
                  type: "string",
                  role: "url",
                  read: true,
                  write: false
                },
                native: {}
              });
              await this.setState(imageId, { val: camera.image.highResolutionUrl, ack: true });
            }
          }
        }
      }
    } catch (error) {
      this.log.error(`Failed to sync devices: ${error.message}`);
    }
  }
  sanitizeId(id) {
    return id.replace(/[^a-zA-Z0-9-_]/g, "_");
  }
}
if (require.main !== module) {
  module.exports = (options) => new Verisure(options);
} else {
  (() => new Verisure())();
}
//# sourceMappingURL=main.js.map
