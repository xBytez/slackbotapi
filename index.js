//////////////////////////////////////////////////////////////////
//			███████╗██╗      █████╗  ██████╗██╗  ██╗ 			//
//			██╔════╝██║     ██╔══██╗██╔════╝██║ ██╔╝ 			//
//			███████╗██║     ███████║██║     █████╔╝  			//
//			╚════██║██║     ██╔══██║██║     ██╔═██╗  			//
//			███████║███████╗██║  ██║╚██████╗██║  ██╗ 			//
//			╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ 			//
//			    14-12-14 | xBytez | me@xbytez.eu				//
//////////////////////////////////////////////////////////////////

// Requiring node modules.
var webSocket = require('ws'),
	request	  = require('request');

// Defining variables
var reqAPI = function(method, data, callback) {
    request.post('https://slack.com/api/'+method, function (error, response, body) {
        if (!error && response.statusCode == 200) {
        	if(!callback) { return JSON.parse(body); } else { return callback(JSON.parse(body)); }
        }
    }).form(data);
}
var connectSlack = function(wsurl) {
    ws = new webSocket(wsurl);
    ws.on('open', function() {
    	console.log("[Socket] Connected");
    });
    ws.on('message', function(data) {
    	console.log(data);
    });
}
var slackAPI = function(token) {
	if (!token || typeof token !== 'string' || !token.match(/^([a-z]*)\-([0-9]*)\-([0-9a-zA-Z]*)/)) {
		console.log('Please include a valid authentication token');
		process.exit(1);
	}

	reqAPI('rtm.start', {'token': token}, function(data) {
		this.self = data.self; 
		this.team = data.team;	
		this.channels = data.channels;
		this.groups = data.groups;
		this.users = data.users;
		this.ims = data.ims;
		connectSlack(data.url);
	});
}
slackAPI.prototype.reqAPI = reqAPI;

// 

module.exports = slackAPI;