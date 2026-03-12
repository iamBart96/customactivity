const jwt = require('jsonwebtoken');
const axios = require('axios');
//const db = require('../db-config');

const env = process.env;
let cachedSFMCToken = null;
let tokenSFMCExpiresAt = null;

exports.JWTdecode = async (body, secret) => {
    if (!body) {
        throw new Error('invalid jwtdata');
    }

    try {
        const decodedToken = jwt.verify(body.toString('utf8'), secret, {
            algorithm: 'HS256'
        });
        return decodedToken;
    } catch (error) {
        throw error;
    }
};

async function fetchNewTokenSFMC() {
    try{
        let res = await axios.post(env.SFMC_ROOT_AUTH + 'v2/token', {
            grant_type: "client_credentials",
            client_id: env.SFMC_CLIENT_ID,
            client_secret: env.SFMC_CLIENT_SECRET,
            account_id: env.SFMC_ACCOUNT_ID
        });
    
        if(res.status == 200 && res.data.access_token){
            cachedSFMCToken = res.data.access_token;
            tokenSFMCExpiresAt = Date.now() + (res.data.expires_in * 1000);
        }else{
            console.error("Token non generato correttamente.");
            return null;
        }

        return cachedSFMCToken;
    
    } catch(e){
        if(e.isAxiosError){
            console.error('Error ' + e.code + ': ' + e.reason);
        }else{
            console.error(e);
        }
        
        return null;
    }
}

exports.getSFMCAccessToken = async () => {
    const SAFETY_MARGIN = 60 * 1000;
    if (cachedSFMCToken && tokenSFMCExpiresAt && Date.now() < tokenSFMCExpiresAt - SAFETY_MARGIN) {
        return cachedSFMCToken;
    }

    return await fetchNewTokenSFMC();
} 


exports.getFormPicklist = async (req) =>{
    if(req.token){
        try{
            let res = await axios.get(env.SFMC_ROOT_REST + "data/v1/customobjectdata/key/"+ env.SFMC_PKLIST_EXTKEY +"/rowset", {
                headers: {
                    'Authorization': 'Bearer ' + req.token
                }
            });

            let jsonPayload = res.data;
            if (jsonPayload.hasOwnProperty('items') && jsonPayload.items.length > 0) {
                const itemsArray = jsonPayload.items;
                const filteredItems = [];
    
                itemsArray.forEach(item => {
    
                    const filteredItem = {
                        picklist: item.keys?.picklist,
                        label: item.values?.label,
                        value: item.values?.value
                    };
                
                    filteredItems.push(filteredItem);
                });
                return filteredItems;
                
                } else {
                    return {};
                }
    
        } catch(e){
            console.error(e);
            return {};
        }
    }else{
        return {};
    }

}

exports.logPushHistory = async (req, error, status, response, token) => {

    if(Object.values(req).length > 0){
    
        req.Status = status;
        req.Error_Message = error;
        req.Response = JSON.stringify(response);

        const reqBody = {
            items: [ req ]
        };

        try{

            if(token){
                let res = await axios.post(env.SFMC_ROOT_REST + 'data/v1/async/dataextensions/key:' + env.SFMC_API_LOG + '/rows', reqBody,
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });
                            
                return res.status;
            }else{
                console.error('SFMC Access token not found');
                return 404;
            }

        } catch (e) {
            const errStatus = e?.response?.status || 500;
            const errData = e?.response?.data || null;

            console.error('Errore durante la richiesta:', errStatus, errData);

            return errStatus;
        }

    }else{
        console.error('Request body empty.');
        return 404;
    }
}