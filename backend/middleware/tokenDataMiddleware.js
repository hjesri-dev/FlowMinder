const supabase = require('../utils/supabaseClient');

//delete token in zoom_token table based on user id
const deleteToken = async (req, res, next) => {
  const user_id = res.locals.zoomUser.id;

  const {data, error} = await supabase
    .from('zoom_tokens')
    .delete()
    .eq('user_id', user_id)

  if (error) {
    console.error("Error deleting token:", error);
  }  

  next();
}

//Add new entry in zoom_tokens table
const addNewToken = async (req, res, next) => {
  try {
    const user_id = res.locals.zoomUser.id;
    const {
      access_token,
      refresh_token,
      token_type,
      expires_in,
      scope,
      api_url
    } = res.locals;

    const { data, error } = await supabase
      .from('zoom_tokens')
      .insert([
        {
          user_id,
          access_token,
          refresh_token,
          token_type,
          expires_in,
          scope,
          api_url,
        },
      ])
      .select();

    if (error) {
      console.error("Error inserting new token:", error);
      return res.status(500).json({ error: "Failed to insert token data" });
    }

    next();
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// attachAccessToken: fetch saved token for a user and attach to req
const attachAccessToken = async (req, res, next) => {
  try {
    // allow userId from query, params, or body
    const user_id = req.query.userId || req.params.user_id || req.body.userId;
    if (!user_id) return res.status(400).json({ error: 'Missing userId' });

    const { data, error } = await supabase
      .from('zoom_tokens')
      .select('access_token')
      .eq('user_id', user_id)
      .maybeSingle();

    if (error) {
      console.error('Token lookup error:', error);
      return res.status(500).json({ error: 'Token lookup failed' });
    }
    if (!data?.access_token) {
      return res.status(401).json({ error: 'No Zoom token on file for user' });
    }

    req.zoomAccessToken = data.access_token;
    next();
  } catch (e) {
    console.error('attachAccessToken failed:', e);
    res.status(500).json({ error: 'attachAccessToken failed' });
  }
};


module.exports = {
  deleteToken,
  addNewToken,
  attachAccessToken,
};