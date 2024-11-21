import { serve } from 'bun';
import { config } from 'dotenv';
import { URLSearchParams } from 'url';

config();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

const redirect_uri = 'http://localhost:5174';
const app_uri = 'http://localhost:3000';

let refreshToken: string | null = null;
let accessToken: string | null = null;
let tokenExpiryTime: number | null = null;

function generateRandomString(length: number) {
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () =>
    possible.charAt(Math.floor(Math.random() * possible.length))
  ).join('');
}

async function refreshAccessToken() {
  try {
    // console.log(
    //   'Attempting to refresh access token using refreshToken:',
    //   refreshToken
    // );

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${client_id}:${client_secret}`),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken as string,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Failed to refresh token: ${response.statusText}`,
        errorData
      );
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const tokenData = await response.json();
    accessToken = tokenData.access_token;
    tokenExpiryTime = Date.now() + tokenData.expires_in * 1000;
    // console.log('New access token:', accessToken);
    return { accessToken, expiresIn: tokenData.expires_in };
  } catch (error) {
    console.error(`Error refreshing token: ${error}`);
    return null;
  }
}

serve({
  port: 5174,
  async fetch(req) {
    const url = new URL(req.url);

    const headers = new Headers({
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    });

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (url.pathname === '/') {
      const code = url.searchParams.get('code');

      if (code) {
        try {
          const responseToken = await fetch(
            'https://accounts.spotify.com/api/token',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + btoa(`${client_id}:${client_secret}`),
              },
              body: new URLSearchParams({
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code',
              }),
            }
          );

          if (!responseToken.ok) {
            const errorData = await responseToken.text();
            return new Response(`Token request failed: ${errorData}`, {
              status: 400,
            });
          }

          const tokenData = await responseToken.json();
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token; // Save refresh token
          tokenExpiryTime = Date.now() + tokenData.expires_in * 1000; // Save expiry time

          return Response.redirect(
            `${app_uri}?access_token=${tokenData.access_token}&expires_in=${tokenData.expires_in}`,
            302
          );
        } catch (error: any) {
          return new Response(`Error getting access token: ${error.message}`, {
            status: 500,
          });
        }
      } else if (accessToken && Date.now() < (tokenExpiryTime as number)) {
        return Response.redirect(
          `${app_uri}?access_token=${accessToken}&expires_in=${(tokenExpiryTime as number) - Date.now()}`
        );
      } else if (refreshToken) {
        // console.log('Access token expired, refreshing...');
        const newAccessTokenData = await refreshAccessToken();
        if (newAccessTokenData) {
          // console.log('New Access Token:', newAccessTokenData.accessToken);
          return Response.redirect(
            `${app_uri}?access_token=${newAccessTokenData.accessToken}&expires_in=${newAccessTokenData.expiresIn}`
          );
        } else {
          return new Response('Failed to refresh access token', {
            status: 401,
          });
        }
      } else {
        const scopes = [
          'user-read-playback-state',
          'user-modify-playback-state',
          'user-read-currently-playing',
          'playlist-read-private',
          'playlist-read-collaborative',
          'playlist-modify-private',
          'playlist-modify-public',
          'user-library-read',
          'user-follow-read',
          'streaming',
          'user-read-recently-played',
        ];
        const scope = scopes.join(' ');
        const state = generateRandomString(16);
        const auth_query_parameters = new URLSearchParams({
          response_type: 'code',
          client_id: client_id as string,
          scope: scope,
          redirect_uri: redirect_uri,
          state: state,
        });

        // Redirect user to Spotify authorization page
        return Response.redirect(
          `https://accounts.spotify.com/authorize/?${auth_query_parameters.toString()}`
        );
      }
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log('Server running on host:5174');
