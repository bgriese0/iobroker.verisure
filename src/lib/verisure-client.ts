/**
 * Verisure API Client
 * Based on node-verisure package: https://github.com/ptz0n/node-verisure
 * Adapted for ioBroker.verisure adapter
 */

import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

/**
 * GraphQL Error class
 */
export class GraphqlError extends Error {
	public errors: any[];

	/**
	 * Constructor for GraphqlError
	 *
	 * @param errors - Array of GraphQL errors
	 */
	constructor(errors: any[]) {
		super();
		this.name = 'GraphqlException';
		this.message = `GraphQL response contains ${errors.length} errors`;
		this.errors = errors;
	}
}

/**
 * Verisure Installation class
 */
export class VerisureInstallation {
	public giid: string;
	public locale: string;
	public config: any;
	private baseClient: (request: any) => Promise<any>;

	/**
	 * Constructor for VerisureInstallation
	 *
	 * @param installation - Installation configuration object
	 * @param client - Client function for making requests
	 */
	constructor(installation: any, client: (request: any) => Promise<any>) {
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
	client(options: { variables?: any; [key: string]: any }): Promise<any> {
		const { variables, ...otherOptions } = options;
		return this.baseClient({
			...otherOptions,
			variables: {
				giid: this.giid,
				...variables,
			},
		});
	}
}

/**
 * Main Verisure API Client
 */
const HOSTS = ['automation01.verisure.com', 'automation02.verisure.com'];

export class Verisure {
	private host: string;
	private email: string;
	private password: string;
	private cookies: string[];
	private promises: Record<string, Promise<any>>;

	/**
	 * Constructor for Verisure client
	 *
	 * @param email - User email address
	 * @param password - User password
	 * @param cookies - Optional array of cookies for authentication
	 */
	constructor(email: string, password: string, cookies: string[] = []) {
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
	async makeRequest(
		options: AxiosRequestConfig & {
			refreshingCookies?: boolean;
		},
		changeHost = false,
	): Promise<AxiosResponse> {
		if (changeHost) {
			this.host = HOSTS[+!HOSTS.indexOf(this.host)];
		}

		const request: AxiosRequestConfig = {
			...options,
			baseURL: `https://${this.host}/`,
			headers: {
				'User-Agent': 'node-verisure',
				accept: 'application/json',
				...(options.headers || {}),
			},
		};

		if (this.cookies) {
			request.headers!.Cookie = this.cookies.join(';');
		}

		try {
			const response = await axios(request);

			if (response.data.errors) {
				throw new GraphqlError(response.data.errors);
			}

			return response;
		} catch (error: any) {
			if (!changeHost) {
				const { status } = error.response || {};

				const httpCode5xx = status > 499;
				// SYS_00004 - SERVICE_UNAVAILABLE
				const errorCode5xx = error.errors && error.errors.find(({ data }: any) => data.status > 499);
				if (httpCode5xx || errorCode5xx) {
					// Retry with a different hostname.
					return this.makeRequest(options, true);
				}

				// Cookie expired and need to be refreshed.
				if (status === 401 && !options.refreshingCookies) {
					await this.refreshCookies();
					return this.makeRequest(options);
				}
			}

			// Already tried a different hostname or got HTTP 300-400.
			throw error;
		}
	}

	/**
	 * Refresh authentication cookies
	 */
	async refreshCookies(): Promise<void> {
		const { headers } = await this.makeRequest({
			method: 'get',
			url: '/auth/token',
			refreshingCookies: true,
		});

		this.setCookies(headers['set-cookie']);
	}

	/**
	 * Set cookies for authentication
	 *
	 * @param cookies - Array of cookie strings
	 */
	setCookies(cookies: string[] | undefined): void {
		this.cookies = cookies ? cookies.map(cookie => cookie.split(';')[0]) : [];
	}

	/**
	 * Get a cookie by prefix
	 *
	 * @param prefix - Cookie name prefix
	 * @returns Cookie string or undefined
	 */
	getCookie(prefix: string): string | undefined {
		return this.cookies.find(cookie => cookie.startsWith(prefix));
	}

	/**
	 * Make a GraphQL client request
	 *
	 * @param request - GraphQL request object
	 * @returns Promise resolving to the response data
	 */
	client(request: any): Promise<any> {
		const requestRef = JSON.stringify(request);
		const promise = this.promises[requestRef];
		if (promise !== undefined) {
			return promise;
		}

		const newPromise = this.makeRequest({
			method: 'post',
			url: '/graphql',
			data: request,
		})
			.then(({ data: { data } }) => {
				delete this.promises[requestRef];
				return data;
			})
			.catch(error => {
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
	async getToken(code?: string): Promise<string[]> {
		let authRequest: AxiosRequestConfig = {
			method: 'post',
			url: '/auth/login',
			data: {}, // Ensure a non-empty JSON body so axios sends Content-Type: application/json.
			auth: {
				username: this.email,
				password: this.password,
			},
		};

		if (code) {
			// 2. Continue MFA flow, send code.
			authRequest = {
				method: 'post',
				url: '/auth/mfa/validate',
				data: { token: code },
			};
		}

		const { headers } = await this.makeRequest(authRequest);
		this.setCookies(headers['set-cookie']);

		const vsStepupCookie = this.getCookie('vs-stepup');
		if (vsStepupCookie) {
			// 1. Start MFA flow, request code.
			await this.makeRequest({
				method: 'post',
				url: '/auth/mfa',
			});
		}

		return this.cookies;
	}

	/**
	 * Get all installations for the authenticated user
	 *
	 * @returns Promise resolving to array of VerisureInstallation objects
	 */
	async getInstallations(): Promise<VerisureInstallation[]> {
		const {
			account: { installations },
		} = await this.client({
			operationName: 'fetchAllInstallations',
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
      }`,
		});

		return installations.map((installation: any) => new VerisureInstallation(installation, this.client.bind(this)));
	}
}

export default Verisure;
