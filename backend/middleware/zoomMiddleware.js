const axios = require('axios');
// 
// Request for token using temporary authorization code
const exchangeCodeForToken = async (req, res, next) => {
    console.log('OAuth callback triggered');
    const code = req.query.code;
    const redirectUri = process.env.ZOOM_REDIRECT_URI;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code not provided' });
    }

    try {
      const tokenResponse = await axios.post('https://zoom.us/oauth/token', null, {
          params: {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
          },
          auth: {
            //Providing app credential to get token
            username: process.env.ZOOM_CLIENT_ID,
            password: process.env.ZOOM_CLIENT_SECRET,
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
      });

      const tokens = tokenResponse.data;
      //Log returned tokens
      for (const key in tokens) {
        res.locals[key] = tokens[key];
      }

      next();
    } catch (error) {

        console.error('OAuth callback error:', error.response?.data || error.message);
        res.status(500).json({ error: 'OAuth token exchange failed' });
        
    }
}

//get zoom user information based on access code
const getZoomUserInfo = async (req, res, next) => {

  const access_token = res.locals.access_token;

  try {
    const response = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const zoomUser = response.data;
    res.locals.zoomUser = zoomUser;

    next();
    
  } catch (error) {
    console.error("Error fetching Zoom user information:", error.response?.data || error.message);
  }
}

//get new token using refresh token
const useRefreshToken = async (req, res, next) => {

  const refreshToken = res.locals.refresh_token;

  try {
    const response = await axios.get('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      },
      auth: {
        username: process.env.ZOOM_CLIENT_ID,
        password: process.env.ZOOM_CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    //destructure response data and save info in res.locals object to update in db
    const {access_token, expires_in, refresh_token, scope} = response.data;
    res.locals.access_token = access_token;
    res.locals.expires_in = expires_in;
    res.locals.refresh_token = refresh_token;
    res.locals.scope = scope;
    
    next();

  } catch (error) {
    console.error('Failed to refresh token:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to refresh access token' });
  }

}

module.exports = {
  exchangeCodeForToken,
  getZoomUserInfo,
  useRefreshToken,
};