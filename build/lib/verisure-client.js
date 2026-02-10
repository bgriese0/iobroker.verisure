"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var verisure_client_exports = {};
__export(verisure_client_exports, {
  GraphqlError: () => GraphqlError,
  Verisure: () => Verisure,
  VerisureInstallation: () => VerisureInstallation,
  default: () => verisure_client_default
});
module.exports = __toCommonJS(verisure_client_exports);
var import_axios = __toESM(require("axios"));
class GraphqlError extends Error {
  errors;
  /**
   * Constructor for GraphqlError
   *
   * @param errors - Array of GraphQL errors
   */
  constructor(errors) {
    super();
    this.name = "GraphqlException";
    this.message = `GraphQL response contains ${errors.length} errors`;
    this.errors = errors;
  }
}
class VerisureInstallation {
  giid;
  locale;
  config;
  baseClient;
  /**
   * Constructor for VerisureInstallation
   *
   * @param installation - Installation configuration object
   * @param client - Client function for making requests
   */
  constructor(installation, client) {
    this.giid = installation.giid;
    this.locale = installation.locale;
    this.config = installation;
    this.baseClient = client;
  }
  /**
   * Make a client request with installation-specific context
   *
   * @param options - Request options
   * @param options.variables - Optional variables to include in the request
   * @returns Promise resolving to the response
   */
  client(options) {
    const { variables, ...otherOptions } = options;
    return this.baseClient({
      ...otherOptions,
      variables: {
        giid: this.giid,
        ...variables
      }
    });
  }
}
const HOSTS = ["automation01.verisure.com", "automation02.verisure.com"];
class Verisure {
  host;
  email;
  password;
  cookies;
  promises;
  /**
   * Constructor for Verisure client
   *
   * @param email - User email address
   * @param password - User password
   * @param cookies - Optional array of cookies for authentication
   */
  constructor(email, password, cookies = []) {
    [this.host] = HOSTS;
    this.email = email;
    this.password = password;
    this.promises = {};
    this.cookies = cookies;
  }
  /**
   * Make a request to the Verisure API
   *
   * @param options - Axios request options
   * @param changeHost - Whether to change to the alternate host
   * @returns Promise resolving to the axios response
   */
  async makeRequest(options, changeHost = false) {
    if (changeHost) {
      const currentIndex = HOSTS.indexOf(this.host);
      this.host = HOSTS[(currentIndex + 1) % HOSTS.length];
    }
    const request = {
      ...options,
      baseURL: `https://${this.host}/`,
      headers: {
        "User-Agent": "node-verisure",
        accept: "application/json",
        ...options.headers || {}
      }
    };
    if (this.cookies) {
      request.headers.Cookie = this.cookies.join(";");
    }
    try {
      const response = await (0, import_axios.default)(request);
      if (response.data.errors) {
        throw new GraphqlError(response.data.errors);
      }
      return response;
    } catch (error) {
      if (!changeHost) {
        const { status } = error.response || {};
        const httpCode5xx = status > 499;
        const errorCode5xx = error.errors && error.errors.find(({ data }) => data.status > 499);
        if (httpCode5xx || errorCode5xx) {
          return this.makeRequest(options, true);
        }
        if (status === 401 && !options.refreshingCookies) {
          await this.refreshCookies();
          return this.makeRequest(options);
        }
      }
      throw error;
    }
  }
  /**
   * Refresh authentication cookies
   */
  async refreshCookies() {
    const { headers } = await this.makeRequest({
      method: "get",
      url: "/auth/token",
      refreshingCookies: true
    });
    this.setCookies(headers["set-cookie"]);
  }
  /**
   * Set cookies for authentication
   *
   * @param cookies - Array of cookie strings
   */
  setCookies(cookies) {
    this.cookies = cookies ? cookies.map((cookie) => cookie.split(";")[0]) : [];
  }
  /**
   * Get a cookie by prefix
   *
   * @param prefix - Cookie name prefix
   * @returns Cookie string or undefined
   */
  getCookie(prefix) {
    return this.cookies.find((cookie) => cookie.startsWith(prefix));
  }
  /**
   * Make a GraphQL client request
   *
   * @param request - GraphQL request object
   * @returns Promise resolving to the response data
   */
  client(request) {
    const requestRef = JSON.stringify(request);
    const promise = this.promises[requestRef];
    if (promise !== void 0) {
      return promise;
    }
    const newPromise = this.makeRequest({
      method: "post",
      url: "/graphql",
      data: request
    }).then(({ data: { data } }) => {
      delete this.promises[requestRef];
      return data;
    }).catch((error) => {
      delete this.promises[requestRef];
      throw error;
    });
    this.promises[requestRef] = newPromise;
    return newPromise;
  }
  /**
   * Get authentication token and cookies
   *
   * @param code - Optional MFA code
   * @returns Promise resolving to array of cookies
   */
  async getToken(code) {
    let authRequest = {
      method: "post",
      url: "/auth/login",
      data: {},
      // Ensure a non-empty JSON body so axios sends Content-Type: application/json.
      auth: {
        username: this.email,
        password: this.password
      }
    };
    if (code) {
      authRequest = {
        method: "post",
        url: "/auth/mfa/validate",
        data: { token: code }
      };
    }
    const { headers } = await this.makeRequest(authRequest);
    this.setCookies(headers["set-cookie"]);
    const vsStepupCookie = this.getCookie("vs-stepup");
    if (vsStepupCookie) {
      await this.makeRequest({
        method: "post",
        url: "/auth/mfa"
      });
    }
    return this.cookies;
  }
  /**
   * Get all installations for the authenticated user
   *
   * @returns Promise resolving to array of VerisureInstallation objects
   */
  async getInstallations() {
    const {
      account: { installations }
    } = await this.client({
      operationName: "fetchAllInstallations",
      variables: { email: this.email },
      query: `query fetchAllInstallations($email: String!){
        account(email: $email) {
          installations {
            giid
            alias
            customerType
            dealerId
            subsidiary
            pinCodeLength
            locale
            address {
              street
              city
              postalNumber
              __typename
            }
            __typename
          }
          __typename
        }
      }`
    });
    return installations.map((installation) => new VerisureInstallation(installation, this.client.bind(this)));
  }
}
var verisure_client_default = Verisure;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GraphqlError,
  Verisure,
  VerisureInstallation
});
//# sourceMappingURL=verisure-client.js.map
