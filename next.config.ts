import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
	/* config options here */
	experimental: {
		agentFeedback: true,
		// retries navigations/actions after a network drop; powers useOffline()
		useOffline: true,
	},
	env: {
		// Inlined, so client code gets the version without bundling package.json.
		APP_VERSION: pkg.version,
	},
	cacheComponents: true,
	partialPrefetching: true,
	turbopack: {
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
	devIndicators: false,
};

export default nextConfig;
