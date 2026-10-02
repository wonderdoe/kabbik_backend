const path = require("path");

const rootDir = __dirname;

module.exports = {
	apps: [
		{
			script: path.join(rootDir, "app.js"),
			cwd: rootDir,
			watch: false,
			exec_mode: "cluster",
			name: "primary-kabbik-backend",
			instances: "1",
			autorestart: true,
			env: {
				NODE_ENV: "production",
				TZ: "UTC",
			},
		},
	],
};