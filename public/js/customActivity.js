define([
    'postmonger'
], function (
    Postmonger
) {
    'use strict';

    var connection = new Postmonger.Session();
    //var authTokens = {};
    var payload = {};
    $(window).ready(onRender);

    connection.on('initActivity', initialize);
    //connection.on('requestedTokens', onGetTokens);
    connection.on('clickedNext', save);
   
    function onRender() {
        connection.trigger('ready');
        //connection.trigger('requestTokens');
    }

    function addLoader(target) {
        var loaderOverlay = document.createElement('div');
        loaderOverlay.id = 'loader-overlay';
        var loader = document.createElement('div');
        loader.id = 'loader';

        var targetBox = document.querySelector(target);

        targetBox.appendChild(loaderOverlay);
        targetBox.appendChild(loader);
    }

    function removeLoader(target) {
        var targetBox = document.querySelector(target);

        var loaderOverlay = targetBox.querySelector('#loader-overlay');
        var loader = targetBox.querySelector('#loader');

        if (loader && loaderOverlay) {
            loaderOverlay.parentNode.removeChild(loaderOverlay);
            loader.parentNode.removeChild(loader);
        }
    }
    

    function initialize(data) {
        
        addLoader('#loader-wrap');

        if (data) {
            payload = data;
        }
        
        var hasInArguments = Boolean(
            payload['arguments'] &&
            payload['arguments'].execute &&
            payload['arguments'].execute.inArguments &&
            payload['arguments'].execute.inArguments.length > 0
        );

        var inArguments = hasInArguments ? payload['arguments'].execute.inArguments : {};

        console.log('*** initialize inArguments ***');
        console.log(inArguments);

        $.each(inArguments[0], function (key, value) {
            $('#' + key).val(value);
        });

        connection.trigger('requestTokens');
        connection.on('requestedTokens', function(tokens) {
            if (tokens) { 
                axios.post(window.location.origin + '/jb/getFormPicklist', {token: tokens.fuel2token}, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(function(res) {

                    let payloadPush = res.data;

                    let selectClusterHTML = '';
                    if(payloadPush.length > 0){
                        payloadPush.forEach(item => {
                            if(item.picklist == 'Cluster'){
                                if (inArguments && inArguments[0]) {
                                    selectClusterHTML += '<option value="' + item.value + '"' + (inArguments[0].Msg_Cluster == item.value ? ' selected' : '') + '>' + item.label + '</option>';
                                }else{
                                    selectClusterHTML += '<option value="' + item.value + '">' + item.label + '</option>';
                                }
                                
                            }
                        });

                        if(selectClusterHTML != ''){
                            $('#Msg_Cluster').html(selectClusterHTML);
                        }else{
                            $('#Msg_Cluster').prop('disabled', true);
                            $('#no-cluster-found').html('Add at least one item to proceed with the configuration.');
                        }
                        
                        removeLoader('#loader-wrap');

                    }else{
                        $('#Msg_Cluster').prop('disabled', true); /* Da aggiungere #Msg_Template se necessaria la riattivazione */
                        $('#no-template-found, #no-cluster-found').html('Add at least one item to proceed with the configuration.');
                        removeLoader('#loader-wrap');
                    }

                })
                .catch(function(e) {
                    console.error('Errore nella chiamata API:', e);
                });
            }
        });

        connection.trigger('requestSchema');
        connection.on('requestedSchema', function (data) {
            const schema = data['schema'];
            let entrySource = {};
            let placeholders = '';
            let picklistContact = '';
            let keyFormatted = ''

            for (let i = 0, l = schema.length; i < l; i++) {
                if(schema[i].key.includes("SalesforceObj")){
                    keyFormatted = schema[i].key.replace(/^Event\.([^.]+)\.(.+)$/, 'Event."$1"."$2"');
                    entrySource[schema[i].name] = '{{' + keyFormatted + '}}';
                }else if(schema[i].key.includes("DEAudience")){
                    entrySource[schema[i].name] = '{{' + schema[i].key + '}}';
                }

                if(schema[i].key.includes("SalesforceObj") || schema[i].key.includes("DEAudience")){
                    placeholders += '<option value="'+schema[i].name+'" >'+schema[i].name+'</option>';

                if (inArguments && inArguments[0]) {
                    picklistContact += '<option value="' + schema[i].name + '"' + (inArguments[0].Msg_Contact == schema[i].name ? ' selected' : '') + '>' + schema[i].name + '</option>';
                }else{
                    picklistContact += '<option value="' + schema[i].name + '">' + schema[i].name + '</option>';
                }
                }

            }

            if(Object.values(entrySource).length == 0){
                $('.entry-data-fields').prop('disabled', true);
                $('#insert-placeholder').addClass('disabled');
                $('.no-de-selected').html('(Set an entry source to see data fields)');
            }else{
                if(placeholders){
                    $('#placeholder-text').html(placeholders);
                }
                if(picklistContact){
                    $('#Msg_Contact').html(picklistContact);
                }
            }

            payload['arguments'].execute.inArguments[1] = entrySource;

        });

        connection.trigger('updateButton', {
            button: 'next',
            text: 'Done',
            visible: true
        });

    }

    
    function validateForm(){
        let forms = document.querySelectorAll('.needs-validation');
        let isValid = true;

        Array.prototype.slice.call(forms)
            .forEach(function (form) {

                if (!form.checkValidity()) {
                    form.classList.add('was-validated');
                    isValid = false;
                }


                var Title = form.querySelector('#Msg_Title');
                var TitleFeedback = form.querySelector('#Msg_Title + .invalid-feedback');
                if (Title.value.length > 150) {
                    TitleFeedback.textContent = 'Name must be no longer than 150 characters.';
                    Title.classList.add('is-invalid');
                    isValid = false;
                } else if (Title.value.length === 0) {
                    TitleFeedback.textContent = 'This field is required.';
                    Title.classList.add('is-invalid');
                    isValid = false;
                } else {
                    TitleFeedback.textContent = '';
                    Title.classList.remove('is-invalid');
                }

                var Short = form.querySelector('#Msg_Short');
                var ShortFeedback = form.querySelector('#Msg_Short + .invalid-feedback');
                if (Short.value.length > 200) {
                    ShortFeedback.textContent = 'Short message must be no longer than 200 characters.';
                    Short.classList.add('is-invalid');
                    isValid = false;
                } else if (Short.value.length === 0) {
                    ShortFeedback.textContent = 'This field is required.';
                    Short.classList.add('is-invalid');
                    isValid = false;
                } else {
                    ShortFeedback.textContent = '';
                    Short.classList.remove('is-invalid');
                }

                var Long = form.querySelector('#Msg_Long');
                var LongFeedback = form.querySelector('#Msg_Long + .invalid-feedback');
                if (Long.value.length > 1000) {
                    LongFeedback.textContent = 'Long message must be no longer than 1000 characters.';
                    Long.classList.add('is-invalid');
                    isValid = false;
                } else if (Long.value.length === 0) {
                    LongFeedback.textContent = 'This field is required.';
                    Long.classList.add('is-invalid');
                    isValid = false;
                } else {
                    LongFeedback.textContent = '';
                    Long.classList.remove('is-invalid');
                }


                var Contact = form.querySelector('#Msg_Contact');
                var ContactFeedback = form.querySelector('#Msg_Contact + .invalid-feedback');
                if (Contact.value.length === 0) {
                    ContactFeedback.textContent = 'This field is required.';
                    Contact.classList.add('is-invalid');
                    isValid = false;
                } else {
                    ContactFeedback.textContent = '';
                    Contact.classList.remove('is-invalid');
                }

                var Image = form.querySelector('#Msg_Image');
                var ImageFeedback = form.querySelector('#Msg_Image + .invalid-feedback');
                if (Image.value.length > 1000) {
                    ImageFeedback.textContent = 'Image url must be no longer than 1000 characters.';
                    Image.classList.add('is-invalid');
                    isValid = false;
                } else {
                    ImageFeedback.textContent = '';
                    Image.classList.remove('is-invalid');
                }

                var CTA = form.querySelector('#Msg_CTALink');
                var CTAFeedback = form.querySelector('#Msg_CTALink + .invalid-feedback');
                if (CTA.value.length > 1000) {
                    CTAFeedback.textContent = 'CTA url must be no longer than 1000 characters.';
                    CTA.classList.add('is-invalid');
                    isValid = false;
                } else {
                    CTAFeedback.textContent = '';
                    CTA.classList.remove('is-invalid');
                }

            });
            return isValid;
    }

    
    function save() {

        if (!validateForm()) {
            connection.trigger('ready');
        }else{
            let pushInfo = new FormData($('#push-info')[0]);

            payload['arguments'].execute.inArguments[0] = {
                Msg_Title: pushInfo.get('Msg_Title'),
                Msg_Short: pushInfo.get('Msg_Short'),
                Msg_Long: pushInfo.get('Msg_Long'),
                /*Msg_Template: pushInfo.get('Msg_Template'),*/
                Msg_Contact: pushInfo.get('Msg_Contact'),
                Msg_Cluster: pushInfo.get('Msg_Cluster'),
                Msg_Image: pushInfo.get('Msg_Image'),
                Msg_CTALink: pushInfo.get('Msg_CTALink'),
            };
    
            //payload['arguments'].execute.inArguments[2] = { tokens: authTokens };
    
            payload['metaData'].isConfigured = true;
    
            connection.trigger('updateActivity', payload);
        }

    }


});
