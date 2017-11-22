/**
 * Created by lguib on 12/09/2017.
 */
var restify = require('restify');
var botbuilder = require ('botbuilder');

// setup restify server

var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3987, function(){
    console.log('%s bot started at %s', server.name, server.url);
});

// create chat connector
var connector = new botbuilder.ChatConnector({
    appId: process.env.APP_ID,
    appPassword: process.env.APP_SECRET
});

// Listening for user inputs
server.post('/api/messages', connector.listen());

// Reply by echoing
var bot = new botbuilder.UniversalBot(connector, function(session){
    //session.send('you have tapped : ${session.message.text} | [length : ${session.message.text.length}');
    session.send(`Vous avez écrit : %s | [longueur du texte : %s]`, session.message.text, session.message.text.length);
    /*session.send(JSON.stringify(session.dialogData));
    session.send(JSON.stringify(session.sessionState));
    session.send(JSON.stringify(session.conversationData));
    session.send(JSON.stringify(session.userData));*/

    bot.on('typing', function(){
        session.send("Utilisateur en train decrire");
    });

    bot.on('conversationUpdate', function(message) {
        if(message.membersAdded && message.membersAdded.length > 0){
            var membersAdded = message.membersAdded
            .map(function(x){
                var isSelf = x.id === message.address.bot.id;
                return (isSelf ? message.address.bot.name : x.name) || ' ' + '(Id = ' + x.id + ')'
            })
            .join(', ');
            bot.send(new botbuilder.Message()
            .address(message.address)
            .text('Bienvenue ' + membersAdded));
        }

        if(message.membersRemoved && message.membersRemoved.length > 0){
            var membersRemoved = message.membersRemoved
            .map(function(x){
                var isSelf = x.id === message.address.bot.id;
                return (isSelf ? message.address.bot.id : x.id) || ' ' + '(Id = ' + x.id + ')'
            })
            .join(', ');
            bot.send(new botbuilder.Message()
            .address(message.address)
            .text('Au revoir ' + membersRemoved));
        }
    });

    bot.on('contactRelationUpdate', function(message){
        if(message.action === 'add'){
            var response = 'Bienvenue ';
        }

        if(message.action === 'remove'){
            var response = 'Au revoir ';
        }

        bot.send(new botbuilder.Message()
        .address(message.address)
        .text(response + message.address.bot.name + '-' + message.address.bot.id));
    })

    bot.on('endOfConversation', function(message){
        bot.send(new botbuilder.Message()
        .address(message.address)
        .text("La conversation est maintenant terminée"));
    })
});