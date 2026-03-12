const axios = require('axios');
const env = process.env;

let cachedToken = null;
let tokenExpiresAt = null;

async function fetchNewToken() {
    try{
        const data = "grant_type=client_credentials";
        let res = await axios.post(env.APP_TOKEN_URL, data, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            auth: {
                username: env.APP_CLIENT_ID,
                password: env.APP_CLIENT_SECRET
            }
        });

        if(res.status == 200 && res.data.access_token){
            cachedToken = res.data.access_token;
            tokenExpiresAt = Date.now() + (res.data.expires_in * 1000);
        }else{
            console.error("Token non generato correttamente.");
            return null;
        }

        return cachedToken;

    } catch(e){
        if(e.isAxiosError){
            console.error('Error ' + e.code + ': ' + e.reason);
        }else{
            console.error(e);
        }
        
        return null;
    }

}

exports.getAppAccessToken = async () => {
    const SAFETY_MARGIN = 60 * 1000;
    if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt - SAFETY_MARGIN) {
        return cachedToken;
    }

    return await fetchNewToken();
}


exports.AppExcecuteInsert = async (Token, req, Msg_ID) => {
    let res;
    req.Msg_ID = Msg_ID
    req.time = new Date(Date.now()).toISOString();

    if(Token != null){
            try{
                res = await axios.post('https://' + env.APP_BASE_URI + '/api/v1/crm-salesforce/marketing-cloud-notification' 
                    + '?fiscalCode=' + req.Msg_Contact, req,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-TenantID': env.APP_TENANT_ID,
                            'X-Api-Key': env.APP_API_KEY,
                            'Authorization': `Bearer ${Token}`
                        }
                    }
                );

                console.log(res.data);

                return {status: res.status, response: res.data};

            } catch(e){
                const errStatus = e?.response?.status || 500;
                const errData = e?.response?.data || null;
                return {status: errStatus, response: errData};
            }

    }else{
        console.error('The Token doesn\'t exist!');
        return {status: 404, response: ''};
    }
}