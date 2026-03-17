const axios = require('axios');
const env = process.env;
const {JWTdecode, logPushHistory, getSFMCAccessToken} = require('../functions/global-functions');
const {getAppAccessToken, AppExcecuteInsert} = require('../functions/app-config');
const crypto = require("crypto");

exports.JourneyBuilderSave = async () => {
    return 200;
}

exports.JourneyBuilderValidate = async (req) => {
    console.log('***** BR JourneyBuilderValidate called. Payload:', req);
    return 200;
}

exports.JourneyBuilderPublish = async () => {
    return 200;
}

exports.JourneyBuilderExecute = async (req) => {

    console.log('^^^^^^^^^ request', req);

    
    try{
        const decoded = await JWTdecode(req, env.SFMC_JWT);

        if (decoded && decoded.inArguments && decoded.inArguments.length > 0) {
            
            let decodedArgs = decoded.inArguments;
            
            if(decodedArgs){

                let res;
                let inputFields = ['Msg_Long', 'Msg_Short'];
                let Msg_Contact = decodedArgs[0]['Msg_Contact'];
                decodedArgs[0]['Msg_Contact'] = decodedArgs[1][Msg_Contact];

                let hashInput = `${decoded.keyValue}|${decoded.definitionInstanceId}`;
                let Msg_ID = crypto.createHash('sha256').update(hashInput).digest('hex');

                //Replace personalization strings for all occurrencies
                for (let i = 0; i < inputFields.length; i++) {
                    decodedArgs[0][inputFields[i]] = decodedArgs[0][inputFields[i]].replace(/\$\{([^}]+)\}/g, 
                        (match, captured) => decodedArgs[1][captured]);
                    
                }

                let logReq = {
                        Timestamp: new Date(Date.now()).toISOString(),
                        ContactKey: decoded.keyValue,
                        Msg_ID: Msg_ID,
                        JourneyId: decoded.journeyId,
                        Status: '',
                        Error_Message: '',
                        Response: ''
                };

                console.log('*** Decode inArguments ***');
                console.log(decodedArgs);

                let SFMCToken = await getSFMCAccessToken();

                try{
                    let TokenAPP = await getAppAccessToken();
                    if(TokenAPP != null){
                        res = await AppExcecuteInsert(TokenAPP, decodedArgs[0], Msg_ID);
                    }else{
                        console.error('The Token doesn\'t exist!');
                        res = { status: 404, response: '' };
                    }

                    await logPushHistory(logReq, '', res.status, res.response, SFMCToken)

                    return res.status;

                }catch(e){
                    console.error(e);
                    throw e;
                } 
            }else{
                console.error('Argument decoded not found.');
                return 404;
            }

        } else {
            console.error('inArguments invalid.');
            return 400;
        }

    }catch(e){
        console.error(e);
        return 500;
    }
        

    console.log('JourneyBuilderExecute called. Payload:', req);

    try {
        // If you need to handle the JWT payload from SFMC, uncomment and extend below.
        // const decoded = await JWTdecode(req, env.SFMC_JWT);
        // ...your processing logic...

        return 200;
    } catch (e) {
        console.error('JourneyBuilderExecute error:', e);
        // Return an HTTP status in the 200-299 range to avoid SFMC validation failures.
        return 200;
    }

}