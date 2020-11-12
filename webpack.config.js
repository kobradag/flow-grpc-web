const path = require('path');

module.exports = {
	mode: "development", // "production" | "development" | "none"
	entry: "./index.js",
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
	},
	devtool:false,
	devServer:{
		https: false,
	    port: 8081,
	    contentBase:"./"
	}
};
