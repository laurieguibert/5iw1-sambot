var botbuilder = require ('botbuilder');

const library = new botbuilder.Library('reservation');

var destinationData = {
    "Paris": {
        name : "Paris"
    },
    "Londres": {
        name: "Londres"
    },
    "New-York": {
        name: "New-York"
    }
};

library.dialog('hotel', [
    function (session, args){
        session.dialogData.reservation = args || {};
        botbuilder.Prompts.choice(session,"Pour quelle destination souhaitez-vous réserver ?", destinationData);
    }, 
    function (session, results){
        if(results.response){
            session.dialogData.reservation.destination = destinationData[results.response.entity];
        }
        
        botbuilder.Prompts.time(session,"A quelle date souhaitez-vous réserver votre chambre ?");
    },
    function (session, results){
        if(results.response){
            session.dialogData.reservation.reservationDate = botbuilder.EntityRecognizer.resolveTime([results.response]);
        }

        botbuilder.Prompts.number(session,"Pour combien de nuits souhaitez-vous réserver une chambre ?");
    },
    function (session, results){
        if(results.response){
            session.dialogData.reservation.nbNight = results.response;
        }
        
        session.endDialogWithResult({ response: session.dialogData.reservation });
    },
])
.endConversationAction(
    "endOrderHotel", "Votre annulation a été prise en compte",
    {
        matches: /^cancel$|^goodbye$/i,
        confirmPrompt: "Souhaitez-vous vraiment annuler votre réservation ?"
    }
)
.reloadAction('startOver', 'Ok, starting over.', {
    matches: /^start over$/i
});

module.exports = library;