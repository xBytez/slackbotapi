//////////////////////////////////////////////////////
//      ███████╗██╗      █████╗  ██████╗██╗  ██╗    //
//      ██╔════╝██║     ██╔══██╗██╔════╝██║ ██╔╝    //
//      ███████╗██║     ███████║██║     █████╔╝     //
//      ╚════██║██║     ██╔══██║██║     ██╔═██╗     //
//      ███████║███████╗██║  ██║╚██████╗██║  ██╗    //
//      ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝    //
//                xBytez | me@xbytez.io             //
//////////////////////////////////////////////////////

// Node dependencies
var eventEmitter = require('eventemitter3');
var logger       = require('jethro');
var request      = require('request');
var util         = require('util');
var webSocket    = require('ws');

// File dependencies
var errors       = require('./errors.json');
var events       = require('./events.json');

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

util.inherits(slackAPI, eventEmitter);

// Protoypes

/**
 * Send a request to Slack's web API
 * @param  string   method    API method
 * @param  object   data      Object with request data
 * @param  function callback  Callback function
 * @example reqAPI('rtm.start', {}, console.log)
 */
slackAPI.prototype.reqAPI = function (method, data, callback) {
    if(typeof data.token === 'undefined') data.token = this.token;

    if (typeof data.attachments !== 'undefined') {
        data.attachments = JSON.stringify(data.attachments);
    }

    request.post('https://slack.com/api/' + method, function (error, response, body) {
        if (!error && response.statusCode === 200) {
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
                    return cb(null, messageData);
                });
            } else if (data.type === 'presence_change') {
                // update slackData presence when user becomes active/inactive
                for (var i in self.slackData.users) {
                    if (self.slackData.users[i].id === data.user) {
                        self.slackData.users[i].presence = data.presence;
                        break;
                    }
                }
                return cb(null, data);
            } else if (typeof events[data.type] !== 'undefined') {
                return cb(null, data);
            }
        } else {
            return cb(new Error(errors.data_type_undefined), data);
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
 * Get a group by name or ID
 * @param  string  term  Search term
 * @return object        Returns object with group if found, else null.
 * @example getGroup("general")
 */
slackAPI.prototype.getGroup = function (term) {
    var group = null,
        self = this;
    for (var i in self.slackData.groups) {
        if (self.slackData.groups[i].name === term) {
            group = self.slackData.groups[i];
        }
    }
    if (group === null) {
        for (var i_ in self.slackData.groups) {
            if (self.slackData.groups[i_].id === term) {
                group = self.slackData.groups[i_];
            }
        }
    }
    return group;
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
