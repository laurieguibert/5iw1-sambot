var botbuilder = require ('botbuilder');
var moment = require('moment');

const library = new botbuilder.Library('alarme');

var menuData = {
    "Créer une alarme": {
        id : 1,
        name : "createAlarm"
    },
    "Consulter les alarmes actives": {
        id : 2,
        name: "showAlarm"
    },
    "Afficher l'historique des alarmes": {
        id : 3,
        name: "listAlarm"
    }
};

library.dialog('menu', [
    function(session){
        botbuilder.Prompts.choice(session,"Que souhaitez-vous faire ?", menuData, {listStyle : botbuilder.ListStyle.button });
    },
    function(session, results){
        if(results.response){
            session.beginDialog(menuData[results.response.entity].name);
        }
    }
]).triggerAction({
    matches: /^menu$/i,
    confirmPrompt: "Voulez-vous retourner au menu ?"
}).endConversationAction('endConversationAction', 'Ok, au revoir !', {
    matches: /^goodbye$/i
});

library.dialog('createAlarm', [
    function(session, args){
        session.dialogData.alarm = {};
        session.send("Création d'une alarme.");
        botbuilder.Prompts.text(session,"Quel nom souhaitez-vous donner à votre alarme ?");
    },
    function (session, results) {
        if (results.response) {
            session.dialogData.alarm.name = results.response;
        }

        botbuilder.Prompts.time(session,"Pour quelle date souhaitez-vous créer votre alarme ?");
    },
    function (session, results) {
        if (results.response) {
            session.dialogData.alarm.alarmDate = botbuilder.EntityRecognizer.resolveTime([results.response]);
            session.dialogData.alarm.createdAt = Date.now();
        }
        session.userData.alarm.push(session.dialogData.alarm);
        session.send("Votre alarme a bien été créée !");
        session.beginDialog('menu');
    }
])
.reloadAction('startOver', 'C\'est noté.', {
    matches: /^reload$|^retry$/i,
    confirmPrompt: "Souhaitez-vous vraiment recommencer la création de l'alarme ?"
})
.cancelAction('cancelAction', 'Ok, annulation de la création.', {
    matches: /^nevermind$|^cancel$|^cancel.*create/i
});

library.dialog('showAlarm', [
    function(session){
        var count = 0;
        for(var index in session.userData.alarm) {
            var alarm = session.userData.alarm[index];
            var timestamp = new Date(alarm.alarmDate).getTime();
            var date = new Date(alarm.alarmDate);
            var createdAt = new Date(alarm.createdAt);
            if(timestamp > Date.now()){
                count ++;
                var msg = new botbuilder.Message(session);
                msg.attachmentLayout(botbuilder.AttachmentLayout.carousel)
                msg.attachments([
                    new botbuilder.HeroCard(session)
                        .title(`Alarme "${alarm.name}" - ACTIVE`)
                        .subtitle(`Créée par ${session.message.user.name} le ${createdAt}`)
                        .text(`Définie pour le ${date}`)
                        .buttons([
                            botbuilder.CardAction.imBack(session, "details", "Détails")
                            //botbuilder.CardAction.dialogAction(session, 'detailsAlarm', index, "Détails")
                        ])
                ]);
                session.send(msg).endDialog();
            }
        }
        if(count === 0){
            session.send("Pas d'alarme active");
            session.beginDialog('menu');
        }
    }
])
.cancelAction('cancelAction', 'Ok, annulation de l\'affichage des alarmes actives.', {
    matches: /^nevermind$|^cancel$|^cancel.*create/i
}).endConversationAction('endConversationAction', 'Ok, au revoir !', {
    matches: /^goodbye$/i
});

library.dialog('listAlarm', [
    function(session){
        var count = 0;
        for(var index in session.userData.alarm) { 
            var alarm = session.userData.alarm[index];
            var timestamp = new Date(alarm.alarmDate).getTime();
            var date = new Date(alarm.alarmDate);
            var createdAt = new Date(alarm.createdAt);
            if(timestamp <= Date.now()){
                count ++;
                var msg = new botbuilder.Message(session);
                msg.attachmentLayout(botbuilder.AttachmentLayout.carousel)
                msg.attachments([
                    new botbuilder.HeroCard(session)
                        .title(`Alarme "${alarm.name}" - TERMINEE`)
                        .subtitle(`Créée par ${session.message.user.name} le ${createdAt}`)
                        .text(`Terminée le ${date}`)
                ]);
                session.send(msg).endDialog();
            };
        };
        if(count === 0){
            session.send("Pas d'alarme historisée");
            session.beginDialog('menu');
        }
    }
])
.cancelAction('cancelAction', 'Ok, annulation de l\'affichage des alarmes terminées.', {
    matches: /^nevermind$|^cancel$|^cancel.*create/i
})
.endConversationAction('endConversationAction', 'Ok, au revoir !', {
    matches: /^goodbye$/i
});

library.dialog('details', [
    function(session){
        session.send("Détails de l\'alarme");
    }
])
.triggerAction({
     matches: /^details$/
});

module.exports = library;