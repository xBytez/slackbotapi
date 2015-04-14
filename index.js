//////////////////////////////////////////////////////////////////
//      ███████╗██╗      █████╗  ██████╗██╗  ██╗    //
//      ██╔════╝██║     ██╔══██╗██╔════╝██║ ██╔╝    //
//      ███████╗██║     ███████║██║     █████╔╝     //
//      ╚════██║██║     ██╔══██║██║     ██╔═██╗     //
//      ███████║███████╗██║  ██║╚██████╗██║  ██╗    //
//      ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    //
//          14-12-14 | xBytez | me@xbytez.eu        //
//////////////////////////////////////////////////////////////////

// Requiring node modules.
var     os      = require('os'),
    webSocket   = require('ws'),
    request     = require('request'),
    logger      = require('jethro'),
    EventEmitter2   = require('eventemitter2').EventEmitter2;

// Starting the logger and EventEmitter
EventEmitter = new EventEmitter2({
    wildcard: true,
    delimiter: ':'
});

// Defining variables
var slackData = {}, i = 0, token = '', logging;

// Core functions
var outputLog = function(obj) {
    if(logging) {
        logger.output(obj);
    }
}
var reqAPI = function(method, data, callback) {
    data.token = token;
    request.post('https://slack.com/api/'+method, function (error, response, body) {
 if (!error && response.statusCode == 200) {
    if(!callback) { return JSON.parse(body); } else { return callback(JSON.parse(body)); }
 }
    }).form(data);
}
var sendSock = function(data) {
    if(typeof data !== "undefined") {
        data.id = i;
        data = JSON.stringify(data);
        outputLog({severity:'debug', source:'Socket | Send',message: data,timestamp: new Date(),location: os.hostname()});
        ws.send(data);
        i++;
    } else outputLog({severity:'error', source:'Socket | Send',message:'No arguments.',timestamp: new Date(),location: os.hostname()});
}
var connectSlack = function(wsurl) {
    ws = new webSocket(wsurl);
    ws.on('open', function() {
        outputLog({severity:'info', source:'Socket',message:'Connected as '+slackData.self.name+' ['+slackData.self.id+'].',timestamp: new Date(),location: os.hostname()});
    });
    ws.on('close', function(data) {
        outputLog({severity:'error', source:'Socket',message:'Disconnected. Error: '+data,timestamp: new Date(),location: os.hostname()});
    });
    ws.on('close', function(data) {
        outputLog({severity:'error', source:'Socket',message:'Error. Error: '+data,timestamp: new Date(),location: os.hostname()});
    });
    ws.on('message', function(data) {
        outputLog({severity:'debug', source:'Socket | Receive',message: data,timestamp: new Date(),location: os.hostname()});
        data = JSON.parse(data);
        if(typeof data.type != 'undefined') EventEmitter.emit(slackAPI['events'][data.type], data);
    });
}

// __init__
var slackAPI = function(args) {
    if(typeof args !== 'object') {
        logging = true;
        logger.init();
        outputLog({severity:'error', source:'Slack API',message:'Invalid arguments! Please provide an object with settings.',timestamp: new Date(),location: os.hostname()});
        process.exit(1);
    }
    var authtoken = args['token'];
    if(typeof args['logging'] !== 'boolean') {
        logging = true;
        logger.init();
        outputLog({severity:'error', source:'Slack API',message:'Invalid arguments! Please provide a valid boolean for logging.',timestamp: new Date(),location: os.hostname()});
    } else {
        if(logging === true) { logging.init(); }
        logging = args['logging'];
    }
    if (!authtoken || typeof authtoken !== 'string' || !authtoken.match(/^([a-z]*)\-([0-9]*)\-([0-9a-zA-Z]*)/)) {
        logger = true;
        logger.init();
        outputLog({severity:'error', source:'Slack API',message:'Invalid arguments! Please provide a valid auth token.',timestamp: new Date(),location: os.hostname()});
        process.exit(1);
    }

    token = authtoken;
    reqAPI('rtm.start', {}, function(data) {
        slackData.self = data.self;
        slackData.team = data.team;
        slackData.channels = data.channels;
        slackData.groups = data.groups;
        slackData.users = data.users;
        slackData.ims = data.ims;
        connectSlack(data.url);
    });
}

