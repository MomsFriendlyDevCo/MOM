import {DotEnv} from '@momsfriendlydevco/dotenv';
import os from 'node:os';

let config = new DotEnv()
	.parse([ // Process .env imports in user order
		'.env.example', // Base config
		`.env.${process.env.NODE_ENV}`, // .env.$NODE_ENV
		`.env.${process.env.USER.toLowerCase()}`, // .env.$USERNAME
		`.env.${os.hostname().toLowerCase()}`, // .env.$HOSTNAME
		'.env', // Just .env
	])
	.schema({
		MOM_SERVER_NAME: {type: String, default: process.env.HOSTNAME},
		MOM_SERVER_TITLE: {type: String, default: process.env.HOSTNAME},

		// TODO: Expose more caching config
		MOM_CACHE_METHOD: {type: Array, default: 'filesystem'},
	})

export default config.value();
