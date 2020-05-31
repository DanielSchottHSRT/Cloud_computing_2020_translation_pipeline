function start_socket_listeners(){
  
  // load in socket
  var socket = io();



  // button to start a text translation is clicked
  $('#btn_translate_text').click(function () {
  //prevent page reloading
  event.preventDefault();

  var text_to_translate = $('#input_text_to_translate').val();
  var language_to_translate_to = $('#input_language_to_translate_to').val();

    // create json object
  params = {
    text:text_to_translate,
    target:language_to_translate_to
  };

  console.log(params.text);
  console.log(typeof params.text);


  // send all online users to sending socket only
  socket.emit("btn_translate_text_pressed", params);
});


  socket.on('text_translated', function(translation_result){
    console.log(translation_result);

    $('#p_translated_text').text(translation_result.translations[0].translation);
    $('#p_identified_language').text(translation_result.detect_language);
    $('#p_confidence').text(translation_result.confidence);

  });
}
