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

function slackAPI(args) {
    var self = this;
    var authtoken = args['token'];

    this.slackData = {};
    this.token = "";
    this.logging;
    this.i = 0;

    if (typeof args !== 'object') {
        this.logging = true;
        this.out('error', 'Invalid arguments! Please provide an object with settings.');
        process.exit(1);
    } if (typeof args['logging'] !== 'boolean') {
        this.logging = true;
        this.out('error', 'Invalid arguments! Please provide a valid boolean for logging.');
    } else {
        this.logging = args['logging'];
    } if (!authtoken || typeof authtoken !== 'string' || !authtoken.match(/^([a-z]*)\-([0-9]*)\-([0-9a-zA-Z]*)/)) {
        this.logging = true;
        this.out('error', 'Invalid arguments! Please provide a valid auth token.');
        process.exit(1);
    }

    this.token = authtoken;
    self.reqAPI('rtm.start', {}, function (data) {
        self.slackData.self = data.self;
        self.slackData.team = data.team;
        self.slackData.channels = data.channels;
        self.slackData.groups = data.groups;
        self.slackData.users = data.users;
        self.slackData.ims = data.ims;
        self.connectSlack(data.url, function(err, data){
            if (!err){
                self.emit(events[data.type], data);
            }
        });
    });
};

util.inherits(slackAPI, EventEmitter);

// Protoypes
slackAPI.prototype.reqAPI = function(method, data, callback) {
    data.token = this.token;
    if (typeof data.attachments !== 'undefined') {
    	data.attachments = JSON.stringify(data.attachments);
    }
    request.post('https://slack.com/api/' + method, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            if (!callback) {
                return JSON.parse(body);
            } else {
                return callback(JSON.parse(body));
            }
        }
    }).form(data);
};

slackAPI.prototype.ping = function() {
    this.sendSock({'type': 'ping'});
};

slackAPI.prototype.out = function(severity, message) {
    if (this.logging) {
        logger(severity, "SlackAPI", message);
    }
};

slackAPI.prototype.sendSock = function(data) {
    if (typeof data !== "undefined") {
        data.id = this.i;
        data = JSON.stringify(data);
        this.out("debug", "Send: "+data);
        this.ws.send(data);
        this.i++;
    } else {
        this.out('error', 'Send: No arguments specified!');
    }
};

slackAPI.prototype.connectSlack = function(wsurl, cb) {
    var self = this;
    self.ws = new webSocket(wsurl);
    self.ws.on('open', function() {
        self.out('transport', 'Connected as '+self.slackData.self.name+' ['+self.slackData.self.id+'].');
        self.emit("open")
    }).on('close', function(data) {
        self.out('warning', 'Disconnected. Error: '+data);
        self.emit("close", data)
    }).on('error', function(data) {
        self.out('error', 'Error. Error: '+data);
        self.emit("error", data)
    }).on('message', function(data) {
        self.out('transport', "Recieved: " + data);
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
    var channel = null, self = this;
    for(var i in self.slackData.channels) {
        if(self.slackData.channels[i]['name'] === term) {
            channel = self.slackData.channels[i];
        }
    }
    if (channel === null) {
        for(var i_ in self.slackData.channels) {
            if(self.slackData.channels[i_]['id'] === term) {
                channel = self.slackData.channels[i_];
            }
        }
    }
    return channel;
};

slackAPI.prototype.getUser = function(term) {
    var user = null, self = this;
    for(var i in self.slackData.users) {
        if(self.slackData.users[i]['name'] === term) {
            user = self.slackData.users[i];
        }
    }
    if (user === null) {
        for(var i_ in self.slackData.users) {
            if(self.slackData.users[i_]['id'] === term) {
                user = self.slackData.users[i_];
            }
        }
    }
    return user;
};

slackAPI.prototype.getUserByEmail = function(term) {
    var user = null, self = this;
    for(var i in self.slackData.users) {
        if(self.slackData.users[i]['profile']['email'] === term) {
            user = self.slackData.users[i];
        }
    }
    if (user === null) {
        for(var i_ in self.slackData.users) {
            if(self.slackData.users[i_]['id'] === term) {
                user = self.slackData.users[i_];
            }
        }
    }
    return user;
};

slackAPI.prototype.getIM = function(term) {
    var im = null; self = this;
    for (var i in self.slackData.ims) {
        if(self.slackData.ims[i]['user'] === term) {
            im = self.slackData.ims[i];
        }
    }
    if (im === null) {
        var user = this.getUser(term);
        if(user !== null) {
          for (var i_ in self.slackData.ims) {
              if (self.slackData.ims[i_]['user'] === user.id) {
                  im = self.slackData.ims[i_];
              }
          }
        }
    }
    if (im === null) {
        for (var i__ in self.slackData.ims) {
            if (self.slackData.ims[i__]['id'] === term) {
                im = self.slackData.ims[i__];
            }
        }
    }
    return im;
};

slackAPI.prototype.sendMsg = function(channel, text) {
    this.sendSock({'type': 'message', 'channel': channel, 'text': text});
};

slackAPI.prototype.sendPM = function(userID, text) {
    var self = this;
    channel = self.getIM(userID);
    if(channel !== null) {
      self.sendSock({'type': 'message', 'channel': channel.id, 'text': text});
    } else {
      self.reqAPI('im.open', { user : this.getUser(userID).id }, function(data){
        if(data.ok === true) {
          self.slackData.ims.push(data.channel);
          self.sendSock({'type': 'message', 'channel': data.channel.id, 'text': text});
        } else {
          self.out('error', 'Error. Unable to create an im channel: ' + data);
          self.emit("error", data);
        }
      });
    }
};

slackAPI.prototype.events = events;

module.exports = slackAPI;
