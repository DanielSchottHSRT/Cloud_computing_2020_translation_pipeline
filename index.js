const LanguageTranslatorV3 = require('ibm-watson/language-translator/v3');
const { IamAuthenticator } = require('ibm-watson/auth');


// include modules
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var path = require('path');
var express = require('express');

// initialize translator
const languageTranslator = new LanguageTranslatorV3({
version: '2020-05-28',
authenticator: new IamAuthenticator(
  {
  apikey: 'TfiQUOb1OlGgkOaMQ0WoosEtGNqlY5VO7YDru7mu6mnp',
  }),
  url: 'https://api.eu-de.language-translator.watson.cloud.ibm.com/instances/b0a93c4f-3526-4928-88bc-e0c5aec5c620',
});

const defaultLanguage = 'en';

var highestConfidenceScore = 0.0;
var languageWithHighestScore ='';


var port = process.env.PORT || 3000;
// get access to public folder which contains html/css/js files
app.use(express.static(path.join(__dirname, 'public')));

// setup root handler that calls index.html when website is called
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/html/index.html');
});

// listen on set port
http.listen(port, () => {
    console.log('listening on *:3000');
});


/**
 * Helper
 * @param {*} errorMessage
 * @param {*} defaultLanguage
 */
function getTheErrorResponse(errorMessage, defaultLanguage) {
  return {
    statusCode: 400,
    body: {
      language: defaultLanguage || 'en',
      errorMessage: errorMessage
    }
  };
}


function identify_language(params) {

  /*
   * The default language to choose in case of an error
   */

  return new Promise(function (resolve, reject) {

    try {

      // text to translate present
      if (typeof params.text === 'string' || params.text instanceof String) {

        // identify language of translateable text
        languageTranslator.identify(params).then(identifiedLanguages => {

          console.log("LANGUAGES : ",JSON.stringify(identifiedLanguages, null, 2));

          // search langueage with highes confidence score
          identifiedLanguages.result.languages.forEach(language => {
              if(language.confidence > highestConfidenceScore){
                highestConfidenceScore = language.confidence;
                languageWithHighestScore = language.language;
              }
          });

          // resolve parameters
          resolve({
            statusCode: 200,
            body: {
              source:languageWithHighestScore,
              text:params.text,
              target: params.target,
              language: languageWithHighestScore,
              confidence: highestConfidenceScore,
            },
            headers: { 'Content-Type': 'application/json' }
          });

            // error handling
        }).catch(err => {
          console.error('Error while initializing the AI service', err);
          resolve(getTheErrorResponse('Error while communicating with the language service', defaultLanguage));
        });
      }
        // error handling
    } catch (err) {
      console.error('Error while initializing the AI service', err);
      resolve(getTheErrorResponse('Error while communicating with the language service', defaultLanguage));
    }
  });
}

function translate_text(params) {

  return new Promise(function (resolve, reject) {

    try {

      // needed params present (text, source, target)
      if ((typeof params.text === 'string' || params.text instanceof String)
       && params.target != null && params.source != null ){

        // translate text
        languageTranslator.translate(params).then(translationResult => {
          console.log("translationResult",JSON.stringify(translationResult, null, 2));

          // resolve parameters
          resolve({
            statusCode: 200,
            body: {
              translations: translationResult.result.translations,
              words: translationResult.result.word_count,
              characters: translationResult.result.character_count,
            },
            headers: { 'Content-Type': 'application/json' }
          });
            // error handling
        }).catch(err => {
          console.error('Error while initializing the AI service', err);
          resolve(getTheErrorResponse('Error while communicating with the language service', defaultLanguage));
        });
    }

      // error handling
    } catch (err) {
      console.error('Error while initializing the AI service', err);
      resolve(getTheErrorResponse('Error while communicating with the language service', defaultLanguage));
    }
  });
}

// setup socket that waits on new connection
io.on('connection', (socket) => {

  // event fired when the button to translate a text is pressed
  // (params) contain text: String(text that will be translated)
  socket.on('btn_translate_text_pressed', (params) => {

    // get language of input text
    identify_language(params).then(function(result){

      // translate text to given target language
      translate_text(result.body).then(function(translation_result){

        // add additional info to result
        translation_result.body.detect_language =  languageWithHighestScore;
        translation_result.body.confidence = highestConfidenceScore;

        // send back translated text to client
        socket.emit("text_translated", translation_result.body);
      });
    });
  });
});
