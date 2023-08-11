const path = require('path');

module.exports = {
	mode: "development",
	entry: './src/vcard.js',
	output: {
		filename: 'ez-vcard.js',
		path: path.resolve(__dirname, 'dist'),
		globalObject: 'this',
		library: {
			name: "VCard",
			type: "umd"
		}
	},
	optimization: {
        minimize: false
    }
};