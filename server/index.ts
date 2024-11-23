import { serve } from 'bun';
import { config } from 'dotenv';
import { URLSearchParams } from 'url';

config();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;

const redirect_uri = process.env.REDIRECT_URI;
const app_uri = process.env.APP_URI;

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
    console.log('Incoming request to:', url.pathname);

    const headers = new Headers({
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    });

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    if (url.pathname === '/refresh-token') {
      if (req.method === 'POST') {
        if (!refreshToken) {
          return new Response('No refresh token available', {
            status: 401,
            headers,
          });
        }

        const newAccessTokenData = await refreshAccessToken();
        if (newAccessTokenData) {
          return new Response(
            JSON.stringify({
              access_token: newAccessTokenData.accessToken,
              expires_in: newAccessTokenData.expiresIn,
            }),
            {
              headers: {
                ...headers,
                'Content-Type': 'application/json',
              },
            }
          );
        } else {
          return new Response('Failed to refresh access token', {
            status: 401,
            headers,
          });
        }
      } else {
        return new Response('Method not allowed', {
          status: 405,
          headers,
        });
      }
    }

    if (url.pathname === '/') {
      const code = url.searchParams.get('code');
      const returnTo = url.searchParams.get('returnTo') || '/';

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
                redirect_uri: redirect_uri as string,
                grant_type: 'authorization_code',
              }),
            }
          );

          if (!responseToken.ok) {
            const errorData = await responseToken.text();
            return new Response(`Token request failed: ${errorData}`, {
              status: 400,
              headers,
            });
          }

          const tokenData = await responseToken.json();
          accessToken = tokenData.access_token;
          refreshToken = tokenData.refresh_token;
          tokenExpiryTime = Date.now() + tokenData.expires_in * 1000;

          const redirectUrl = new URL(app_uri as string);
          redirectUrl.searchParams.set('access_token', tokenData.access_token);
          redirectUrl.searchParams.set(
            'expires_in',
            tokenData.expires_in.toString()
          );

          if (returnTo && returnTo !== '/') {
            redirectUrl.pathname = decodeURIComponent(returnTo);
          }

          return Response.redirect(redirectUrl.toString(), 302);
        } catch (error: any) {
          console.error('Token exchange error:', error);
          return new Response(`Error getting access token: ${error.message}`, {
            status: 500,
            headers,
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
          'user-library-modify',
          'user-follow-read',
          'user-follow-modify',
          'streaming',
          'user-read-recently-played',
        ];
        const scope = scopes.join(' ');
        const state = generateRandomString(16);
        const auth_query_parameters = new URLSearchParams({
          response_type: 'code',
          client_id: client_id as string,
          scope: scope,
          redirect_uri: redirect_uri as string,
          state: state,
        });

        if (returnTo) {
          auth_query_parameters.set('returnTo', returnTo);
        }

        return Response.redirect(
          `https://accounts.spotify.com/authorize/?${auth_query_parameters.toString()}`
        );
      }
    }

    return new Response('Not found', { status: 404, headers });
  },
});

console.log('Server running on host:5174');
