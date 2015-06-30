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
var os          = require('os');
var webSocket   = require('ws');
var request     = require('request');
var logger      = require('jethro');
var util        = require('util');
var EventEmitter= require('eventemitter3');

// Defining variables
var slackData = {};
var i = 0;
var token = '';
var logging;
var ws;

// Core functions
var out = function(severity, source, message) {
    if (logging) {
        logger(severity, source, message);
    }
};

var events = {
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
    pin_added: 'pin_added',
    pin_removed: 'pin_removed',
    presence_change: 'presence_change',
    manual_presence_change: 'manual_presence_change',
    pref_change: 'pref_change',
    user_change: 'user_change',
    user_typing: 'user_typing',
    team_join: 'team_join',
    team_migration_started: 'team_migration_started',
    star_added: 'star_added',
    star_removed: 'star_removed',
    emoji_changed: 'emoji_changed',
    commands_changed: 'commands_changed',
    team_plan_change: 'team_plan_change',
    team_pref_change: 'team_pref_change',
    team_rename: 'team_rename',
    team_domain_change: 'team_domain_change',
    email_domain_changed: 'email_domain_changed',
    bot_added: 'bot_added',
    bot_changed: 'bot_changed',
    accounts_changed: 'accounts_changed'
};

var reqAPI = function(method, data, callback) {
    data.token = token;
    request.post('https://slack.com/api/'+method, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            if (!callback) {
                return JSON.parse(body);
            } else {
                return callback(JSON.parse(body));
            }
        }
    }).form(data);
};

var sendSock = function(data) {
    if (typeof data !== "undefined") {
        data.id = i;
        data = JSON.stringify(data);
        out("debug", "Sender", "Send: "+data);
        ws.send(data);
        i++;
    } else {
        out('error', 'Sender', 'Send: No arguments specified!');
    }
};

function slackAPI(args) {
    var self = this;
    var authtoken = args['token'];
    if (typeof args !== 'object') {
        logging = true;
        out('error', 'Slack API', 'Invalid arguments! Please provide an object with settings.');
        process.exit(1);
    } if (typeof args['logging'] !== 'boolean') {
        logging = true;
        out('error', 'Slack API', 'Invalid arguments! Please provide a valid boolean for logging.');
    } else {
        logging = args['logging'];
    } if (!authtoken || typeof authtoken !== 'string' || !authtoken.match(/^([a-z]*)\-([0-9]*)\-([0-9a-zA-Z]*)/)) {
        logging = true;
        out('error', 'Slack API', 'Invalid arguments! Please provide a valid auth token.');
        process.exit(1);
    }

    token = authtoken;
    reqAPI('rtm.start', {}, function (data) {
        slackData.self = data.self;
        slackData.team = data.team;
        slackData.channels = data.channels;
        slackData.groups = data.groups;
        slackData.users = data.users;
        slackData.ims = data.ims;
        self.connectSlack(data.url, function(err, data){
            if (err){
                throw err;
            } else {
                self.emit(events[data.type], data);
            }
        });
    });
};

util.inherits(slackAPI, EventEmitter);

// Protoypes
slackAPI.prototype.reqAPI = reqAPI;
slackAPI.prototype.sendSock = sendSock;
slackAPI.prototype.data = slackData;
slackAPI.prototype.logger = logger.output;
slackAPI.prototype.ping = function() {
    sendSock({'type': 'ping'});
    return this;
};

slackAPI.prototype.connectSlack = function(wsurl, cb) {
    ws = new webSocket(wsurl);
    var self = this;
    ws.on('open', function() {
        out('info', 'Socket', 'Connected as '+slackData.self.name+' ['+slackData.self.id+'].');
        self.emit("open")
    }).on('close', function(data) {
        out('warning', 'Socket', 'Disconnected. Error: '+data);
        self.emit("close", data)
    }).on('error', function(data) {
        out('error', 'Socket', 'Error. Error: '+data);
        self.emit("error", data)
    }).on('message', function(data) {
        out('debug', 'Socket', "Recieved: " + data);
        data = JSON.parse(data);
        if (typeof data.type != 'undefined'){
            if (typeof events[data.type] !== 'undefined') {
                cb(null, data);
            }
        } else {
            cb(new Error("data.type not defined"));
        }
    });
};

slackAPI.prototype.getChannel = function(term) {
    var channel = null;
    for(var i in slackData.channels) {
        if(slackData.channels[i]['name'] === term) {
            channel = slackData.channels[i];
        }
    }
    if (channel === null) {
        for(var i_ in slackData.channels) {
            if(slackData.channels[i_]['id'] === term) {
                channel = slackData.channels[i_];
            }
        }
    }
    return channel;
};

slackAPI.prototype.getUser = function(term) {
    var user = null;
    for(var i in slackData.users) {
        if(slackData.users[i]['name'] === term) {
            user = slackData.users[i];
        }
    }
    if (user === null) {
        for(var i_ in slackData.users) {
            if(slackData.users[i_]['id'] === term) {
                user = slackData.users[i_];
            }
        }
    }
    return user;
};

slackAPI.prototype.getUserByEmail = function(term) {
    var user = null;
    for(var i in slackData.users) {
        if(slackData.users[i]['profile']['email'] === term) {
            user = slackData.users[i];
        }
    }
    if (user === null) {
        for(var i_ in slackData.users) {
            if(slackData.users[i_]['id'] === term) {
                user = slackData.users[i_];
            }
        }
    }
    return user;
};

slackAPI.prototype.getIM = function(term) {
    var im = null;
    for (var i in slackData.ims) {
        if(slackData.ims[i]['user'] === term) {
            im = slackData.ims[i];
        }
    }
    if (im === null) {
        for (var i_ in slackData.ims) {
            if (slackData.ims[i_]['user'] === this.getUser(term).id) {
                im = slackData.ims[i_];
            }
        }
    }
    if (im === null) {
        for (var i__ in slackData.ims) {
            if (slackData.ims[i__]['id'] === term) {
                im = slackData.ims[i__];
            }
        }
    }
    return im;
};

slackAPI.prototype.sendMsg = function(channel, text) {
    sendSock({'type': 'message', 'channel': channel, 'text': text});
    return this;
};

slackAPI.prototype.sendPM = function(user, text) {
    sendSock({'type': 'message', 'channel': this.getIM(user).id, 'text': text});
    return this;
};

slackAPI.prototype.events = events;

module.exports = slackAPI;