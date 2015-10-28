//////////////////////////////////////////////////////
//      ███████╗██╗      █████╗  ██████╗██╗  ██╗    //
//      ██╔════╝██║     ██╔══██╗██╔════╝██║ ██╔╝    //
//      ███████╗██║     ███████║██║     █████╔╝     //
//      ╚════██║██║     ██╔══██║██║     ██╔═██╗     //
//      ███████║███████╗██║  ██║╚██████╗██║  ██╗    //
//      ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    //
//          14-12-14 | xBytez | me@xbytez.eu        //
//////////////////////////////////////////////////////

// Dependencies
var webSocket = require('ws');
var request = require('request');
var logger = require('jethro');
var util = require('util');
var EventEmitter = require('eventemitter3');

// Events and errors
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
    mpim_joined: 'mpim_joined',
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
    accounts_changed: 'accounts_changed',
    reaction_added: 'reaction_added',
    reaction_removed: 'reaction_removed'
};

var errors = {
    object_arg_required: 'Invalid arguments! Please provide an object with settings.',
    boolean_arg_required: 'Invalid arguments! Please provide a valid boolean for logging.',
    invalid_token: 'Invalid arguments! Please provide a valid auth token.',
    send_args_required: 'Send: No arguments specified!',
    data_type_undefined: 'data.type not defined'
};

/**
 * Spawn the API
 * @param  object   args   Arguments to start the bot with for example the auth token.
 * @param  function err_cb Callback if boot failed
 * @example new slackAPI({'token': 'xo-abcdeftokenhere', 'logging': true, autoReconnect: true})
 */
function slackAPI(args, err_cb) {
    err_cb = err_cb || function () {};
    var self = this;
    var authtoken = args.token;

    this.slackData = {};
    this.token = '';
    this.logging = true;
    this.autoReconnect = true;
    this.i = 0;

    if (typeof args !== 'object') {
        this.logging = true;

        this.out('error', errors.object_arg_required);
        throw new Error(errors.object_arg_required);
    }

    if (typeof args.logging !== 'boolean') {
        this.logging = true;
        this.out('error', errors.boolean_arg_required);
    } else {
        this.logging = args.logging;
    }

    if (!authtoken || typeof authtoken !== 'string' || !authtoken.match(/^([a-z]*)\-([0-9]*)\-([0-9a-zA-Z]*)/)) {
        this.logging = true;

        this.out('error', errors.invalid_token);
        throw new Error(errors.invalid_token);
    }

    if (typeof args.autoReconnect !== 'boolean') {
        this.autoReconnect = false;
    } else {
        this.autoReconnect = args.autoReconnect;
    }

    this.token = authtoken;

    self.reqAPI('rtm.start', {}, function (data) {
        if (!data.ok) return err_cb(data.error);

        self.slackData.self = data.self;
        self.slackData.team = data.team;
        self.slackData.channels = data.channels;
        self.slackData.groups = data.groups;
        self.slackData.users = data.users;
        self.slackData.ims = data.ims;

        self.connectSlack(data.url, function (err, data) {
            if (!err) {
                self.emit(events[data.type], data);
            } else {
                self.emit('error', data);
            }
        });
    });
}

util.inherits(slackAPI, EventEmitter);

// Protoypes

/**
 * Send a request to Slack's web API
 * @param  string   method    API method
 * @param  object   data      Object with request data
 * @param  function callback  Callback function
 * @example reqAPI('rtm.start', {}, console.log)
 */
