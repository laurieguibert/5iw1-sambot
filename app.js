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
        var event_place_entity = botbuilder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.geography.city');
        var event_keyword_entity = botbuilder.EntityRecognizer.findEntity(args.intent.entities, 'event_keyword');
        var event_place = event_place_entity ? '&location.address='+event_place_entity.entity : '';
        var event_keyword = event_keyword_entity ? '&q='+event_keyword_entity.entity : '';
        axios.get(start_url + 'events/search/?token=' +  user_token + "&sort_by=date" + event_place + event_keyword)
        .then(response => {
            var msg = new botbuilder.Message(session);
            msg.attachmentLayout(botbuilder.AttachmentLayout.carousel)
            events_array = [] 
            response.data.events.forEach(function(value){
                var thumbnail_url
                if ( typeof value.logo !== 'undefined' && value.logo )
                {
                    thumbnail_url = value.logo.url
                }
                else
                {
                    thumbnail_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAACsCAMAAABl5UHlAAAAFVBMVEXd3d3MzMzZ2dnR0dHV1dXX19fS0tJ77b4nAAACDUlEQVR4nO3c0ZaCIABFUQPk/z95XJYEpAIWOd7Ofq0HzoiMYTYMAAAAAAAAAAAAAAAAAAAAAAAAmDhbxZmzB/px9lZtPHusn+Xry283e/ZoP6qlfKI06xvTldrnHu92ibbX5Nzf49Ta69OHUay9IX0wWu0t6WLtTela7W3pUu2N6UrtrelC7c3pOu3t6TLtB9JDe9+RdXckfWn3XUfW3aH0pb3nwPo7lv5odx0H1l91ujOJeV/r2rs21emrvjPGTkjftb11+Z0xdlKTbn43fTBbx/0rQ+wlS3fTym1r/mcZsfSw91qOF0uPpnXxGlUrPdlvLx13rfSmFUwqfUzTC7dVpdLT+0uls10qPbvRXvhoIpXufzc9m/CFJV4qPVvhk4vb17+DVnoy45P57l+nv1Z6ctjj9/iVU18sPfpwGk93v7bsiaWHpS45tZfzIG2XS5+SXPbdwOcKkLQLpufitS9u109Pr3Oidvn0fGPq2a6e/rolF9rF09c2I5d2xXQbDuz6NuzjZcF0G+K2NqDvL+ulP+8ibt9ymS945NJtOLA735OXTA8bNXbvCQHF9MpnQQTTa5+C0UuvfgpGL7360SfSSb8u0gfSSf+x9DakXxnpzUi/srmg7icbUiLph509+re8VX7tRwHGcuC2i/9uhysXipZPzEFnjxsAAAAAAAAAAAAAAAAAAAAAAPwvf+8bDRHr18+cAAAAAElFTkSuQmCC'
                }
                console.log(value.logo)
                events_array.push(
                    new botbuilder.HeroCard(session)
                    .title(truncate(value.description.text, 38))
                    .subtitle(dateFormat(value.start.utc, "dddd, mmmm dS yyyy, h:MM TT") +", "+ value.start.timezone )
                    .text(truncate(value.description.text, 300))
                    .images([botbuilder.CardImage.create(session, thumbnail_url)])
                    .buttons([botbuilder.CardAction.openUrl(session, value.url, "Read More")])
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