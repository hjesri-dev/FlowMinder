const supabase = require('../utils/supabaseClient');

//get user info from the zoom_user table
const getUserInfo = async (user_id) => {
  //return user data or null if not in table
  const { data, error } = await supabase
    .from('zoom_users')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle()

  if (error) {
    console.error("Error checking user:", error);
  }

  return data;
}

//Add new entry in zoom_users table 
const addNewUserInfo = async (req, res, next) => {
  let user_id;
  try {
    user_id = res.locals.zoomUser.id;
    const user = await getUserInfo(user_id);
    if (user != null) next();
    
    const {
      first_name,
      last_name,
      display_name,
      email
    } = res.locals.zoomUser;

    const { data, error } = await supabase
      .from('zoom_users')
      .insert([
        {
          user_id,
          first_name, 
          last_name,
          display_name,
          email
        },
      ])
      .select();
    
    if (error) {
      console.error("Error inserting new user:", error);
      return res.status(500).json({ error: "Failed to insert user data" });
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
  next();
}

module.exports = {
  addNewUserInfo,
};