slackAPI.prototype.reqAPI = function (method, data, callback) {
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

/**
 * Send a message to the webSocket
 * @param  object data Data to send to Slack's websocket
 * @example sendSock({"type": "ping"})
 */
slackAPI.prototype.sendSock = function (data) {
    if (typeof data !== 'undefined') {
        data.id = this.i;
        data = JSON.stringify(data);
        this.out('debug', 'Send: ' + data);
        this.ws.send(data);
        this.i++;
    } else {
        this.out('error', errors.send_args_required);
    }
};

/**
 * Logging function
 * @param  string severity Severity of specified message
 * @param  string message  Message to log
 * @example out("error", "Are you sure this is the right auth token?")
 */
slackAPI.prototype.out = function (severity, message) {
    if (this.logging) {
        logger(severity, 'SlackAPI', message);
    }
};

/**
 * Send a ping to Slack's socket
 * @example ping()
 */
slackAPI.prototype.ping = function () {
    this.sendSock({
        'type': 'ping'
    });
};

/**
 * Connect to Slack's websocket
 * @param  string  wsurl   URL to connect to Slack's websocket.
 * @param  {Function} cb   Callback function
 * @example connectSlack("127.0.0.1", console.log);
 */
slackAPI.prototype.connectSlack = function (wsurl, cb) {
    var self = this;
    self.ws = new webSocket(wsurl);
    self.ws.on('open', function () {
        self.out('transport', 'Connected as ' + self.slackData.self.name + ' [' + self.slackData.self.id + '].');
        self.emit('open');

    }).on('close', function (data) {
        self.out('warning', 'Disconnected. Error: ' + data);
        self.emit('close', data);
        if (self.autoReconnect) {
            // auto-reconnect
            self.reqAPI('rtm.start', {}, function (data) {
                if (!data.ok) return;
                self.slackData.self = data.self;
                self.slackData.team = data.team;
                self.slackData.channels = data.channels;
                self.slackData.groups = data.groups;
                self.slackData.users = data.users;
                self.slackData.ims = data.ims;
                self.connectSlack(data.url, function (err, data) {
                    if (!err) {
                        self.emit(events[data.type], data);
                    } else {
                        self.emit('error', data);
                    }
                });
            });
        }

    }).on('error', function (data) {
        self.out('error', 'Error. Error: ' + data);
        self.emit('error', data);

    }).on('message', function (data) {
        self.out('transport', 'Received: ' + data);
        data = JSON.parse (data);
        if (typeof data.type !== 'undefined') {
            // update users list when new member joins
            if (data.type === 'team_join') {
                var messageData = data; // allow cb() to run when user.list refreshes
                self.reqAPI('users.list', messageData, function (data) {
                    self.slackData.users = data.members;
                    cb(null, messageData);
                });
            } else if (data.type === 'presence_change') {
                // update slackData presence when user becomes active/inactive
                for (var i in self.slackData.users) {
                    if (self.slackData.users[i].id === data.user) {
                        self.slackData.users[i].presence = data.presence;
                        break;
                    }
                }
                cb(null, data);
            } else if (typeof events[data.type] !== 'undefined') {
                cb(null, data);
            }
        } else {
            cb(new Error(errors.data_type_undefined), data);
        }
    });
};

/**
 * Get a channel by name or ID
 * @param  string  term  Search term
 * @return object        Returns object with channel if found, else null.
 * @example getChannel("general")
 */
slackAPI.prototype.getChannel = function (term) {
    var channel = null,
        self = this;
    for (var i in self.slackData.channels) {
        if (self.slackData.channels[i].name === term) {
            channel = self.slackData.channels[i];
        }
    }
    if (channel === null) {
        for (var i_ in self.slackData.channels) {
            if (self.slackData.channels[i_].id === term) {
                channel = self.slackData.channels[i_];
            }
        }
    }
    return channel;
};

/**
 * Get a user by name or ID
 * @param  string  term  Search term
 * @return object        Returns object with user if found, else null.
 * @example getUser("xBytez")
 */
slackAPI.prototype.getUser = function (term) {
    var user = null,
        self = this;
    for (var i in self.slackData.users) {
        if (self.slackData.users[i].name === term) {
            user = self.slackData.users[i];
        }
    }
    if (user === null) {
        for (var i_ in self.slackData.users) {
            if (self.slackData.users[i_].id === term) {
                user = self.slackData.users[i_];
            }
        }
    }
    return user;
};

/**
 * Get a user by e-mail address
 * @param  string  term  Search term
 * @return object        Returns object with user if found, else null.
 * @example getUserByEmail("slack@xbytez.eu")
 */
slackAPI.prototype.getUserByEmail = function (term) {
    var user = null,
        self = this;
    for (var i in self.slackData.users) {
        if (self.slackData.users[i].profile.email === term) {
            user = self.slackData.users[i];
        }
    }
    if (user === null) {
        for (var i_ in self.slackData.users) {
            if (self.slackData.users[i_].id === term) {
                user = self.slackData.users[i_];
            }
        }
    }
    return user;
};

/**
 * Get IM by name or ID
 * @param  string  term  Search term
 * @return object        Returns object with IM if found, else null.
 * @example getIM("xBytez")
 */
slackAPI.prototype.getIM = function (term) {
    var im = null,
        self = this;
    for (var i in self.slackData.ims) {
        if (self.slackData.ims[i].user === term) {
            im = self.slackData.ims[i];
        }
    }
    if (im === null) {
        var user = this.getUser(term);
        if (user !== null) {
            for (var i_ in self.slackData.ims) {
                if (self.slackData.ims[i_].user === user.id) {
                    im = self.slackData.ims[i_];
                }
            }
        }
    }
    if (im === null) {
        for (var i__ in self.slackData.ims) {
            if (self.slackData.ims[i__].id === term) {
                im = self.slackData.ims[i__];
            }
        }
    }
    return im;
};

/**
 * Get current saved data .
 * @return object Returns object with locally saved data
 * @example getSlackData()
 */
slackAPI.prototype.getSlackData = function () {
    return this.slackData;
};

/**
 * Indicates the user/bot is typing by sending a typing message to the socket
 * @param  string channel  Channel/IM ID
 * @example sendTyping("C0D12BCLV")
 */
slackAPI.prototype.sendTyping = function (channel) {
    this.sendSock({
        'type': 'typing',
        'channel': channel
    });
};

/**
 * Sends a message to a channel, private group or already existing IM/PM.
 * @param  string channel  Channel/IM ID
 * @param  string text  Message
 * @example sendMsg("C0D12BCLV", "The cake is a lie!")
 */
slackAPI.prototype.sendMsg = function (channel, text) {
    this.sendSock({
        'type': 'message',
        'channel': channel,
        'text': text
    });
};

/**
 * Send a direct message, if not created, create one.
 * @param  string userID Destination User ID
 * @param  string text   Message
 * @example sendPM("U0489398N")
 */
slackAPI.prototype.sendPM = function (userID, text) {
    var self = this;
    var channel = self.getIM(userID);
    if (channel !== null) {
        self.sendSock({
            'type': 'message',
            'channel': channel.id,
            'text': text
        });
    } else {
        if (this.getUser(userID)) userID = this.getUser(userID).id; // userID is username here
        self.reqAPI('im.open', {
            user: userID
        }, function (data) {
            if (data.ok === true) {
                self.slackData.ims.push(data.channel);
                self.sendSock({
                    'type': 'message',
                    'channel': data.channel.id,
                    'text': text
                });
            } else {
                self.out('error', 'Error. Unable to create an im channel: ' + data);
                self.emit('error', data);
            }
        });
    }
};
slackAPI.prototype.sendIM = slackAPI.prototype.sendPM;

slackAPI.prototype.events = events;
module.exports = slackAPI;