// Events
slackAPI.events = {
    hello: 'hello',
    message: 'message',
    channel_marked: 'channel_marked',
    channel_created: 'channel_created',
    channel_joined: 'channel_joined',
    channel_left: 'channel_left',
    channel_deleted: 'channel_deleted',
    channel_rename: 'channel_rename',
    channel_archive: 'channel_archive',
    channel_unarchive: 'channel_unarchive',
    channel_history_changed: 'channel_history_changed',
    im_created: 'im_created',
    im_open: 'im_open',
    im_close: 'im_close',
    im_marked: 'im_marked',
    im_history_changed: 'im_history_changed',
    group_joined: 'group_joined',
    group_left: 'group_left',
    group_open: 'group_open',
    group_close: 'group_close',
    group_archive: 'group_archive',
    group_unarchive: 'group_unarchive',
    group_rename: 'group_rename',
    group_marked: 'group_marked',
    group_history_changed: 'group_history_changed',
    file_created: 'file_created',
    file_shared: 'file_shared',
    file_unshared: 'file_unshared',
    file_public: 'file_public',
    file_private: 'file_private',
    file_change: 'file_change',
    file_deleted: 'file_deleted',
    file_comment_added: 'file_comment_added',
    file_comment_edited: 'file_comment_edited',
    file_comment_deleted: 'file_comment_deleted',
    pong: 'pong',
    presence_change: 'presence_change',
    manual_presence_change: 'manual_presence_change',
    pref_change: 'pref_change',
    user_change: 'user_change',
    user_typing: 'user_typing',
    team_join: 'team_join',
    star_added: 'star_added',
    star_removed: 'star_removed',
    emoji_changed: 'emoji_changed',
    commands_changed: 'commands_changed',
    team_pref_change: 'team_pref_change',
    team_rename: 'team_rename',
    team_domain_change: 'team_domain_change',
    email_domain_changed: 'email_domain_changed',
    bot_added: 'bot_added',
    bot_changed: 'bot_changed',
    accounts_changed: 'accounts_changed'
};

// Protoypes
slackAPI.prototype.reqAPI = reqAPI;
slackAPI.prototype.data = slackData;
slackAPI.prototype.logger = logger.output;
slackAPI.prototype.ping = function() {
    sendSock({'type': 'ping'});
    return this;
}
slackAPI.prototype.getChannel = function(term) {
    for(var i in slackData.channels) {
            if(slackData.channels[i]['name'] === term) var channel = slackData.channels[i];
    }
    if(typeof channel == 'undefined') {
        for(var i in slackData.channels) {
            if(slackData.channels[i]['id'] === term) var channel = slackData.channels[i];
        }
    }
    return channel;
}
slackAPI.prototype.getUser = function(term) {
    for(var i in slackData.users) {
            if(slackData.users[i]['name'] === term) var user = slackData.users[i];
    }
    if(typeof user == 'undefined') {
        for(var i in slackData.users) {
            if(slackData.users[i]['id'] === term) var user = slackData.users[i];
        }
    }
    return user;
}
slackAPI.prototype.getUserByEmail = function(term) {
	for(var i in slackData.users) {
			if(slackData.users[i]['profile']['email'] === term) var user = slackData.users[i];
	}
	if(typeof user == 'undefined') {
		for(var i in slackData.users) {
			if(slackData.users[i]['id'] === term) var user = slackData.users[i];
		}
	}
	return user;
}
slackAPI.prototype.getIM = function(term) {
    for(var i in slackData.ims) {
            if(slackData.ims[i]['user'] === term) var im = slackData.ims[i];
    }
    if(typeof im == 'undefined') {
        for(var i in slackData.ims) {
            if(slackData.ims[i]['user'] === this.getUser(term).id) var im = slackData.ims[i];
        }
    }
    if(typeof im == 'undefined') {
        for(var i in slackData.ims) {
            if(slackData.ims[i]['id'] === term) var im = slackData.ims[i];
        }
    }
    return im;
}
slackAPI.prototype.sendMsg = function(channel, text) {
    sendSock({'type': 'message', 'channel': channel, 'text': text});
    return this;
}
slackAPI.prototype.sendPM = function(user, text) {
    sendSock({'type': 'message', 'channel': this.getIM(user).id, 'text': text});
    return this;
}

// Event prototypes
slackAPI.prototype.addListener = function() {
    EventEmitter.addListener.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.on = function() {
    EventEmitter.on.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.onAny = function() {
    EventEmitter.onAny.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.offAny = function() {
    EventEmitter.offAny.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.once = function() {
    EventEmitter.once.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.many = function() {
    EventEmitter.many.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.removeListener = function() {
    EventEmitter.removeListener.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.off = function() {
    EventEmitter.off.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.removeAllListeners = function() {
    EventEmitter.removeAllListeners.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.setMaxListeners = function() {
    EventEmitter.setMaxListeners.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.listeners = function() {
    EventEmitter.listeners.apply(EventEmitter, arguments);
    return this;
};
slackAPI.prototype.emit = function() {
    EventEmitter.emit.apply(EventEmitter, arguments);
    return this;
};

module.exports = slackAPI;

