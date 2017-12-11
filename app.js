require('dotenv').config({path: 'config.env'});

const restify = require('restify');
const botbuilder = require('botbuilder');
const axios = require('axios');
const truncate = require('truncate');
const dateFormat = require('dateformat');
const mysql = require('mysql');

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

const database_connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

// Listening for user input
server.post('/api/messages', connector.listen());

var bot = new botbuilder.UniversalBot(connector, function(session){
    session.send("Hmmm.. I didn't understand that. Can you say it differently");
});

const luisEndpoint = process.env.LUIS_ENDPOINT;
var recognizer = new botbuilder.LuisRecognizer(luisEndpoint);
bot.recognizer(recognizer);

var start_url = 'https://www.eventbriteapi.com/v3/'

bot.dialog('Login', [
    function(session) { 
        var msg = new botbuilder.Message(session) 
        .attachments([ 
            new botbuilder.SigninCard(session) 
                .text("Authorization needed") 
                .button("Login", "https://www.eventbrite.com/oauth/authorize?response_type=code&client_id="+process.env.EVENTBRITE_CLIENT_ID) 
        ]); 
        botbuilder.Prompts.text(session, msg);
    },
    function(session, results) {
        console.log(process.env.DB_HOST)
        console.log(process.env.DB_USER)
        console.log(process.env.DB_PASS)
        console.log(process.env.DB_NAME)
        database_connection.connect(function(err) {
            if (err) throw err;
            database_connection.query("SELECT hash FROM tokens WHERE code = '"+results.response+"'", function (err, result, fields) {
                if (err) throw err;
                console.log('a')
                if (result.length > 0) {
                    session.userData.token = result[0].hash
                    session.beginDialog('Greeting');
                } else {
                    var msg = "Your code looks to be wrong, please try with an other code";
                    session.send(msg);
                    session.replaceDialog('Login', { reprompt: true })
                }
            });
        });
    } 
]);

bot.dialog('Greeting', [
    function (session, args, next) {
        if (session.userData.token) {
            axios.get(start_url + 'users/me/?token=' + session.userData.token)
            .then(response => {
                session.send('Hi '+ response.data.name +', nice to see you');
                session.endDialog("My name is Sambot, I'm here to help you to find an idea of activity. What can I do for you ?").endDialog();
            })
            .catch(error => {
              console.log(error);
            });
        } else {
            session.beginDialog('Login');
        }
    }
]).triggerAction({
    matches: 'Greeting'
});

function create_event_card(session, response) {
    const msg = new botbuilder.Message(session);
    msg.attachmentLayout(botbuilder.AttachmentLayout.carousel)
    const card = [];
    response.data.events.forEach(function(value){
        var thumbnail_url, address;
        if ( typeof value.logo !== 'undefined' && value.logo )
        {
            thumbnail_url = value.logo.url
        }
        else
        {
            thumbnail_url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAACsCAMAAABl5UHlAAAAFVBMVEXd3d3MzMzZ2dnR0dHV1dXX19fS0tJ77b4nAAACDUlEQVR4nO3c0ZaCIABFUQPk/z95XJYEpAIWOd7Ofq0HzoiMYTYMAAAAAAAAAAAAAAAAAAAAAAAAmDhbxZmzB/px9lZtPHusn+Xry283e/ZoP6qlfKI06xvTldrnHu92ibbX5Nzf49Ta69OHUay9IX0wWu0t6WLtTela7W3pUu2N6UrtrelC7c3pOu3t6TLtB9JDe9+RdXckfWn3XUfW3aH0pb3nwPo7lv5odx0H1l91ujOJeV/r2rs21emrvjPGTkjftb11+Z0xdlKTbn43fTBbx/0rQ+wlS3fTym1r/mcZsfSw91qOF0uPpnXxGlUrPdlvLx13rfSmFUwqfUzTC7dVpdLT+0uls10qPbvRXvhoIpXufzc9m/CFJV4qPVvhk4vb17+DVnoy45P57l+nv1Z6ctjj9/iVU18sPfpwGk93v7bsiaWHpS45tZfzIG2XS5+SXPbdwOcKkLQLpufitS9u109Pr3Oidvn0fGPq2a6e/rolF9rF09c2I5d2xXQbDuz6NuzjZcF0G+K2NqDvL+ulP+8ibt9ymS945NJtOLA735OXTA8bNXbvCQHF9MpnQQTTa5+C0UuvfgpGL7360SfSSb8u0gfSSf+x9DakXxnpzUi/srmg7icbUiLph509+re8VX7tRwHGcuC2i/9uhysXipZPzEFnjxsAAAAAAAAAAAAAAAAAAAAAAPwvf+8bDRHr18+cAAAAAElFTkSuQmCC'
        }
        if ( typeof value.venue !== 'undefined' && value.venue )
        {
            address = value.venue.address.localized_address_display
        }
        else {
            address = value.start.timezone
        }
        if ( typeof value.id !== 'undefined' && value.id ) {
            card.push(
                new botbuilder.HeroCard(session)
                .title(truncate(value.description.text, 38))
                .subtitle(dateFormat(value.start.utc, "dddd, mmmm dS yyyy, h:MM TT") +", "+ address )
                .text(truncate(value.description.text, 300))
                .images([botbuilder.CardImage.create(session, thumbnail_url)])
                .buttons([
                    botbuilder.CardAction.openUrl(session, value.url, "Read More"),
                    botbuilder.CardAction.postBack(session, `weather forecast ${JSON.stringify({id: value.id})}`, "Weather Forecast")
                ])
            );
        }
    });
    msg.attachments(card);
    session.send(msg);
}

