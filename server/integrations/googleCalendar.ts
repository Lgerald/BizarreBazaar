import { google } from "googleapis";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function makeOAuth2Client() {
  const clientId = requireEnv("GCAL_CLIENT_ID");
  const clientSecret = requireEnv("GCAL_CLIENT_SECRET");
  const redirectUri = requireEnv("GCAL_REDIRECT_URI");

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getCalendarId(): string {
  return requireEnv("GCAL_CALENDAR_ID");
}

export function makeCalendarClient() {
  const oauth2 = makeOAuth2Client();
  const refreshToken = requireEnv("GCAL_REFRESH_TOKEN");
  oauth2.setCredentials({ refresh_token: refreshToken });

  return google.calendar({ version: "v3", auth: oauth2 });
}

export function buildOAuthConsentUrl() {
  const oauth2 = makeOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      // keep it minimal: only event CRUD
      "https://www.googleapis.com/auth/calendar.events",
    ],
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2 = makeOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

