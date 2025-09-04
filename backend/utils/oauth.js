//build path for Zoom authentication
function generateZoomAuthUrl() {

  const clientId = process.env.ZOOM_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.ZOOM_REDIRECT_URI);

  return `https://zoom.us/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;

}

module.exports = {
  generateZoomAuthUrl,
}