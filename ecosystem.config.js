module.exports = {
	apps: [
		{
			script: "./app.js",
			watch: false,
			exec_mode: "cluster",
			name: "primary-kabbik-backend",
			instances: "1",
			autorestart: true,
			env: {
				NODE_ENV: "production",
				TZ: "UTC",
			},
		}	 
	],
};