bot.dialog('Events', [
    function (session, args, next) {
        if (session.userData.token) {
            var event_place_entity = botbuilder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.geography.city');
            var event_keyword_entity = botbuilder.EntityRecognizer.findEntity(args.intent.entities, 'event_keyword');
            var event_place = event_place_entity ? '&location.address='+event_place_entity.entity : '';
            var event_keyword = event_keyword_entity ? '&q='+event_keyword_entity.entity : '';
            axios.get(start_url + 'events/search/?expand=venue&token=' +  session.userData.token + "&sort_by=date" + event_place + event_keyword)
            .then(response => {
                create_event_card(session, response);
            })
            .catch(error => {
                console.log("err: "+ error);
            });
        } else {
            session.beginDialog('Login');
        }
    }
]).triggerAction({
    matches: 'Events'
});

var categories_hash = {};
bot.dialog('Categories', [
    function (session, args) {
        if (session.userData.token) {
            axios.get(start_url + 'categories/?expand=venue&token=' +  session.userData.token)
            .then(response => {
                response.data.categories.forEach(function(value){
                    categories_hash[value.name] = {id: value.id}
                });
                botbuilder.Prompts.choice(session, "Which kind of event could interest you ?", categories_hash, { listStyle: botbuilder.ListStyle.button });
            })
            .catch(error => {
                console.log("err: "+ error);
            });
        } else {
            session.beginDialog('Login');
        }
    },
    function (session, results) {
        if (results.response.entity) {
            var category = categories_hash[results.response.entity];
            axios.get(start_url + 'events/search/?expand=venue&token=' +  session.userData.token + "&categories=" + category.id)
            .then(response => {
                create_event_card(session, response);
            })
            .catch(error => {
                console.log("err: "+ error);
            });
        }
    }
]).triggerAction({
    matches: 'Categories'
});

bot.dialog('Weather', [
    function (session, args) {
        session.dialogData = {};
        var event_id = args.intent.matched.input
        var hash = JSON.parse("[{" + event_id.substring(event_id.lastIndexOf("{")+1,event_id.lastIndexOf("}")) + "}]")
        // Connexion to eventbrite API and get the event
        axios.get(start_url + 'events/'+ hash[0].id+'/?expand=venue&token=' +  session.userData.token)
        .then(response => {
            // Explode date and time and format them
            var start_date = new Date(response.data.start.utc);
            var month = start_date.getUTCMonth() + 1;
            var day = start_date.getUTCDate();
            var year = start_date.getUTCFullYear();
            var time = Date.parse(month + " " + day + ", " +year) - Date.parse((new Date).getUTCMonth() + " " + (new Date).getUTCDate() + ", " +(new Date).getUTCFullYear());
            
            session.dialogData.event_name = response.data.name.text;

            if ( typeof response.data.venue !== 'undefined' && response.data.venue )
            {
                // Get latitude, longitude and date
                session.dialogData.latitude = response.data.venue.address.latitude;
                session.dialogData.longitude = response.data.venue.address.longitude;
                session.dialogData.time = time.toString().slice(0,8);

                // Connexion to darksky API and get the weather
                axios.get(' https://api.darksky.net/forecast/'+process.env.DARKSKY_CLIENT_ID+'/'+session.dialogData.latitude+','+session.dialogData.latitude+','+session.dialogData.time+'?exclude=currently,flags')
                .then(response => {
                    var image_url
                    // Get right icon (svg) for the weather
                    switch(response.data.daily.data[0].icon) {
                        case 'clear-day':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/day.svg'
                            break;
                        case 'clear-night':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/night.svg'
                            break;
                        case 'rain':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/rainy-6.svg'
                            break;
                        case 'snow':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/snowy-6.svg'
                            break;
                        case 'sleet':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/snowy-3.svg'
                            break;
                        case 'wind':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/cloudy.svg'
                            break;
                        case 'fog':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/cloudy.svg'
                            break;
                        case 'cloudy':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/cloudy.svg'
                            break;
                        case 'partly-cloudy-day':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/cloudy-day-3.svg'
                            break;
                        case 'partly-cloudy-night':
                            image_url = 'https://www.amcharts.com/wp-content/themes/amcharts2/css/img/icons/weather/animated/cloudy-night-3.svg'
                            break;
                    }
                    var msg = new botbuilder.Message(session) 
                    
                    // Create thumbnail card
                    .attachments([ 
                        new botbuilder.ThumbnailCard(session) 
                        .title('Weather forecast for '+session.dialogData.event_name)
                        .text(response.data.daily.data[0].summary+"\n\n Temperature Min : "+ response.data.daily.data[0].temperatureMin +"°C \n\n"+" Temperature Max : "+ response.data.daily.data[0].temperatureMax +"°C \n\n"+" Humidiy : "+ response.data.daily.data[0].humidity)
                        .images([
                            botbuilder.CardImage.create(session, image_url)   
                        ])
                    ]); 
                    session.endDialog(msg);
                })
                .catch(error => {
                    console.log("err: "+ error);
                });
            } else {
                // if there is no response from eventbrite API, send an error
                session.endDialog('Sorry, I can\'t find weather forecast for this event');
            }  
        })
        .catch(error => {
            console.log("err: "+ error);
        });      
    }
]).triggerAction({matches: /^(weather forecast)/i });

//KQAHPZOUICAM4BM2ULFM
