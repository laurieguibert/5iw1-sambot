const restify = require('restify');
const botbuilder = require('botbuilder');
const axios = require('axios');
const truncate = require('truncate');
const dateFormat = require('dateformat');

// Setup restify server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function(){
    console.log('%s bot started at %s', server.name, server.url);
});

// Create chat connector
const connector = new botbuilder.ChatConnector({
    appId: process.env.APP_ID,
    appPassword: process.env.APP_SECRET
});

// Listening for user input
server.post('/api/messages', connector.listen());

var bot = new botbuilder.UniversalBot(connector, function(session){
    session.send("Hmmm.. I didn't understand that. Can you say it differently") 
});

const luisEndpoint = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/23f9a52a-8a5e-41bd-8d14-95bba2f4b940?subscription-key=57376ff9997147ba877ca8894ddd3dbb&verbose=true&timezoneOffset=0&q=';
var recognizer = new botbuilder.LuisRecognizer(luisEndpoint);
bot.recognizer(recognizer);

var start_url = 'https://www.eventbriteapi.com/v3/'
var user_token = '6KAACOLJPUJMIKMB43E7'

bot.dialog('Greeting', [
    function (session, args, next) {
        axios.get(start_url + 'users/me/?token=' + user_token)
        .then(response => {
            session.send('Hi '+ response.data.name +', nice to see you');
            session.endDialog("My name is Sambot, I'm here to help you to find an idea of activity. What can I do for you ?");
        })
        .catch(error => {
          console.log(error);
        });
    }
]).triggerAction({
    matches: 'Greeting'
});

bot.dialog('Events', [
    function (session, args, next) {
        axios.get(start_url + 'events/search/?token=' +  user_token)
        .then(response => {
            var msg = new botbuilder.Message(session);
            msg.attachmentLayout(botbuilder.AttachmentLayout.carousel)
            events_array = [] 
            response.data.events.forEach(function(value){
                events_array.push(
                    new botbuilder.HeroCard(session)
                    .title(truncate(value.description.text, 38))
                    .subtitle(dateFormat(value.start.utc, "dddd, mmmm dS yyyy, h:MM TT") +", "+ value.start.timezone )
                    .text(truncate(value.description.text, 300))
                    .images([botbuilder.CardImage.create(session, value.logo.url)])
                    .text()
                );
            });
            msg.attachments(events_array);
            session.send(msg).endDialog();
        })
        .catch(error => {
          console.log("err: "+ error);
        });
    }
]).triggerAction({
    matches: 'Events'
});