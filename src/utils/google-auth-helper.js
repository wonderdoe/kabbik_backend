const { OAuth2Client } = require('google-auth-library');

// Download your OAuth2 configuration from the Google
const keys = require('../../keys/oauth2/oauth2.keys.json');

class GoogleAuthHelper {

    constructor() {
        /**
        * this.oAuth2Client is a global variable
        * Start by acquiring a pre-authenticated oAuth2 client.
        */
        this.oAuth2Client = new OAuth2Client(
            keys.web.client_id,
            keys.web.client_secret
        )
    }

    async parse(token) {
        try {
            const ticket = await this.oAuth2Client.verifyIdToken({
                idToken: token,
                audience: keys.web.client_id
            })
                        const payload = ticket.getPayload();
            if (payload && payload.email) {
                const userId = payload.sub;
                const email = payload.email;
                const name = payload.name;
                const picture = payload.picture;
                return { userId, email, name, picture }
            }
            else {
                return undefined
            }
        } catch (err) {
            console.log(err);
            return undefined
        }
    }
    async parseFlutter(token) {
        try {
            const ticket = await this.oAuth2Client.verifyIdToken({
                idToken: token,
                requiredAudience: keys.web.client_id
            })
                        const payload = ticket.getPayload();
            if (payload && payload.email) {
                const userId = payload.sub;
                const email = payload.email;
                const name = payload.name;
                const picture = payload.picture;
                return { userId, email, name, picture }
            }
            else {
                return undefined
            }
        } catch (err) {
            console.log(err);
            return undefined
        }
    }
}

module.exports = new GoogleAuthHelper