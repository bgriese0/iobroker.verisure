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
var import_request = __toESM(require("request"));
var import_object_assign = __toESM(require("object-assign"));
var import_auto = require("es6-promise/auto");
class Verisure extends utils.Adapter {
  verisureConfig;
  formData = {};
  authenticated = false;
  alarmStatus = {};
  climateData = [];
  firstAlarmPoll;
  firstClimatePoll;
  alarmFetchTimeout = 30 * 1e3;
  climateFetchTimeout = 30 * 60 * 1e3;
  errorTimeout = 10 * 60 * 1e3;
  listeners = {
    climateChange: [],
    alarmChange: []
  };
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
    if (!this.config.username || !this.config.password) {
      this.log.error("Username and password are required for Verisure API");
      return;
    }
    this.verisureConfig = (0, import_object_assign.default)(
      {
        username: "",
        password: "",
        domain: "https://mypages.verisure.com",
        installationId: "",
        auth_path: "/j_spring_security_check?locale=sv_SE",
        alarmstatus_path: "/remotecontrol?_=",
        climatedata_path: "/overview/climatedevice?_=",
        alarmFields: ["type", "statusType", "date", "name", "changedVia"],
        climateFields: ["location", "humidity", "temperature", "timestamp"]
      },
      {
        username: this.config.username,
        password: this.config.password,
        domain: this.config.domain || "https://mypages.verisure.com",
        installationId: this.config.installationId || ""
      }
    );
    this.formData = {
      j_username: this.verisureConfig.username,
      j_password: this.verisureConfig.password
    };
    import_request.default = import_request.default.defaults({ jar: true });
    this.engage();
  }
  /**
   * Is called when adapter shuts down - callback has to be called under any circumstances!
   *
   * @param callback - Callback function
   */
  onUnload(callback) {
    try {
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
      if (state.ack === false) {
        this.log.info(`User command received for ${id}: ${state.val}`);
      }
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
  filterByKeys(obj, keysArr) {
    const filtered = {};
    for (const key of Object.keys(obj)) {
      if (keysArr.includes(key)) {
        filtered[key] = obj[key];
      }
    }
    return filtered;
  }
  dispatch(service, data) {
    for (const listener of this.listeners[service]) {
      listener(data);
    }
  }
  requestPromise(options) {
    return new Promise((resolve, reject) => {
      (0, import_request.default)(options, (error, response, body) => {
        if (options.json && response && response.headers["content-type"] !== "application/json;charset=UTF-8") {
          error = { state: "error", message: "Expected JSON, but got html" };
        } else if (body && body.state === "error") {
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
  authenticate() {
    const authUrl = this.verisureConfig.domain + this.verisureConfig.auth_path;
    const requestParams = {
      url: authUrl,
      form: this.formData,
      method: "POST"
    };
    return this.authenticated ? Promise.resolve(true) : this.requestPromise(requestParams);
  }
  fetchAlarmStatus() {
    let alarmstatusUrl = this.verisureConfig.domain;
    if (this.verisureConfig.installationId) {
      alarmstatusUrl += `/installation/${this.verisureConfig.installationId}`;
    }
    alarmstatusUrl += this.verisureConfig.alarmstatus_path + Date.now();
    return this.requestPromise({ url: alarmstatusUrl, json: true });
  }
  fetchClimateData() {
    let climatedataUrl = this.verisureConfig.domain;
    if (this.verisureConfig.installationId) {
      climatedataUrl += `/installation/${this.verisureConfig.installationId}`;
    }
    climatedataUrl += this.verisureConfig.climatedata_path + Date.now();
    return this.requestPromise({ url: climatedataUrl, json: true });
  }
  parseAlarmData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return Promise.resolve(data);
    }
    const filtered = this.filterByKeys(data[0], this.verisureConfig.alarmFields);
    setTimeout(() => this.pollAlarmStatus(), this.alarmFetchTimeout);
    if (JSON.stringify(filtered) !== JSON.stringify(this.alarmStatus)) {
      this.alarmStatus = filtered;
      this.dispatch("alarmChange", filtered);
    }
    return Promise.resolve(filtered);
  }
  parseClimateData(data) {
    if (!Array.isArray(data)) {
      return Promise.resolve(data);
    }
    const filtered = data.map(
      (set) => this.filterByKeys(set, this.verisureConfig.climateFields)
    );
    setTimeout(() => this.pollClimateData(), this.climateFetchTimeout);
    if (JSON.stringify(filtered) !== JSON.stringify(this.climateData)) {
      this.climateData = filtered;
      this.dispatch("climateChange", filtered);
    }
    return Promise.resolve(filtered);
  }
  pollAlarmStatus() {
    return this.fetchAlarmStatus().then((data) => this.parseAlarmData(data));
  }
  pollClimateData() {
    return this.fetchClimateData().then((data) => this.parseClimateData(data));
  }
  gotAlarmStatus() {
    return Object.keys(this.alarmStatus).length !== 0;
  }
  gotClimateData() {
    return Object.keys(this.climateData).length !== 0;
  }
  getAlarmStatus() {
    if (this.gotAlarmStatus()) {
      return Promise.resolve(this.alarmStatus);
    }
    return this.firstAlarmPoll;
  }
  getClimateData() {
    if (this.gotClimateData()) {
      return Promise.resolve(this.climateData);
    }
    return this.firstClimatePoll;
  }
  onError(err) {
    setTimeout(() => this.engage(), this.errorTimeout);
    this.log.error(`Verisure request failed: ${JSON.stringify(err)}`);
  }
  engage() {
    this.firstAlarmPoll = this.authenticate().then(() => this.pollAlarmStatus());
    this.firstClimatePoll = this.firstAlarmPoll.then(() => this.pollClimateData()).catch((err) => this.onError(err));
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
  module.exports = (options) => new Verisure(options);
} else {
  (() => new Verisure())();
}
//# sourceMappingURL=main.js.map
