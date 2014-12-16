//////////////////////////////////////////////////////////////////
//			███████╗██╗      █████╗  ██████╗██╗  ██╗ 			//
//			██╔════╝██║     ██╔══██╗██╔════╝██║ ██╔╝ 			//
//			███████╗██║     ███████║██║     █████╔╝  			//
//			╚════██║██║     ██╔══██║██║     ██╔═██╗  			//
//			███████║███████╗██║  ██║╚██████╗██║  ██╗ 			//
//			╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ 			//
//			    14-12-14 | xBytez | me@xbytez.eu				//
//////////////////////////////////////////////////////////////////

// Requiring our module
var slackAPI = require('slackAPI');

// Starting
var slack = new slackAPI("TOKENHERE");

slack.on('message', function(data) {
	if(typeof data.text == 'undefined') return;
	if(data.text === 'cake!!') slack.sendMsg(data.channel, "@"+slack.getUser(data.user).name+" OOH, CAKE!! :cake:")
	if(data.text.charAt(0) === '%') {
		var command = data.text.substring(1).split(' ');

		if (typeof command[2] != "undefined") {
			for (var i = 2; i < command.length; i++) {
				command[1] = command[1] + ' ' + command[i];
			}
		}

		switch (command[0].toLowerCase()) {
			case "hello":
				slack.sendMsg(data.channel, "Oh, hello @"+slack.getUser(data.user).name+" !")
			break;

			case "hue":
				slack.sendMsg(data.channel, "@"+slack.getUser(data.user).name+" brbrbrbrbrb!")
			break;

			case "say":
				var say = data.text.split('%say ');
				slack.sendMsg(data.channel, say[1]);               
			break;

			case "debug":
				console.log(slack.data.ims);
			break;
		}
	}
});
